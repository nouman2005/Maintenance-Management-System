import maintenance_settings from "../Config/db.js";
import { validationResult } from "express-validator";

export const addMaintenanceSetting = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { setting_key, setting_value, description } = req.body;

  try {
    const [exists] = await maintenance_settings.query(
      "SELECT id FROM maintenance_settings WHERE setting_key=?",
      [setting_key]
    );

    if (exists.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Setting already exists" });
    }

    await maintenance_settings.query(
      `INSERT INTO maintenance_settings
       (setting_key, setting_value, description)
       VALUES (?, ?, ?)`,
      [setting_key, setting_value, description]
    );
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAllMaintenanceSettings = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [settings] = await maintenance_settings.query(
      `SELECT id, setting_key, setting_value, description, status, updated_at
       FROM maintenance_settings
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await maintenance_settings.query(
      "SELECT COUNT(*) as total FROM maintenance_settings"
    );

    return res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      data: settings,
    });
  } catch (err) {
    console.error(err);
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

  const key = req.params.key.toUpperCase();

  try {
    const [settings] = await maintenance_settings.query(
      `SELECT setting_key, setting_value
       FROM maintenance_settings
       WHERE setting_key = ? AND status = 'active'
       LIMIT 1`,
      [key]
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
    console.error("Get Setting By Key Error:", err);

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
  const { setting_value, status } = req.body || {}; // 👈 SAFE

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

    values.push(id);

    const [result] = await maintenance_settings.query(
      `UPDATE maintenance_settings
       SET ${fields.join(", ")}
       WHERE id = ?`,
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
    console.error("Update Maintenance Setting Error:", err);
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

  try {
    const [result] = await maintenance_settings.query(
      `UPDATE maintenance_settings
       SET status = 'inactive'
       WHERE id = ? AND status = 'active'`,
      [id]
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
    console.error("Soft Delete Setting Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to deactivate setting",
    });
  }
};
