import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import admins from "../Config/db.js";
import { parse } from "dotenv";

/* ================= CREATE ADMIN ================= */
export const createAdmin = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { society_id, name, email, password, phone } = req.body;
  const superAdminId = req.user.id;

  try {
    // check duplicate email
    const [exists] = await admins.query(
      "SELECT id FROM admins WHERE email = ?",
      [email]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Admin already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await admins.query(
      `INSERT INTO admins
       (society_id, created_by_super_admin_id, name, email, password, phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [society_id, superAdminId, name, email, hashedPassword, phone || null]
    );

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
    });
  } catch (error) {
    console.error("CREATE ADMIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= GET ALL ADMINS (PAGINATED) ================= */
export const getAdmins = async (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const offset = (page - 1) * limit;
  const { society_id } = req.query;

  try {
    let where = "WHERE 1=1";
    const params = [];

    if (society_id) {
      where += " AND a.society_id = ?";
      params.push(society_id);
    }

    const [data] = await admins.query(
      `SELECT a.id, a.name, a.email, a.phone, a.status, a.created_at,
              s.society_name,
              sa.name AS created_by
       FROM admins a
       JOIN societies s ON s.id = a.society_id
       JOIN super_admins sa ON sa.id = a.created_by_super_admin_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await admins.query(
      `SELECT COUNT(*) AS total
       FROM admins a ${where}`,
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
    console.error("GET ADMINS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= GET SINGLE ADMIN ================= */
export const getAdminById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await admins.query(
      `SELECT id, society_id, name, email, phone, status, created_at
       FROM admins
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("GET ADMIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= UPDATE ADMIN ================= */
export const updateAdmin = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { id } = req.params;
  const { name, phone, status } = req.body;

  try {
    const [result] = await admins.query(
      `UPDATE admins
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [name, phone, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
    });
  } catch (error) {
    console.error("UPDATE ADMIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= DEACTIVATE ADMIN (SOFT DELETE) ================= */
export const deactivateAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await admins.query(
      `UPDATE admins SET status = 'inactive' WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin deactivated successfully",
    });
  } catch (error) {
    console.error("DEACTIVATE ADMIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
