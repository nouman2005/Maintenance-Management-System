import db from "../Config/db.js";
import { validationResult } from "express-validator";
import { prefixedNanoId } from "../Utils/nanoId.js";

const getAdminSocietyId = (req) => req.user?.society_id;

const getActiveNocCharge = async (societyId) => {
  const [settings] = await db.query(
    `SELECT setting_value
     FROM maintenance_settings
     WHERE society_id = ?
       AND setting_key = 'noc_charge'
       AND status = 'active'
       AND effective_from <= CURRENT_DATE
       AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
     ORDER BY effective_from DESC, id DESC
     LIMIT 1`,
    [societyId]
  );

  return Number(settings[0]?.setting_value || 0);
};

/* ================= CREATE TENANT ================= */
export const createTenant = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const adminId = req.user.id;
  const societyId = getAdminSocietyId(req);

  const {
    flat_id,
    tenant_name,
    tenant_phone,
    tenant_whatsapp,
    tenant_email,
    move_in_date,
  } = req.body;

  try {
    if (!societyId) {
      return res.status(403).json({
        success: false,
        message: "Admin society is missing. Please login again.",
      });
    }

    await db.beginTransaction();

    const [flats] = await db.query(
      `SELECT id, maintenance_amount, occupancy
       FROM flats
       WHERE id = ? AND society_id = ? AND status = 'active'
       FOR UPDATE`,
      [flat_id, societyId]
    );

    if (flats.length === 0) {
      await db.rollback();
      return res.status(404).json({
        success: false,
        message: "Active flat not found in your society",
      });
    }

    const [activeTenant] = await db.query(
      `SELECT id FROM tenants
       WHERE flat_id = ? AND status = 'active'
       LIMIT 1`,
      [flat_id]
    );

    if (activeTenant.length > 0 || flats[0].occupancy === "tenant") {
      await db.rollback();
      return res.status(409).json({
        success: false,
        message: "Flat already has an active tenant",
      });
    }

    const maintenanceAmount = Number(flats[0].maintenance_amount || 0);
    const nocCharge = await getActiveNocCharge(societyId);
    const totalMonthlyCharge = maintenanceAmount + nocCharge;

    await db.query(
      `INSERT INTO tenants
       (tenant_code, society_id, admin_id, flat_id,
        tenant_name, tenant_phone, tenant_whatsapp, tenant_email,
        move_in_date, maintenance_amount, noc_charge, total_monthly_charge)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prefixedNanoId("TNT"),
        societyId,
        adminId,
        flat_id,
        tenant_name,
        tenant_phone,
        tenant_whatsapp || null,
        tenant_email || null,
        move_in_date,
        maintenanceAmount,
        nocCharge,
        totalMonthlyCharge,
      ]
    );

    await db.query(
      `UPDATE flats
       SET occupancy = 'tenant'
       WHERE id = ? AND society_id = ?`,
      [flat_id, societyId]
    );

    await db.commit();

    return res.status(201).json({
      success: true,
      message: "Tenant added successfully",
      charges: {
        maintenanceAmount,
        nocCharge,
        totalMonthlyCharge,
      },
    });
  } catch (error) {
    await db.rollback();
    console.error("CREATE TENANT ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= GET ALL TENANTS ================= */
export const getTenants = async (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const offset = (page - 1) * limit;

  const { flat_id, society_id, status } = req.query;
  const isAdmin = req.user.role === "admin";

  try {
    let where = "WHERE 1=1";
    const params = [];

    if (isAdmin) {
      where += " AND t.society_id = ?";
      params.push(req.user.society_id);
    } else if (society_id) {
      where += " AND t.society_id = ?";
      params.push(society_id);
    }

    if (flat_id) {
      where += " AND t.flat_id = ?";
      params.push(flat_id);
    }

    if (status) {
      where += " AND t.status = ?";
      params.push(status);
    }

    const [data] = await db.query(
      `SELECT t.id, t.tenant_code, t.tenant_name, t.tenant_phone,
              t.tenant_whatsapp, t.tenant_email, t.move_in_date,
              t.move_out_date, t.exit_letter_submitted, t.status,
              t.maintenance_amount, t.noc_charge, t.total_monthly_charge,
              f.flat_no, f.wing, s.society_name
       FROM tenants t
       JOIN flats f ON f.id = t.flat_id
       JOIN societies s ON s.id = t.society_id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM tenants t ${where}`,
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
    console.error("GET TENANTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= GET TENANT BY ID ================= */
export const getTenantById = async (req, res) => {
  const { id } = req.params;

  try {
    const params = [id];
    let scope = "";

    if (req.user.role === "admin") {
      scope = " AND t.society_id = ?";
      params.push(req.user.society_id);
    }

    const [rows] = await db.query(
      `SELECT t.*, f.wing, f.flat_no, f.floor_no, s.society_name
       FROM tenants t
       JOIN flats f ON f.id = t.flat_id
       JOIN societies s ON s.id = t.society_id
       WHERE t.id = ?${scope}
       LIMIT 1`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("GET TENANT ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= DEACTIVATE TENANT ================= */
export const deactivateTenant = async (req, res) => {
  const { id } = req.params;

  try {
    await db.beginTransaction();

    const params = [id];
    let scope = "";

    if (req.user.role === "admin") {
      scope = " AND society_id = ?";
      params.push(req.user.society_id);
    }

    const [rows] = await db.query(
      `SELECT id, flat_id FROM tenants
       WHERE id = ?${scope} AND status = 'active'
       FOR UPDATE`,
      params
    );

    if (rows.length === 0) {
      await db.rollback();
      return res.status(404).json({
        success: false,
        message: "Active tenant not found",
      });
    }

    await db.query(
      `UPDATE tenants
       SET status = 'inactive', move_out_date = CURRENT_DATE
       WHERE id = ?`,
      [id]
    );

    await db.query(
      `UPDATE flats SET occupancy = 'owner' WHERE id = ?`,
      [rows[0].flat_id]
    );

    await db.commit();

    return res.status(200).json({
      success: true,
      message: "Tenant deactivated successfully",
    });
  } catch (error) {
    await db.rollback();
    console.error("DEACTIVATE TENANT ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
