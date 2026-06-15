import { validationResult } from "express-validator";
import super_admins from "../Config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerSuperAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, email, password, phone } = req.body;

    /* 2. Check if email already exists */
    const [existing] = await super_admins.query(
      "SELECT id FROM super_admins WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Super admin already exists with this email",
      });
    }

    /* 3. Hash password */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* 4. Insert super admin */
    await super_admins.query(
      `INSERT INTO super_admins 
        (name, email, password, phone) 
       VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, phone || null]
    );

    return res.status(201).json({
      success: true,
      message: "Super admin registered successfully",
    });
  } catch (error) {
    console.error("Super Admin Register Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const loginUser = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  let { email, password, role } = req.body;
  email = email.toLowerCase().trim();

  try {
    /* 🔀 Role based config */
    const isSuperAdmin = role === "super_admin";

    const table = isSuperAdmin ? "super_admins" : "admins";

    const selectQuery = isSuperAdmin
      ? `SELECT id, name, email, password, 'super_admin' AS role
         FROM super_admins
         WHERE email = ? AND status = 'active'
         LIMIT 1`
      : `SELECT id, society_id, name, email, password, role
         FROM admins
         WHERE email = ? AND status = 'active'
         LIMIT 1`;

    /* 🔍 Fetch user */
    const [rows] = await super_admins.query(selectQuery, [email]);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    /* 🔐 Password match */
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* 🔑 Access Token */
    const accessToken = jwt.sign(
      {
        id: user.id,
        society_id: user.society_id,
        role: user.role,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    /* 🔄 Refresh Token */
    const refreshToken = jwt.sign(
      {
        id: user.id,
        society_id: user.society_id,
        role: user.role,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    /* 💾 Save refresh token + last login */
    await super_admins.query(
      `UPDATE ${table}
       SET refresh_token = ?, last_login_at = NOW()
       WHERE id = ?`,
      [refreshToken, user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        society_id: user.society_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// Admin@d1d70e9e
