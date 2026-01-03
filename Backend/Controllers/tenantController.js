import tenants from "../Config/db.js";
import flats from "../Config/db.js";
import { validationResult } from "express-validator";

// 🔹 1. ADD TENANT
export const addTenant = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    flat_id,
    tenant_name,
    tenant_phone,
    tenant_whatsapp,
    tenant_email,
    move_in_date,
  } = req.body;

  try {
    // check flat
    const [flat] = await flats.query(
      "SELECT id FROM flats WHERE id=? AND status='active'",
      [flat_id]
    );

    if (flat.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Flat not found or inactive" });
    }

    // check active tenant
    const [existingTenant] = await tenants.query(
      "SELECT id FROM tenants WHERE flat_id=? AND status='active'",
      [flat_id]
    );

    if (existingTenant.length > 0) {
      return res.status(400).json({
        success: false,
        message: "An active tenant already exists for this flat",
      });
    }

    // insert tenant
    const [result] = await tenants.query(
      `INSERT INTO tenants
      (flat_id, tenant_name, tenant_phone, tenant_whatsapp, tenant_email, move_in_date)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        flat_id,
        tenant_name,
        tenant_phone,
        tenant_whatsapp,
        tenant_email,
        move_in_date,
      ]
    );

    // update flat occupancy
    await flats.query("UPDATE flats SET occupancy='tenant' WHERE id=?", [
      flat_id,
    ]);

    res.status(201).json({
      success: true,
      message: "Tenant added successfully",
      tenant_id: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🔹 2. GET ALL TENANTS
export const getAllTenants = async (req, res) => {
  try {
    const [tenant] = await tenants.query(
      `SELECT t.*, f.wing, f.flat_no
       FROM tenants t
       JOIN flats f ON t.flat_id = f.id
       ORDER BY t.created_at DESC`
    );

    res.status(200).json({ success: true, tenant });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🔹 3. GET TENANT BY ID
export const getTenantById = async (req, res) => {
  const { id } = req.params;

  try {
    const [tenant] = await tenants.query(
      `SELECT t.*, f.wing, f.flat_no
       FROM tenants t
       JOIN flats f ON t.flat_id = f.id
       WHERE t.id = ?`,
      [id]
    );

    if (tenant.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }

    res.status(200).json({ success: true, message: tenant[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🔹 3. GET TENANT with Pagination
export const getTenantsWithPagination = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    // total count
    const [countResult] = await tenants.query(
      "SELECT COUNT(*) AS total FROM tenants"
    );

    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // paginated data
    const [tenant] = await tenants.query(
      `SELECT t.*, f.wing, f.flat_no
       FROM tenants t
       JOIN flats f ON t.flat_id = f.id
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.status(200).json({
      success: true,
      data: tenant,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Pagination Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tenants",
      error: err.message,
    });
  }
};

// 🔹 4. TENANT EXIT REQUEST (WITHOUT LETTER)
export const requestTenantExit = async (req, res) => {
  const { id } = req.params;

  try {
    const [tenant] = await tenants.query(
      "SELECT id FROM tenants WHERE id=? AND status='active'",
      [id]
    );

    if (tenant.lemgth === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Active tenant not found" });
    }

    // no change in status
    res.json({
      message:
        "Exit request noted. Tenant remains active until exit letter is submitted.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🔹 5. FINAL TENANT DEACTIVATE (LETTER CHECK LATER)
export const deactivateTenant = async (req, res) => {
  const { id } = req.params;

  try {
    const [tenant] = await tenants.query(
      "SELECT flat_id FROM tenants WHERE id=? AND status='active'",
      [id]
    );

    if (tenant.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Active tenant not found" });
    }

    const flatId = tenant[0].flat_id;

    await tenants.query(
      `UPDATE tenants
       SET status='inactive',
           move_out_date=CURDATE()
       WHERE id=?`,
      [id]
    );

    await flats.query("UPDATE flats SET occupancy='owner' WHERE id=?", [
      flatId,
    ]);

    res
      .status(200)
      .json({ success: true, message: "Tenant deactivated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
