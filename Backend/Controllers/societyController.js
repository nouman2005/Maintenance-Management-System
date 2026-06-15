import { validationResult } from "express-validator";
import societies from "../Config/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendAdminCredentialsEmail } from "../Services/mailService.js";

const generatePassword = () =>
  `Admin@${crypto.randomBytes(4).toString("hex")}`;

const isMissingTableError = (error) => error?.code === "ER_NO_SUCH_TABLE";

const sendDatabaseSetupError = (res) =>
  res.status(500).json({
    success: false,
    message:
      "Database tables are missing. Run Backend/DataBaseTableStructure.sql first.",
  });

const getSocietyPayload = (body) => ({
  society_name: body.society_name,
  registration_number: body.registration_number,
  total_flats: body.total_flats,
  society_phone: body.society_phone || null,
  society_email: body.society_email || null,
  address: body.address || null,
  city: body.city || null,
  state: body.state || null,
  pincode: body.pincode || null,
});

/* ================= CREATE SOCIETY ================= */
export const createSociety = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const society = getSocietyPayload(req.body);
  const superAdminId = req.user.id;

  try {
    const [existing] = await societies.query(
      `SELECT id FROM societies
       WHERE society_name = ? OR registration_number = ?`,
      [society.society_name, society.registration_number]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Society already exists",
      });
    }

    await societies.query(
      `INSERT INTO societies
       (society_name, registration_number, total_flats, society_phone,
        society_email, address, city, state, pincode, created_by_super_admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        society.society_name,
        society.registration_number,
        society.total_flats,
        society.society_phone,
        society.society_email,
        society.address,
        society.city,
        society.state,
        society.pincode,
        superAdminId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Society created successfully",
    });
  } catch (error) {
    console.error("CREATE SOCIETY ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= PUBLIC SOCIETY REGISTRATION REQUEST ================= */
export const requestSocietyRegistration = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const society = getSocietyPayload(req.body);
  const { admin_name, admin_email, admin_phone } = req.body;

  try {
    const [existingSociety] = await societies.query(
      `SELECT id FROM societies
       WHERE society_name = ? OR registration_number = ?`,
      [society.society_name, society.registration_number]
    );

    if (existingSociety.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Society already exists",
      });
    }

    const [existingAdmin] = await societies.query(
      "SELECT id FROM admins WHERE email = ?",
      [admin_email]
    );

    if (existingAdmin.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Admin already exists with this email",
      });
    }

    const [existingRequest] = await societies.query(
      `SELECT id FROM society_registration_requests
       WHERE (admin_email = ? OR registration_number = ?) AND status = 'pending'`,
      [admin_email, society.registration_number]
    );

    if (existingRequest.length > 0) {
      return res.status(409).json({
        success: false,
        message: "A pending request already exists for this email or registration number",
      });
    }

    await societies.query(
      `INSERT INTO society_registration_requests
       (society_name, registration_number, total_flats, society_phone,
        society_email, address, city, state, pincode, admin_name,
        admin_email, admin_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        society.society_name,
        society.registration_number,
        society.total_flats,
        society.society_phone,
        society.society_email,
        society.address,
        society.city,
        society.state,
        society.pincode,
        admin_name,
        admin_email,
        admin_phone || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Society registration request sent to super admin",
    });
  } catch (error) {
    console.error("REQUEST SOCIETY REGISTRATION ERROR:", error);
    if (isMissingTableError(error)) {
      return sendDatabaseSetupError(res);
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= GET REGISTRATION REQUESTS ================= */
export const getSocietyRegistrationRequests = async (req, res) => {
  const status = req.query.status || "pending";

  try {
    const [data] = await societies.query(
      `SELECT id, society_name, registration_number, total_flats,
              society_phone, society_email, address, city, state, pincode,
              admin_name, admin_email, admin_phone, status,
              reviewed_by_super_admin_id, reviewed_at, rejection_reason,
              created_at
       FROM society_registration_requests
       WHERE status = ?
       ORDER BY created_at DESC`,
      [status]
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("GET SOCIETY REGISTRATION REQUESTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= APPROVE REGISTRATION REQUEST ================= */
export const approveSocietyRegistrationRequest = async (req, res) => {
  const { id } = req.params;
  const superAdminId = req.user.id;
  const connection = societies;

  try {
    await connection.beginTransaction();

    const [requests] = await connection.query(
      `SELECT id, society_name, registration_number, total_flats,
              society_phone, society_email, address, city, state, pincode,
              admin_name, admin_email, admin_phone, status
       FROM society_registration_requests
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (requests.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Registration request not found",
      });
    }

    const request = requests[0];

    if (request.status !== "pending") {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Registration request is already reviewed",
      });
    }

    const [existingSociety] = await connection.query(
      `SELECT id FROM societies
       WHERE society_name = ? OR registration_number = ?`,
      [request.society_name, request.registration_number]
    );

    if (existingSociety.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Society already exists",
      });
    }

    const [existingAdmin] = await connection.query(
      "SELECT id FROM admins WHERE email = ?",
      [request.admin_email]
    );

    if (existingAdmin.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Admin already exists with this email",
      });
    }

    const [societyResult] = await connection.query(
      `INSERT INTO societies
       (society_name, registration_number, total_flats, society_phone,
        society_email, address, city, state, pincode, created_by_super_admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.society_name,
        request.registration_number,
        request.total_flats,
        request.society_phone,
        request.society_email,
        request.address,
        request.city,
        request.state,
        request.pincode,
        superAdminId,
      ]
    );

    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await connection.query(
      `INSERT INTO admins
       (society_id, created_by_super_admin_id, name, email, password, phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        societyResult.insertId,
        superAdminId,
        request.admin_name,
        request.admin_email,
        hashedPassword,
        request.admin_phone,
      ]
    );

    await connection.query(
      `UPDATE society_registration_requests
       SET status = 'approved',
           reviewed_by_super_admin_id = ?,
           reviewed_at = NOW()
       WHERE id = ?`,
      [superAdminId, id]
    );

    await connection.commit();

    let emailResult;

    try {
      emailResult = await sendAdminCredentialsEmail({
        to: request.admin_email,
        adminName: request.admin_name,
        societyName: request.society_name,
        email: request.admin_email,
        password: plainPassword,
      });
    } catch (emailError) {
      console.error("SEND ADMIN CREDENTIALS EMAIL ERROR:", {
        to: request.admin_email,
        code: emailError?.code,
        command: emailError?.command,
        responseCode: emailError?.responseCode,
        message: emailError?.message,
      });

      emailResult = { sent: false, reason: "SMTP_SEND_FAILED" };
    }

    return res.status(200).json({
      success: true,
      message: emailResult.sent
        ? "Request approved and credentials sent by email"
        : "Request approved, but credentials email was not sent. Check SMTP configuration.",
      emailSent: emailResult.sent,
      emailReason: emailResult.reason || null,
    });
  } catch (error) {
    await connection.rollback();
    console.error("APPROVE SOCIETY REGISTRATION REQUEST ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= REJECT REGISTRATION REQUEST ================= */
export const rejectSocietyRegistrationRequest = async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;

  try {
    const [result] = await societies.query(
      `UPDATE society_registration_requests
       SET status = 'rejected',
           reviewed_by_super_admin_id = ?,
           reviewed_at = NOW(),
           rejection_reason = ?
       WHERE id = ? AND status = 'pending'`,
      [req.user.id, rejection_reason || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending registration request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Request rejected successfully",
    });
  } catch (error) {
    console.error("REJECT SOCIETY REGISTRATION REQUEST ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= GET ALL SOCIETIES (PAGINATED) ================= */
export const getSocieties = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [data] = await societies.query(
      `SELECT s.id, s.society_name, s.registration_number, s.total_flats,
              s.society_phone, s.society_email, s.address, s.city, s.state,
              s.pincode, s.status, s.created_at, sa.name AS created_by
       FROM societies s
       JOIN super_admins sa ON sa.id = s.created_by_super_admin_id
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await societies.query(
      "SELECT COUNT(*) AS total FROM societies"
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
    console.error("GET SOCIETIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= GET SINGLE SOCIETY ================= */
export const getSocietyById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await societies.query(
      `SELECT id, society_name, registration_number, total_flats,
              society_phone, society_email, address, city, state, pincode,
              status, created_at
       FROM societies WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("GET SOCIETY ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= UPDATE SOCIETY ================= */
export const updateSociety = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { id } = req.params;
  const {
    society_name,
    registration_number,
    total_flats,
    society_phone,
    society_email,
    address,
    city,
    state,
    pincode,
    status,
  } = req.body;

  try {
    const [result] = await societies.query(
      `UPDATE societies
       SET society_name = COALESCE(?, society_name),
           registration_number = COALESCE(?, registration_number),
           total_flats = COALESCE(?, total_flats),
           society_phone = COALESCE(?, society_phone),
           society_email = COALESCE(?, society_email),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           pincode = COALESCE(?, pincode),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        society_name,
        registration_number,
        total_flats,
        society_phone,
        society_email,
        address,
        city,
        state,
        pincode,
        status,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Society updated successfully",
    });
  } catch (error) {
    console.error("UPDATE SOCIETY ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= SOFT DELETE SOCIETY ================= */
export const deactivateSociety = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await societies.query(
      `UPDATE societies
       SET status = 'inactive'
       WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Society deactivated successfully",
    });
  } catch (error) {
    console.error("DELETE SOCIETY ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
