import jwt from "jsonwebtoken";
import super_admins from "../Config/db.js";

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
