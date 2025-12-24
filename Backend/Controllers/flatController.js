import { validationResult } from "express-validator";
import flats from "../Config/db.js";

// ADD FLATS CONTROLLER CODE
export const addFlat = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    wing,
    floor_no,
    flat_no,
    area,
    owner_name,
    phone,
    whatsapp,
    email,
    maintenance_amount,
  } = req.body;

  try {
    const [existing] = await flats.query(
      "SELECT id FROM flats WHERE wing = ? AND flat_no = ?",
      [wing, flat_no]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Flat already exists" });
    }

    await flats.query(
      `INSERT INTO flats
      (wing, floor_no, flat_no, area, owner_name, phone, whatsapp, email, maintenance_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        wing,
        floor_no,
        flat_no,
        area,
        owner_name,
        phone,
        whatsapp,
        email,
        maintenance_amount,
      ]
    );

    res.status(201).json({ success: true, message: "Flat added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL FLATS CONTROLLER CODE
export const getFlats = async (req, res) => {
  try {
    const [rows] = await flats.query(
      "SELECT * FROM flats WHERE status = 'active' ORDER BY wing, flat_no"
    );

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET FLATS BY ID CONTROLLER CODE
export const getFlatById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await flats.query(
      "SELECT * FROM flats WHERE id = ? AND status = 'active'",
      [id]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Flat not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET FLATS WITH PAGINATION CONTROLLER CODE
export const getFlatsWithPagination = async (req, res) => {
  let { page = 1, limit = 10 } = req.body;

  page = parseInt(page);
  limit = parseInt(limit);

  const offset = (page - 1) * limit;

  try {
    // TOTAL COUNT
    const [[{ total }]] = await flats.query(
      "SELECT COUNT(*) as total FROM flats WHERE status='active'"
    );

    // PAGINATED DATA
    const [flat] = await flats.query(
      `SELECT * FROM flats
       WHERE status='active'
       ORDER BY wing, flat_no
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      page,
      limit,
      totalRecords: total,
      totalPages: Math.ceil(total / limit),
      data: flat,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// UPDATE FLATS CONTROLLER CODE
export const updateFlat = async (req, res) => {
  const id = Number(req.params.id);

  try {
    const {
      wing,
      floor_no,
      flat_no,
      area,
      owner_name,
      phone,
      whatsapp,
      email,
      maintenance_amount,
    } = req.body;

    // 🔥 VALIDATION (must)
    if (!wing) {
      return res.status(400).json({
        success: false,
        message: "Wing is required",
      });
    }

    const [result] = await flats.query(
      `UPDATE flats SET
        wing = ?, 
        floor_no = ?, 
        flat_no = ?, 
        area = ?, 
        owner_name = ?, 
        phone = ?, 
        whatsapp = ?, 
        email = ?, 
        maintenance_amount = ?
       WHERE id = ?`,
      [
        wing,
        floor_no,
        flat_no,
        area,
        owner_name,
        phone,
        whatsapp,
        email,
        maintenance_amount,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Flat not found or no changes made",
      });
    }

    res.json({
      success: true,
      message: "Flat updated successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// DELETE FLAT CONTROLLER CODE
export const deactivateFlat = async (req, res) => {
  const { id } = req.params;

  try {
    await flats.query("UPDATE flats SET status='inactive' WHERE id=?", [id]);

    res.json({ success: false, message: "Flat deactivated" });
  } catch (err) {
    res.status(500).json({ success: true, error: err.message });
  }
};
