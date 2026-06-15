import db from "../Config/db.js";
import { validationResult } from "express-validator";
import { prefixedNanoId } from "../Utils/nanoId.js";

const getAdminSocietyId = (req) => req.user?.society_id;

export const addMaintenanceSetting = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const societyId = getAdminSocietyId(req);
  const adminId = req.user.id;
  const {
    setting_key,
    setting_value,
    value_type = "fixed",
    description,
    effective_from,
  } = req.body;

  try {
    if (!societyId) {
      return res.status(403).json({
        success: false,
        message: "Admin society is missing. Please login again.",
      });
    }

    await db.beginTransaction();

    await db.query(
      `UPDATE maintenance_settings
       SET status = 'inactive'
       WHERE society_id = ? AND setting_key = ? AND status = 'active'`,
      [societyId, setting_key]
    );

    await db.query(
      `INSERT INTO maintenance_settings
       (setting_code, society_id, admin_id, setting_key, setting_value,
        value_type, description, effective_from)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE))`,
      [
        prefixedNanoId("SET"),
        societyId,
        adminId,
        setting_key,
        setting_value,
        value_type,
        description || null,
        effective_from || null,
      ]
    );

    await db.commit();

    return res.status(201).json({
      success: true,
      message:
        setting_key === "noc_charge"
          ? "NOC charge saved for this society"
          : "Maintenance setting saved successfully",
    });
  } catch (err) {
    await db.rollback();
    console.error("ADD MAINTENANCE SETTING ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllMaintenanceSettings = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const status = req.query.status || "active";
  const societyId = getAdminSocietyId(req);

  try {
    if (!societyId) {
      return res.status(403).json({
        success: false,
        message: "Admin society is missing. Please login again.",
      });
    }

    const params = [societyId, status];

    const [settings] = await db.query(
      `SELECT id, setting_code, setting_key, setting_value, value_type,
              description, status, effective_from, effective_to, updated_at
       FROM maintenance_settings
       WHERE society_id = ? AND status = ?
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM maintenance_settings
       WHERE society_id = ? AND status = ?`,
      params
    );

    return res.status(200).json({
      success: true,
      data: settings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("GET MAINTENANCE SETTINGS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch maintenance settings",
    });
  }
};

export const getSettingByKey = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const key = req.params.key;
  const societyId = getAdminSocietyId(req);

  try {
    const [settings] = await db.query(
      `SELECT setting_key, setting_value, value_type
       FROM maintenance_settings
       WHERE society_id = ? AND setting_key = ? AND status = 'active'
       LIMIT 1`,
      [societyId, key]
    );

    if (settings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: settings[0],
    });
  } catch (err) {
    console.error("GET SETTING BY KEY ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch setting",
    });
  }
};

export const updateMaintenanceSetting = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const id = Number(req.params.id);
  const societyId = getAdminSocietyId(req);
  const { setting_value, status } = req.body || {};

  if (setting_value === undefined && status === undefined) {
    return res.status(400).json({
      success: false,
      message: "Nothing to update",
    });
  }

  try {
    const fields = [];
    const values = [];

    if (setting_value !== undefined) {
      fields.push("setting_value = ?");
      values.push(setting_value);
    }

    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
    }

    values.push(id, societyId);

    const [result] = await db.query(
      `UPDATE maintenance_settings
       SET ${fields.join(", ")}
       WHERE id = ? AND society_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Setting updated successfully",
    });
  } catch (err) {
    console.error("UPDATE MAINTENANCE SETTING ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update setting",
    });
  }
};

export const softDeleteMaintenanceSetting = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const id = Number(req.params.id);
  const societyId = getAdminSocietyId(req);

  try {
    const [result] = await db.query(
      `UPDATE maintenance_settings
       SET status = 'inactive'
       WHERE id = ? AND society_id = ? AND status = 'active'`,
      [id, societyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Setting not found or already inactive",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Setting deactivated successfully",
    });
  } catch (err) {
    console.error("SOFT DELETE SETTING ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to deactivate setting",
    });
  }
};
