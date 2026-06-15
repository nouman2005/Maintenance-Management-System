import { validationResult } from "express-validator";
import flats from "../Config/db.js";
import { prefixedNanoId } from "../Utils/nanoId.js";

/* ================= CREATE FLAT ================= */
export const createFlat = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const adminId = req.user.id;
  const societyId = req.user.society_id;
  const {
    wing,
    floor_no,
    flat_no,
    area_sqft,
    owner_name,
    owner_phone,
    owner_whatsapp,
    owner_email,
    maintenance_amount,
  } = req.body;

  try {
    if (!societyId) {
      return res.status(403).json({
        success: false,
        message: "Admin society is missing. Please login again.",
      });
    }

    const [[society]] = await flats.query(
      `SELECT total_flats,
              (SELECT COUNT(*)
               FROM flats
               WHERE society_id = ? AND status = 'active') AS used_flats
      FROM societies
      WHERE id = ? AND status = 'active'`,
      [societyId, societyId]
    );

    if (!society) {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }

    if (society.used_flats >= society.total_flats) {
      return res.status(409).json({
        success: false,
        message: `Flat limit reached. This society can add only ${society.total_flats} flats.`,
      });
    }

    // Unique flat check
    const [exists] = await flats.query(
      `SELECT id FROM flats
       WHERE society_id = ? AND wing = ? AND flat_no = ?`,
      [societyId, wing.trim().toUpperCase(), flat_no.trim().toUpperCase()]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Flat already exists in this society",
      });
    }

    await flats.query(
      `INSERT INTO flats
       (flat_code, society_id, admin_id, wing, floor_no, flat_no, area_sqft,
        owner_name, owner_phone, owner_whatsapp, owner_email,
        maintenance_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prefixedNanoId("FLT"),
        societyId,
        adminId,
        wing.trim().toUpperCase(),
        floor_no,
        flat_no.trim().toUpperCase(),
        area_sqft || null,
        owner_name,
        owner_phone,
        owner_whatsapp || null,
        owner_email || null,
        maintenance_amount,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Flat created successfully",
    });
  } catch (error) {
    console.error("CREATE FLAT ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= GET ALL FLATS ================= */
export const getFlats = async (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const offset = (page - 1) * limit;

  const { society_id, occupancy } = req.query;
  const isAdmin = req.user.role === "admin";

  try {
    let where = "WHERE f.status = 'active'";
    const params = [];

    if (isAdmin) {
      where += " AND f.society_id = ?";
      params.push(req.user.society_id);
    } else if (society_id) {
      where += " AND f.society_id = ?";
      params.push(society_id);
    }

    if (occupancy) {
      where += " AND f.occupancy = ?";
      params.push(occupancy);
    }

    const [data] = await flats.query(
      `SELECT f.id, f.wing, f.floor_no, f.flat_no, f.area_sqft,
              f.flat_code, f.owner_name, f.owner_phone, f.owner_whatsapp,
              f.owner_email, f.maintenance_amount,
              f.occupancy, f.status, f.created_at,
              s.society_name
       FROM flats f
       JOIN societies s ON s.id = f.society_id
       ${where}
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await flats.query(
      `SELECT COUNT(*) AS total FROM flats f ${where}`,
      params
    );

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET FLATS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= GET FLAT BY ID ================= */
export const getFlatById = async (req, res) => {
  const { id } = req.params;

  try {
    const params = [id];
    let scope = "";

    if (req.user.role === "admin") {
      scope = " AND society_id = ?";
      params.push(req.user.society_id);
    }

    const [rows] = await flats.query(
      `SELECT * FROM flats WHERE id = ?${scope}`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Flat not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("GET FLAT ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= UPDATE FLAT ================= */
export const updateFlat = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { id } = req.params;

  const {
    owner_name,
    owner_phone,
    owner_whatsapp,
    owner_email,
    maintenance_amount,
    occupancy,
    status,
  } = req.body;

  try {
    const params = [
      owner_name,
      owner_phone,
      owner_whatsapp,
      owner_email,
      maintenance_amount,
      occupancy,
      status,
      id,
    ];
    let scope = "";

    if (req.user.role === "admin") {
      scope = " AND society_id = ?";
      params.push(req.user.society_id);
    }

    const [result] = await flats.query(
      `UPDATE flats
       SET owner_name = COALESCE(?, owner_name),
           owner_phone = COALESCE(?, owner_phone),
           owner_whatsapp = COALESCE(?, owner_whatsapp),
           owner_email = COALESCE(?, owner_email),
           maintenance_amount = COALESCE(?, maintenance_amount),
           occupancy = COALESCE(?, occupancy),
           status = COALESCE(?, status)
       WHERE id = ?${scope}`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Flat not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Flat updated successfully",
    });
  } catch (error) {
    console.error("UPDATE FLAT ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= DEACTIVATE FLAT ================= */
export const deactivateFlat = async (req, res) => {
  const { id } = req.params;

  try {
    const params = [id];
    let scope = "";

    if (req.user.role === "admin") {
      scope = " AND society_id = ?";
      params.push(req.user.society_id);
    }

    const [result] = await flats.query(
      `UPDATE flats SET status = 'inactive' WHERE id = ?${scope}`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Flat not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Flat deactivated successfully",
    });
  } catch (error) {
    console.error("DEACTIVATE FLAT ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
