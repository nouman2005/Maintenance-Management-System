import jwt from "jsonwebtoken";
import super_admins from "../Config/db.js";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";

export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token missing",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const isSuperAdmin = decoded.role === "super_admin";
    const table = isSuperAdmin ? "super_admins" : "admins";
    const selectFields = isSuperAdmin ? "id" : "id, society_id";

    // 🔍 Verify token exists in DB
    const [rows] = await super_admins.query(
      `SELECT ${selectFields} FROM ${table}
       WHERE id = ? AND refresh_token = ?`,
      [decoded.id, refreshToken]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // 🔑 Generate new access token
    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        society_id: isSuperAdmin ? null : rows[0].society_id,
        role: decoded.role,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

export const logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Refresh token required",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const table = decoded.role === "super_admin" ? "super_admins" : "admins";

    await super_admins.query(
      `UPDATE ${table}
       SET refresh_token = NULL
       WHERE id = ?`,
      [decoded.id]
    );

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

export const changePassword = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { current_password, new_password } = req.body;
  const table = req.user.role === "super_admin" ? "super_admins" : "admins";

  try {
    const [rows] = await super_admins.query(
      `SELECT id, password FROM ${table}
       WHERE id = ? AND status = 'active'
       LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    const user = rows[0];
    const currentPasswordMatches = await bcrypt.compare(
      current_password,
      user.password
    );

    if (!currentPasswordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const newPasswordMatchesCurrent = await bcrypt.compare(
      new_password,
      user.password
    );

    if (newPasswordMatchesCurrent) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the current password",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    if (req.user.role === "super_admin") {
      await super_admins.query(
        `UPDATE super_admins
         SET password = ?
         WHERE id = ?`,
        [hashedPassword, req.user.id]
      );
    } else {
      await super_admins.query(
        `UPDATE admins
         SET password = ?,
             password_must_change = FALSE,
             password_changed_at = NOW()
         WHERE id = ?`,
        [hashedPassword, req.user.id]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
      must_change_password: false,
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    if (req.user.role === "super_admin") {
      const [rows] = await super_admins.query(
        `SELECT id, name, email, phone, role, status,
                previous_login_at AS last_login_at,
                last_login_at AS current_login_at,
                created_at
         FROM super_admins
         WHERE id = ?
         LIMIT 1`,
        [req.user.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          admin: rows[0],
          society: null,
        },
      });
    }

    const [rows] = await super_admins.query(
      `SELECT a.id, a.society_id, a.name, a.email, a.phone, a.role, a.status,
              a.previous_login_at AS last_login_at,
              a.last_login_at AS current_login_at,
              a.created_at,
              a.password_must_change,
              s.society_name, s.registration_number, s.total_flats,
              s.society_phone, s.society_email, s.address, s.city, s.state,
              s.pincode, s.status AS society_status
       FROM admins a
       JOIN societies s ON s.id = a.society_id
       WHERE a.id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const row = rows[0];

    return res.status(200).json({
      success: true,
      data: {
        admin: {
          id: row.id,
          society_id: row.society_id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          role: row.role,
          status: row.status,
          last_login_at: row.last_login_at,
          current_login_at: row.current_login_at,
          created_at: row.created_at,
          must_change_password: Boolean(row.password_must_change),
        },
        society: {
          id: row.society_id,
          society_name: row.society_name,
          registration_number: row.registration_number,
          total_flats: row.total_flats,
          society_phone: row.society_phone,
          society_email: row.society_email,
          address: row.address,
          city: row.city,
          state: row.state,
          pincode: row.pincode,
          status: row.society_status,
        },
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load profile",
    });
  }
};
