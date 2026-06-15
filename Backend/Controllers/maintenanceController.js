import { validationResult } from "express-validator";
import multer from "multer";
import XLSX from "xlsx";
import db from "../Config/db.js";
import { prefixedNanoId } from "../Utils/nanoId.js";

export const maintenanceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/\.(xlsx|xls|csv)$/i.test(file.originalname)) {
      return cb(new Error("Only Excel or CSV files are allowed"));
    }
    cb(null, true);
  },
});

const getScope = (req) => ({
  societyId: req.user?.society_id,
  adminId: req.user?.id,
});

const firstDay = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text.slice(0, 7)}-01`;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
  }
  const match = text.match(/^([A-Za-z]{3,})[-\s']?(\d{2,4})$/);
  if (!match) return null;
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(
    match[1].slice(0, 3).toLowerCase()
  );
  if (month < 0) return null;
  const rawYear = Number(match[2]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
};

const currentMonthStart = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};

const monthEnd = (periodMonth) => {
  const period = new Date(periodMonth);
  return new Date(period.getFullYear(), period.getMonth() + 1, 0).toISOString().slice(0, 10);
};

const shouldIncludeFuture = (req) =>
  req.query.include_future === "true" || req.body?.include_future === true;

const amount = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(/[,₹Rs.\s]/gi, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toCents = (value) => Math.round(amount(value) * 100);
const fromCents = (value) => Number((Number(value || 0) / 100).toFixed(2));
const centsFromDb = (value) => toCents(value);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const defaultDueDate = (periodMonth, graceDays = 0) => {
  const period = new Date(periodMonth);
  return addDays(new Date(period.getFullYear(), period.getMonth() + 1, 0), Number(graceDays || 0));
};

const nextReceiptNumber = () => `RCPT-${new Date().getFullYear()}-${prefixedNanoId("RCP")}`;

const normalizeBillingMonths = (value) => {
  if (!value) return [];
  const items = Array.isArray(value) ? value : String(value).split(",");
  return [...new Set(items.map(firstDay).filter(Boolean))].sort();
};

const monthRange = (from, to) => {
  if (!from || !to || from > to) return [];
  const months = [];
  const cursor = new Date(from);
  const end = new Date(to);
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-01`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

const roundByRule = (value, mode = "nearest") => {
  if (mode === "none") return Number(value.toFixed(2));
  if (mode === "floor") return Math.floor(value);
  if (mode === "ceil") return Math.ceil(value);
  return Math.round(value);
};

const statusFor = (totalDue, totalPaid) => {
  if (totalPaid <= 0) return "unpaid";
  if (totalPaid + 0.01 >= totalDue) return "paid";
  return "partial";
};

const audit = async (societyId, adminId, action, entityType, entityId, beforeData, afterData) => {
  await db.query(
    `INSERT INTO maintenance_audit_logs
     (society_id, admin_id, action, entity_type, entity_id, before_data, after_data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      societyId,
      adminId,
      action,
      entityType,
      entityId || null,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
    ]
  );
};

const ensureAdminSociety = (res, societyId) => {
  if (societyId) return false;
  res.status(403).json({
    success: false,
    message: "Admin society is missing. Please login again.",
  });
  return true;
};

const getActiveRule = async (societyId) => {
  const [rows] = await db.query(
    `SELECT * FROM maintenance_rule_configs
     WHERE society_id = ? AND status = 'active'
     ORDER BY effective_from DESC, id DESC
     LIMIT 1`,
    [societyId]
  );
  return rows[0] || {
    interest_rate_monthly: 0,
    interest_grace_days: 0,
    interest_method: "simple_monthly",
    interest_apply_to: "maintenance_only",
    exclude_noc_from_interest: 1,
    rounding_mode: "nearest",
  };
};

const getFlatBalance = async (flatId) => {
  const [[balance]] = await db.query(
    `SELECT COALESCE(SUM(total_balance), 0) AS total_balance
     FROM maintenance_charges
     WHERE flat_id = ?`,
    [flatId]
  );
  return Number(balance?.total_balance || 0);
};

const addLedgerEntry = async ({
  societyId,
  adminId,
  flatId,
  chargeId = null,
  paymentId = null,
  entryDate,
  periodMonth = null,
  entryType,
  description,
  debitAmount = 0,
  creditAmount = 0,
}) => {
  const currentBalance = await getFlatBalance(flatId);
  await db.query(
    `INSERT INTO maintenance_ledger_entries
     (society_id, admin_id, flat_id, charge_id, payment_id, entry_date, period_month,
      entry_type, description, debit_amount, credit_amount, balance_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      societyId,
      adminId,
      flatId,
      chargeId,
      paymentId,
      entryDate,
      periodMonth,
      entryType,
      description,
      debitAmount,
      creditAmount,
      currentBalance,
    ]
  );
};

const setExcelResponse = (res, fileName, rows, sheetName = "Report") => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}.xlsx"`);
  return res.send(buffer);
};

const pdfEscape = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const buildSimplePdf = (title, lines) => {
  const visibleLines = [title, "", ...lines].slice(0, 42);
  const stream = [
    "BT",
    "/F1 11 Tf",
    "50 790 Td",
    "14 TL",
    ...visibleLines.map((line, index) =>
      index === 0 ? `(${pdfEscape(line)}) Tj` : `T* (${pdfEscape(line)}) Tj`
    ),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
};

const setPdfResponse = (res, fileName, title, rows) => {
  const lines = rows.map((row) => Object.values(row).join(" | "));
  const buffer = buildSimplePdf(title, lines);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}.pdf"`);
  return res.send(buffer);
};

export const saveMaintenanceRule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  const {
    name,
    interest_rate_monthly,
    interest_grace_days = 0,
    interest_method = "simple_monthly",
    interest_apply_to = "maintenance_only",
    exclude_noc_from_interest = true,
    rounding_mode = "nearest",
    effective_from,
  } = req.body;

  try {
    await db.beginTransaction();
    await db.query(
      `UPDATE maintenance_rule_configs SET status = 'inactive'
       WHERE society_id = ? AND status = 'active'`,
      [societyId]
    );
    const [result] = await db.query(
      `INSERT INTO maintenance_rule_configs
       (rule_code, society_id, admin_id, name, interest_rate_monthly, interest_grace_days,
        interest_method, interest_apply_to, exclude_noc_from_interest, rounding_mode, effective_from)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE))`,
      [
        prefixedNanoId("MRL"),
        societyId,
        adminId,
        name,
        interest_rate_monthly,
        interest_grace_days,
        interest_method,
        interest_apply_to,
        exclude_noc_from_interest ? 1 : 0,
        rounding_mode,
        effective_from || null,
      ]
    );
    await audit(societyId, adminId, "create", "maintenance_rule", result.insertId, null, req.body);
    await db.commit();
    return res.status(201).json({ success: true, message: "Maintenance rule saved successfully" });
  } catch (error) {
    await db.rollback();
    console.error("SAVE MAINTENANCE RULE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to save maintenance rule" });
  }
};

export const getMaintenanceRules = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  try {
    const [rows] = await db.query(
      `SELECT id, rule_code, name, interest_rate_monthly, interest_grace_days,
              interest_method, interest_apply_to, exclude_noc_from_interest,
              rounding_mode, status, effective_from, created_at
       FROM maintenance_rule_configs
       WHERE society_id = ?
       ORDER BY status = 'active' DESC, effective_from DESC, id DESC`,
      [societyId]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("GET MAINTENANCE RULES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch maintenance rules" });
  }
};

const upsertCharge = async (payload) => {
  const {
    societyId,
    adminId,
    flatId,
    periodMonth,
    maintenanceCharge,
    nocCharge = 0,
    penaltyCharge = 0,
    interestAmount = 0,
    dueDate = null,
    maintenancePaid = 0,
    nocPaid = 0,
    interestPaid = 0,
    source = "manual",
    notes = null,
  } = payload;
  const resolvedDueDate = dueDate || defaultDueDate(periodMonth, 0);
  const totalDue = fromCents(toCents(maintenanceCharge) + toCents(nocCharge) + toCents(penaltyCharge) + toCents(interestAmount));
  const totalPaid = fromCents(toCents(maintenancePaid) + toCents(nocPaid) + toCents(interestPaid));
  const maintenanceBalance = fromCents(Math.max(toCents(maintenanceCharge) + toCents(penaltyCharge) - toCents(maintenancePaid), 0));
  const nocBalance = fromCents(Math.max(toCents(nocCharge) - toCents(nocPaid), 0));
  const interestBalance = fromCents(Math.max(toCents(interestAmount) - toCents(interestPaid), 0));
  const totalBalance = fromCents(Math.max(toCents(totalDue) - toCents(totalPaid), 0));
  const status = statusFor(totalDue, totalPaid);

  const [result] = await db.query(
    `INSERT INTO maintenance_charges
     (charge_code, society_id, admin_id, flat_id, period_month, due_date, maintenance_charge, noc_charge,
      penalty_charge, interest_amount, total_due, maintenance_paid, noc_paid, interest_paid,
      total_paid, maintenance_balance, noc_balance, interest_balance, total_balance, status, source, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       admin_id = VALUES(admin_id),
       due_date = VALUES(due_date),
       maintenance_charge = VALUES(maintenance_charge),
       noc_charge = VALUES(noc_charge),
       penalty_charge = VALUES(penalty_charge),
       interest_amount = VALUES(interest_amount),
       total_due = VALUES(total_due),
       maintenance_paid = VALUES(maintenance_paid),
       noc_paid = VALUES(noc_paid),
       interest_paid = VALUES(interest_paid),
       total_paid = VALUES(total_paid),
       maintenance_balance = VALUES(maintenance_balance),
       noc_balance = VALUES(noc_balance),
       interest_balance = VALUES(interest_balance),
       total_balance = VALUES(total_balance),
       status = VALUES(status),
       source = VALUES(source),
       notes = VALUES(notes)`,
    [
      prefixedNanoId("MCH"),
      societyId,
      adminId,
      flatId,
      periodMonth,
      resolvedDueDate,
      maintenanceCharge,
      nocCharge,
      penaltyCharge,
      interestAmount,
      totalDue,
      maintenancePaid,
      nocPaid,
      interestPaid,
      totalPaid,
      maintenanceBalance,
      nocBalance,
      interestBalance,
      totalBalance,
      status,
      source,
      notes,
    ]
  );

  const chargeId = result.insertId || (
    await db.query(
      `SELECT id FROM maintenance_charges
       WHERE society_id = ? AND flat_id = ? AND period_month = ?
       LIMIT 1`,
      [societyId, flatId, periodMonth]
    )
  )[0][0]?.id;

  return { chargeId, totalDue };
};

export const createMaintenanceCharge = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  const periodMonth = firstDay(req.body.period_month);
  if (!periodMonth) return res.status(400).json({ success: false, message: "Invalid period month" });

  try {
    const rule = await getActiveRule(societyId);
    if (periodMonth > currentMonthStart() && !req.body.allow_future) {
      return res.status(400).json({
        success: false,
        message: "Future maintenance is only allowed through advance payment.",
      });
    }
    const [flats] = await db.query(
      `SELECT id FROM flats WHERE id = ? AND society_id = ? AND status = 'active'`,
      [req.body.flat_id, societyId]
    );
    if (flats.length === 0) return res.status(404).json({ success: false, message: "Flat not found" });

    const { chargeId, totalDue } = await upsertCharge({
      societyId,
      adminId,
      flatId: req.body.flat_id,
      periodMonth,
      dueDate: req.body.due_date || defaultDueDate(periodMonth, rule.interest_grace_days),
      maintenanceCharge: amount(req.body.maintenance_charge),
      nocCharge: amount(req.body.noc_charge),
      penaltyCharge: amount(req.body.penalty_charge),
      interestAmount: amount(req.body.interest_amount),
      source: req.body.source || "manual",
      notes: req.body.notes || null,
    });
    await addLedgerEntry({
      societyId,
      adminId,
      flatId: req.body.flat_id,
      chargeId,
      entryDate: new Date().toISOString().slice(0, 10),
      periodMonth,
      entryType: "charge",
      description:
        req.body.source === "old_due"
          ? `Old maintenance dues for ${periodMonth.slice(0, 7)}`
          : `Maintenance bill for ${periodMonth.slice(0, 7)}`,
      debitAmount: totalDue,
    });
    await audit(societyId, adminId, "upsert", "maintenance_charge", null, null, req.body);
    return res.status(201).json({ success: true, message: "Maintenance charge saved successfully" });
  } catch (error) {
    console.error("CREATE MAINTENANCE CHARGE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to save maintenance charge" });
  }
};

export const createOldMaintenanceDue = async (req, res) => {
  req.body.source = "old_due";
  req.body.allow_future = false;
  return createMaintenanceCharge(req, res);
};

export const updateMaintenanceBalance = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  const periodMonth = firstDay(req.body.period_month) || currentMonthStart();

  try {
    await db.beginTransaction();
    const [flats] = await db.query(
      `SELECT id FROM flats WHERE id = ? AND society_id = ? AND status = 'active'`,
      [req.body.flat_id, societyId]
    );
    if (flats.length === 0) {
      await db.rollback();
      return res.status(404).json({ success: false, message: "Flat not found" });
    }

    const [[existing]] = await db.query(
      `SELECT id, maintenance_paid, noc_paid, interest_paid
       FROM maintenance_charges
       WHERE society_id = ? AND flat_id = ? AND period_month = ?
       LIMIT 1`,
      [societyId, req.body.flat_id, periodMonth]
    );

    const outstandingMaintenance = amount(req.body.outstanding_maintenance_amount);
    const outstandingNoc = amount(req.body.outstanding_noc_amount);
    const outstandingInterest = amount(req.body.outstanding_interest_amount);
    const maintenancePaid = Number(existing?.maintenance_paid || 0);
    const nocPaid = Number(existing?.noc_paid || 0);
    const interestPaid = Number(existing?.interest_paid || 0);

    const { chargeId, totalDue } = await upsertCharge({
      societyId,
      adminId,
      flatId: req.body.flat_id,
      periodMonth,
      maintenanceCharge: outstandingMaintenance + maintenancePaid,
      nocCharge: outstandingNoc + nocPaid,
      interestAmount: outstandingInterest + interestPaid,
      maintenancePaid,
      nocPaid,
      interestPaid,
      source: "old_due",
      notes: req.body.remarks || "Balance maintenance update",
    });

    await addLedgerEntry({
      societyId,
      adminId,
      flatId: req.body.flat_id,
      chargeId,
      entryDate: new Date().toISOString().slice(0, 10),
      periodMonth,
      entryType: "adjustment",
      description: `Balance maintenance updated for ${periodMonth.slice(0, 7)}`,
      debitAmount: totalDue - maintenancePaid - nocPaid - interestPaid,
    });
    await audit(societyId, adminId, "update", "maintenance_balance", chargeId, existing || null, req.body);
    await db.commit();
    return res.status(200).json({ success: true, message: "Maintenance balance updated successfully" });
  } catch (error) {
    await db.rollback();
    console.error("UPDATE MAINTENANCE BALANCE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update maintenance balance" });
  }
};

export const getMaintenanceCharges = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const offset = (page - 1) * limit;
  const params = [societyId];
  let where = "WHERE mc.society_id = ?";

  if (!shouldIncludeFuture(req)) {
    where += " AND mc.period_month <= ?";
    params.push(currentMonthStart());
  }

  if (req.query.flat_id) {
    where += " AND mc.flat_id = ?";
    params.push(req.query.flat_id);
  }
  if (req.query.status) {
    where += " AND mc.status = ?";
    params.push(req.query.status);
  }
  if (req.query.from) {
    where += " AND mc.period_month >= ?";
    params.push(firstDay(req.query.from));
  }
  if (req.query.to) {
    where += " AND mc.period_month <= ?";
    params.push(firstDay(req.query.to));
  }

  try {
    const [rows] = await db.query(
      `SELECT mc.*, f.wing, f.flat_no, f.owner_name
       FROM maintenance_charges mc
       JOIN flats f ON f.id = mc.flat_id
       ${where}
       ORDER BY mc.period_month DESC, f.wing, f.flat_no
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM maintenance_charges mc ${where}`,
      params
    );
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET MAINTENANCE CHARGES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch maintenance charges" });
  }
};

export const recordMaintenancePayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  try {
    await db.beginTransaction();
    const [flats] = await db.query(
      `SELECT id, wing, flat_no, owner_name, maintenance_amount
       FROM flats
       WHERE id = ? AND society_id = ? AND status = 'active'`,
      [req.body.flat_id, societyId]
    );
    if (flats.length === 0) {
      await db.rollback();
      return res.status(404).json({ success: false, message: "Flat not found" });
    }

    const maintenancePaidTotalCents = toCents(req.body.maintenance_amount_paid);
    const nocPaidTotalCents = toCents(req.body.noc_amount_paid);
    const interestPaidTotalCents = toCents(req.body.interest_amount_paid);
    const explicitTotalCents = maintenancePaidTotalCents + nocPaidTotalCents + interestPaidTotalCents;
    const legacyTotalCents = toCents(req.body.total_amount_paid || req.body.amount);
    const totalPaidCents = explicitTotalCents || legacyTotalCents;
    let remainingMaintenanceCents = explicitTotalCents ? maintenancePaidTotalCents : legacyTotalCents;
    let remainingNocCents = explicitTotalCents ? nocPaidTotalCents : 0;
    let remainingInterestCents = explicitTotalCents ? interestPaidTotalCents : 0;
    const fromMonth = firstDay(req.body.from_month);
    const toMonth = firstDay(req.body.to_month);
    const billingMonths = req.body.billing_months
      ? normalizeBillingMonths(req.body.billing_months)
      : monthRange(fromMonth, toMonth);
    const rule = await getActiveRule(societyId);

    if (totalPaidCents <= 0) {
      await db.rollback();
      return res.status(400).json({ success: false, message: "Payment amount is required" });
    }
    if (fromMonth && toMonth && fromMonth > toMonth) {
      await db.rollback();
      return res.status(400).json({ success: false, message: "From month cannot be after to month" });
    }

    for (const [index, billingMonth] of billingMonths.entries()) {
      const [[existing]] = await db.query(
        `SELECT id FROM maintenance_charges
         WHERE society_id = ? AND flat_id = ? AND period_month = ?
         LIMIT 1`,
        [societyId, req.body.flat_id, billingMonth]
      );

      if (!existing) {
        const { chargeId, totalDue } = await upsertCharge({
          societyId,
          adminId,
          flatId: req.body.flat_id,
          periodMonth: billingMonth,
          dueDate: defaultDueDate(billingMonth, rule.interest_grace_days),
          maintenanceCharge: amount(req.body.monthly_maintenance_amount) || Number(flats[0].maintenance_amount || 0),
          nocCharge: index === 0 ? amount(req.body.noc_amount) : 0,
          interestAmount: index === 0 ? amount(req.body.interest_amount) : 0,
          source: "system",
          notes: billingMonth > currentMonthStart() ? "Advance payment month" : "Payment-selected billing month",
        });
        await addLedgerEntry({
          societyId,
          adminId,
          flatId: req.body.flat_id,
          chargeId,
          entryDate: req.body.payment_date || new Date().toISOString().slice(0, 10),
          periodMonth: billingMonth,
          entryType: "charge",
          description: `Maintenance bill for ${billingMonth.slice(0, 7)}`,
          debitAmount: totalDue,
        });
      }
    }

    const receiptNumber = req.body.receipt_number || nextReceiptNumber();
    const [payment] = await db.query(
      `INSERT INTO maintenance_payments
       (payment_code, society_id, admin_id, flat_id, payment_date, amount, maintenance_amount_paid,
        noc_amount_paid, interest_amount_paid, from_month, to_month, payment_mode,
        reference_no, receipt_number, notes)
       VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prefixedNanoId("MPY"),
        societyId,
        adminId,
        req.body.flat_id,
        req.body.payment_date || null,
        fromCents(totalPaidCents),
        fromCents(maintenancePaidTotalCents || (explicitTotalCents ? 0 : legacyTotalCents)),
        fromCents(nocPaidTotalCents),
        fromCents(interestPaidTotalCents),
        fromMonth,
        toMonth,
        req.body.payment_mode || "cash",
        req.body.reference_no || null,
        receiptNumber,
        req.body.notes || null,
      ]
    );

    const dueParams = [societyId, req.body.flat_id];
    let dueWhere = "WHERE society_id = ? AND flat_id = ? AND total_balance > 0";
    if (billingMonths.length > 0) {
      dueWhere += ` AND period_month IN (${billingMonths.map(() => "?").join(",")})`;
      dueParams.push(...billingMonths);
    } else {
      dueWhere += " AND period_month <= ?";
      dueParams.push(currentMonthStart());
    }

    const [dues] = await db.query(
      `SELECT id, period_month, maintenance_balance, noc_balance, interest_balance
       FROM maintenance_charges
       ${dueWhere}
       ORDER BY period_month ASC`,
      dueParams
    );

    const allocations = [];
    for (const due of dues) {
      if (remainingMaintenanceCents <= 0 && remainingNocCents <= 0 && remainingInterestCents <= 0) break;
      const maintenancePaidCents = Math.min(remainingMaintenanceCents, centsFromDb(due.maintenance_balance));
      remainingMaintenanceCents -= maintenancePaidCents;
      const nocPaidCents = Math.min(remainingNocCents, centsFromDb(due.noc_balance));
      remainingNocCents -= nocPaidCents;
      const interestPaidCents = Math.min(remainingInterestCents, centsFromDb(due.interest_balance));
      remainingInterestCents -= interestPaidCents;
      const allocatedCents = maintenancePaidCents + nocPaidCents + interestPaidCents;

      if (allocatedCents > 0) {
        const maintenancePaid = fromCents(maintenancePaidCents);
        const nocPaid = fromCents(nocPaidCents);
        const interestPaid = fromCents(interestPaidCents);
        const allocated = fromCents(allocatedCents);
        await db.query(
          `UPDATE maintenance_charges
            SET maintenance_paid = maintenance_paid + ?,
                noc_paid = noc_paid + ?,
                interest_paid = interest_paid + ?,
                total_paid = total_paid + ?,
                maintenance_balance = GREATEST(maintenance_balance - ?, 0),
                noc_balance = GREATEST(noc_balance - ?, 0),
                interest_balance = GREATEST(interest_balance - ?, 0),
                total_balance = GREATEST(total_balance - ?, 0),
                status = CASE
                  WHEN GREATEST(total_balance - ?, 0) = 0 THEN 'paid'
                  ELSE 'partial'
                END
            WHERE id = ?`,
          [
            maintenancePaid,
            nocPaid,
            interestPaid,
            allocated,
            maintenancePaid,
            nocPaid,
            interestPaid,
            allocated,
            allocated,
            due.id,
          ]
        );
        await db.query(
          `INSERT INTO maintenance_payment_allocations
           (payment_id, charge_id, maintenance_amount, noc_amount, interest_amount)
           VALUES (?, ?, ?, ?, ?)`,
          [payment.insertId, due.id, maintenancePaid, nocPaid, interestPaid]
        );
        allocations.push({
          charge_id: due.id,
          period_month: due.period_month,
          maintenance_amount: maintenancePaid,
          noc_amount: nocPaid,
          interest_amount: interestPaid,
          allocated_amount: allocated,
        });
        await addLedgerEntry({
          societyId,
          adminId,
          flatId: req.body.flat_id,
          paymentId: payment.insertId,
          chargeId: due.id,
          entryDate: req.body.payment_date || new Date().toISOString().slice(0, 10),
          periodMonth: due.period_month,
          entryType: "payment",
          description: `Payment receipt ${receiptNumber}`,
          creditAmount: allocated,
        });
      }
    }

    const unappliedCents = remainingMaintenanceCents + remainingNocCents + remainingInterestCents;
    await audit(societyId, adminId, "create", "maintenance_payment", payment.insertId, null, req.body);
    await db.commit();
    return res.status(201).json({
      success: true,
      message: unappliedCents > 0 ? "Payment recorded with unapplied balance" : "Payment recorded successfully",
      receipt_number: receiptNumber,
      allocations,
      unapplied_amount: fromCents(unappliedCents),
    });
  } catch (error) {
    await db.rollback();
    console.error("RECORD MAINTENANCE PAYMENT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to record payment" });
  }
};

export const getMaintenanceBalances = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  try {
    const [rows] = await db.query(
      `SELECT f.id AS flat_id, f.wing, f.flat_no, f.owner_name,
              COALESCE(SUM(mc.maintenance_balance), 0) AS maintenance_balance,
              COALESCE(SUM(mc.noc_balance), 0) AS noc_balance,
              COALESCE(SUM(mc.interest_balance), 0) AS interest_balance,
              COALESCE(SUM(mc.total_balance), 0) AS total_balance,
              MIN(CASE WHEN mc.total_balance > 0 THEN mc.period_month END) AS oldest_due_month
       FROM flats f
       LEFT JOIN maintenance_charges mc
         ON mc.flat_id = f.id
        AND mc.society_id = f.society_id
        AND mc.period_month <= ?
       WHERE f.society_id = ? AND f.status = 'active'
       GROUP BY f.id, f.wing, f.flat_no, f.owner_name
       HAVING total_balance > 0
       ORDER BY total_balance DESC`,
      [currentMonthStart(), societyId]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("GET MAINTENANCE BALANCES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch balances" });
  }
};

export const getFlatMaintenanceDetails = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  const flatId = Number(req.params.flatId);

  try {
    const [flats] = await db.query(
      `SELECT id, flat_code, wing, flat_no, floor_no, owner_name, owner_phone,
              owner_email, maintenance_amount, occupancy, status
       FROM flats
       WHERE id = ? AND society_id = ?`,
      [flatId, societyId]
    );
    if (flats.length === 0) {
      return res.status(404).json({ success: false, message: "Flat not found" });
    }

    const [monthly] = await db.query(
      `SELECT id, charge_code, period_month, due_date, maintenance_charge,
               noc_charge, penalty_charge, interest_amount, total_due,
              maintenance_paid, noc_paid, interest_paid, total_paid, maintenance_balance,
              noc_balance, interest_balance, total_balance, status, source, notes, updated_at
       FROM maintenance_charges
       WHERE society_id = ? AND flat_id = ? AND period_month <= ?
       ORDER BY period_month DESC`,
      [societyId, flatId, currentMonthStart()]
    );

    const [pendingMonths] = await db.query(
      `SELECT id, period_month, due_date, total_due, total_paid, total_balance,
              maintenance_balance, noc_balance, interest_balance, status
       FROM maintenance_charges
       WHERE society_id = ? AND flat_id = ? AND total_balance > 0 AND period_month <= ?
       ORDER BY period_month ASC`,
      [societyId, flatId, currentMonthStart()]
    );

    const [payments] = await db.query(
      `SELECT mp.id, mp.payment_code, mp.receipt_number, mp.payment_date,
              mp.amount, mp.maintenance_amount_paid, mp.noc_amount_paid,
              mp.interest_amount_paid, mp.from_month, mp.to_month,
              mp.payment_mode, mp.reference_no, mp.notes,
              GROUP_CONCAT(DATE_FORMAT(mc.period_month, '%b-%Y') ORDER BY mc.period_month SEPARATOR ', ') AS billing_months
       FROM maintenance_payments mp
       LEFT JOIN maintenance_payment_allocations mpa ON mpa.payment_id = mp.id
       LEFT JOIN maintenance_charges mc ON mc.id = mpa.charge_id
       WHERE mp.society_id = ? AND mp.flat_id = ?
        GROUP BY mp.id, mp.payment_code, mp.receipt_number, mp.payment_date,
                 mp.amount, mp.maintenance_amount_paid, mp.noc_amount_paid,
                 mp.interest_amount_paid, mp.from_month, mp.to_month,
                 mp.payment_mode, mp.reference_no, mp.notes
       ORDER BY mp.payment_date DESC, mp.id DESC`,
      [societyId, flatId]
    );

    const [ledger] = await db.query(
      `SELECT id, entry_date, period_month, entry_type, description,
              debit_amount, credit_amount, balance_after
       FROM maintenance_ledger_entries
       WHERE society_id = ? AND flat_id = ?
       ORDER BY entry_date ASC, id ASC`,
      [societyId, flatId]
    );

    const [[totals]] = await db.query(
      `SELECT COALESCE(SUM(total_due), 0) AS total_charges,
              COALESCE(SUM(total_paid), 0) AS total_paid,
              COALESCE(SUM(total_balance), 0) AS outstanding_balance,
              COALESCE(SUM(maintenance_balance), 0) AS maintenance_balance,
              COALESCE(SUM(noc_balance), 0) AS noc_balance,
              COALESCE(SUM(interest_amount), 0) AS interest_charged,
              COALESCE(SUM(interest_balance), 0) AS interest_balance
       FROM maintenance_charges
       WHERE society_id = ? AND flat_id = ? AND period_month <= ?`,
      [societyId, flatId, currentMonthStart()]
    );

    return res.status(200).json({
      success: true,
      data: {
        flat: flats[0],
        totals,
        pending_months: pendingMonths,
        monthly_records: monthly,
        payment_history: payments,
        ledger,
      },
    });
  } catch (error) {
    console.error("GET FLAT MAINTENANCE DETAILS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch flat maintenance details" });
  }
};

export const getMaintenanceSummary = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  try {
    const [[summary]] = await db.query(
      `SELECT COALESCE(SUM(total_due), 0) AS total_billed,
              COALESCE(SUM(total_paid), 0) AS total_collected,
              COALESCE(SUM(total_balance), 0) AS total_outstanding,
              COALESCE(SUM(interest_balance), 0) AS interest_outstanding,
              COUNT(CASE WHEN total_balance > 0 THEN 1 END) AS due_records
       FROM maintenance_charges
       WHERE society_id = ? AND period_month <= ?`,
      [societyId, currentMonthStart()]
    );
    const [recent] = await db.query(
      `SELECT mc.id, mc.period_month, mc.total_due, mc.total_paid, mc.total_balance,
              f.wing, f.flat_no, f.owner_name
       FROM maintenance_charges mc
       JOIN flats f ON f.id = mc.flat_id
       WHERE mc.society_id = ? AND mc.period_month <= ?
       ORDER BY mc.updated_at DESC
       LIMIT 8`,
      [societyId, currentMonthStart()]
    );
    return res.status(200).json({ success: true, data: { summary, recent } });
  } catch (error) {
    console.error("GET MAINTENANCE SUMMARY ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch summary" });
  }
};

const generateMonthlyCharges = async (periodMonth = currentMonthStart(), societyFilter = null) => {
  const params = [];
  let where = "WHERE f.status = 'active'";
  if (societyFilter) {
    where += " AND f.society_id = ?";
    params.push(societyFilter);
  }

  const [flats] = await db.query(
    `SELECT f.id, f.society_id, f.admin_id, f.maintenance_amount,
            COALESCE(t.noc_charge, 0) AS noc_charge,
            COALESCE(rc.recurring_charge, 0) AS recurring_charge
     FROM flats f
     LEFT JOIN tenants t
       ON t.flat_id = f.id
      AND t.status = 'active'
      AND t.move_in_date <= ?
      AND (t.move_out_date IS NULL OR t.move_out_date >= ?)
     LEFT JOIN (
       SELECT society_id, SUM(setting_value) AS recurring_charge
       FROM maintenance_settings
       WHERE status = 'active'
         AND value_type = 'fixed'
         AND setting_key NOT IN ('base_maintenance', 'noc_charge', 'late_fee')
         AND effective_from <= ?
         AND (effective_to IS NULL OR effective_to >= ?)
       GROUP BY society_id
     ) rc ON rc.society_id = f.society_id
     ${where}`,
    [monthEnd(periodMonth), periodMonth, periodMonth, periodMonth, ...params]
  );

  let created = 0;
  let skipped = 0;
  for (const flat of flats) {
    const [[existing]] = await db.query(
      `SELECT id FROM maintenance_charges
       WHERE society_id = ? AND flat_id = ? AND period_month = ?
       LIMIT 1`,
      [flat.society_id, flat.id, periodMonth]
    );
    if (existing) {
      skipped += 1;
      continue;
    }

    const rule = await getActiveRule(flat.society_id);
    const { chargeId, totalDue } = await upsertCharge({
      societyId: flat.society_id,
      adminId: flat.admin_id,
      flatId: flat.id,
      periodMonth,
      dueDate: defaultDueDate(periodMonth, rule.interest_grace_days),
      maintenanceCharge: amount(flat.maintenance_amount),
      nocCharge: amount(flat.noc_charge),
      penaltyCharge: amount(flat.recurring_charge),
      source: "system",
      notes: "Automatic monthly charge",
    });
    await addLedgerEntry({
      societyId: flat.society_id,
      adminId: flat.admin_id,
      flatId: flat.id,
      chargeId,
      entryDate: periodMonth,
      periodMonth,
      entryType: "charge",
      description: `Automatic monthly charge for ${periodMonth.slice(0, 7)}`,
      debitAmount: totalDue,
    });
    created += 1;
  }

  return { period_month: periodMonth, created, skipped, total_flats: flats.length };
};

export const runMonthlyChargeGeneration = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  const periodMonth = firstDay(req.body?.period_month) || currentMonthStart();

  try {
    const result = await generateMonthlyCharges(periodMonth, societyId);
    return res.status(200).json({
      success: true,
      message: "Monthly maintenance charges generated",
      data: result,
    });
  } catch (error) {
    console.error("RUN MONTHLY CHARGE GENERATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to generate monthly charges" });
  }
};

export const scheduleMonthlyMaintenanceCharges = () => {
  const runIfDue = async () => {
    const now = new Date();
    if (now.getDate() !== 1) return;
    try {
      const result = await generateMonthlyCharges(currentMonthStart());
      console.log(
        `Monthly maintenance generation: ${result.created} created, ${result.skipped} skipped for ${result.period_month}`
      );
    } catch (error) {
      console.error("MONTHLY MAINTENANCE GENERATION ERROR:", error);
    }
  };

  runIfDue();
  return setInterval(runIfDue, 24 * 60 * 60 * 1000);
};

export const getMaintenanceReports = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  const selectedMonth =
    req.query.month && req.query.year
      ? `${req.query.year}-${String(req.query.month).padStart(2, "0")}-01`
      : null;
  const from = selectedMonth || (req.query.from ? firstDay(req.query.from) : "1900-01-01");
  const requestedTo = selectedMonth || (req.query.to ? firstDay(req.query.to) : "2999-12-01");
  const to = shouldIncludeFuture(req)
    ? requestedTo
    : requestedTo < currentMonthStart()
      ? requestedTo
      : currentMonthStart();
  const search = String(req.query.search || "").trim();
  const collectionParams = [societyId, from, monthEnd(to)];
  let collectionWhere = "WHERE mp.society_id = ? AND mp.payment_date BETWEEN ? AND ?";
  if (search) {
    collectionWhere += " AND (f.flat_no LIKE ? OR f.wing LIKE ? OR f.owner_name LIKE ?)";
    collectionParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  try {
    const [monthly] = await db.query(
      `SELECT period_month,
              SUM(maintenance_charge + penalty_charge) AS maintenance_billed,
              SUM(noc_charge) AS noc_billed,
              SUM(interest_amount) AS interest_billed,
              SUM(total_due) AS billed,
              SUM(maintenance_paid) AS maintenance_collection,
              SUM(noc_paid) AS noc_collection,
              SUM(interest_paid) AS interest_collection,
              SUM(total_paid) AS grand_total_collection,
              SUM(total_balance) AS outstanding,
              COUNT(DISTINCT CASE WHEN total_paid > 0 THEN flat_id END) AS paid_flats,
              COUNT(DISTINCT CASE WHEN total_balance > 0 THEN flat_id END) AS pending_flats
       FROM maintenance_charges
       WHERE society_id = ? AND period_month BETWEEN ? AND ?
       GROUP BY period_month
       ORDER BY period_month DESC`,
      [societyId, from, to]
    );
    const [payments] = await db.query(
      `SELECT payment_mode, COUNT(*) AS count,
              SUM(maintenance_amount_paid) AS maintenance_collection,
              SUM(noc_amount_paid) AS noc_collection,
              SUM(interest_amount_paid) AS interest_collection,
              SUM(amount) AS amount
       FROM maintenance_payments
       WHERE society_id = ? AND payment_date BETWEEN ? AND ?
       GROUP BY payment_mode`,
      [societyId, from, monthEnd(to)]
    );
    const [collections] = await db.query(
      `SELECT mp.id, mp.payment_date, mp.receipt_number, mp.amount, mp.payment_mode,
              mp.maintenance_amount_paid, mp.noc_amount_paid, mp.interest_amount_paid,
              mp.from_month, mp.to_month, mp.reference_no, mp.notes, f.wing, f.flat_no, f.owner_name,
              GROUP_CONCAT(DATE_FORMAT(mc.period_month, '%b-%Y') ORDER BY mc.period_month SEPARATOR ', ') AS billing_months
       FROM maintenance_payments mp
       JOIN flats f ON f.id = mp.flat_id
       LEFT JOIN maintenance_payment_allocations mpa ON mpa.payment_id = mp.id
       LEFT JOIN maintenance_charges mc ON mc.id = mpa.charge_id
       ${collectionWhere}
       GROUP BY mp.id, mp.payment_date, mp.receipt_number, mp.amount, mp.payment_mode,
                mp.maintenance_amount_paid, mp.noc_amount_paid, mp.interest_amount_paid,
                mp.from_month, mp.to_month, mp.reference_no, mp.notes, f.wing, f.flat_no, f.owner_name
       ORDER BY mp.payment_date DESC, mp.id DESC`,
      collectionParams
    );
    const [[collectionTotal]] = await db.query(
      `SELECT COALESCE(SUM(mp.maintenance_amount_paid), 0) AS maintenance_collection,
              COALESCE(SUM(mp.noc_amount_paid), 0) AS noc_collection,
              COALESCE(SUM(mp.interest_amount_paid), 0) AS interest_collection,
              COALESCE(SUM(mp.amount), 0) AS total_collected,
              COUNT(*) AS payment_count,
              COUNT(DISTINCT mp.flat_id) AS paid_flats
       FROM maintenance_payments mp
       JOIN flats f ON f.id = mp.flat_id
       ${collectionWhere}`,
      collectionParams
    );
    return res.status(200).json({
      success: true,
      data: { monthly, payments, collections, collection_total: collectionTotal },
    });
  } catch (error) {
    console.error("GET MAINTENANCE REPORTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reports" });
  }
};

const reportRows = async (societyId, type, from, to, flatId = null) => {
  if (type === "flat-wise") {
    const [rows] = await db.query(
      `SELECT f.wing, f.flat_no, f.owner_name,
              SUM(mc.maintenance_charge + mc.penalty_charge) AS maintenance_charges,
              SUM(mc.noc_charge) AS noc_charges,
              SUM(mc.interest_amount) AS interest_charges,
              SUM(mc.total_due) AS total_charges,
              SUM(mc.maintenance_paid) AS maintenance_collected,
              SUM(mc.noc_paid) AS noc_collected,
              SUM(mc.interest_paid) AS interest_collected,
              SUM(mc.total_paid) AS total_paid,
              SUM(mc.maintenance_balance) AS maintenance_balance,
              SUM(mc.noc_balance) AS noc_balance,
              SUM(mc.interest_balance) AS interest_balance,
              SUM(mc.total_balance) AS outstanding_balance,
              MIN(CASE WHEN mc.total_balance > 0 THEN mc.period_month END) AS oldest_due_month
       FROM maintenance_charges mc
       JOIN flats f ON f.id = mc.flat_id
       WHERE mc.society_id = ? AND mc.period_month BETWEEN ? AND ?
       GROUP BY f.id, f.wing, f.flat_no, f.owner_name
       ORDER BY f.wing, f.flat_no`,
      [societyId, from, to]
    );
    return rows;
  }

  if (type === "outstanding") {
    const [rows] = await db.query(
      `SELECT f.wing, f.flat_no, f.owner_name,
              SUM(mc.maintenance_balance) AS maintenance_balance,
              SUM(mc.noc_balance) AS noc_balance,
              SUM(mc.interest_balance) AS interest_balance,
              SUM(mc.total_balance) AS total_balance,
              MIN(CASE WHEN mc.total_balance > 0 THEN mc.period_month END) AS oldest_due_month
       FROM maintenance_charges mc
       JOIN flats f ON f.id = mc.flat_id
       WHERE mc.society_id = ? AND mc.total_balance > 0 AND mc.period_month <= ?
       GROUP BY f.id, f.wing, f.flat_no, f.owner_name
       ORDER BY total_balance DESC`,
      [societyId, to]
    );
    return rows;
  }

  if (type === "collection") {
    const [rows] = await db.query(
      `SELECT mp.payment_date, mp.receipt_number, f.wing, f.flat_no, f.owner_name,
              mp.maintenance_amount_paid, mp.noc_amount_paid, mp.interest_amount_paid,
              mp.amount AS grand_total_collection, mp.from_month, mp.to_month,
              mp.payment_mode, mp.reference_no, mp.notes,
              GROUP_CONCAT(DATE_FORMAT(mc.period_month, '%b-%Y') ORDER BY mc.period_month SEPARATOR ', ') AS billing_months
       FROM maintenance_payments mp
       JOIN flats f ON f.id = mp.flat_id
       LEFT JOIN maintenance_payment_allocations mpa ON mpa.payment_id = mp.id
       LEFT JOIN maintenance_charges mc ON mc.id = mpa.charge_id
       WHERE mp.society_id = ? AND mp.payment_date BETWEEN ? AND ?
       GROUP BY mp.id, mp.payment_date, mp.receipt_number, f.wing, f.flat_no, f.owner_name,
                mp.maintenance_amount_paid, mp.noc_amount_paid, mp.interest_amount_paid,
                mp.amount, mp.from_month, mp.to_month, mp.payment_mode, mp.reference_no, mp.notes
       ORDER BY mp.payment_date DESC, mp.id DESC`,
      [societyId, from, monthEnd(to)]
    );
    return rows;
  }

  if (type === "interest") {
    const [rows] = await db.query(
      `SELECT mc.period_month, f.wing, f.flat_no, f.owner_name,
              mc.interest_amount, mc.interest_paid, mc.interest_balance,
              mc.penalty_charge
       FROM maintenance_charges mc
       JOIN flats f ON f.id = mc.flat_id
       WHERE mc.society_id = ? AND mc.period_month BETWEEN ? AND ?
             AND (mc.interest_amount > 0 OR mc.penalty_charge > 0)
       ORDER BY mc.period_month DESC, f.wing, f.flat_no`,
      [societyId, from, to]
    );
    return rows;
  }

  if (type === "noc") {
    const [rows] = await db.query(
      `SELECT mc.period_month, f.wing, f.flat_no, f.owner_name,
              mc.noc_charge, mc.noc_paid, mc.noc_balance
       FROM maintenance_charges mc
       JOIN flats f ON f.id = mc.flat_id
       WHERE mc.society_id = ? AND mc.period_month BETWEEN ? AND ?
             AND mc.noc_charge > 0
       ORDER BY mc.period_month DESC, f.wing, f.flat_no`,
      [societyId, from, to]
    );
    return rows;
  }

  if (type === "yearly") {
    const [[summary]] = await db.query(
      `SELECT YEAR(?) AS report_year,
              SUM(maintenance_paid) AS maintenance_collection,
              SUM(noc_paid) AS noc_collection,
              SUM(interest_paid) AS interest_collection,
              SUM(total_paid) AS grand_total_collection,
              SUM(total_balance) AS outstanding_balances
       FROM maintenance_charges
       WHERE society_id = ? AND period_month BETWEEN ? AND ?`,
      [from, societyId, from, to]
    );
    const [monthWise] = await db.query(
      `SELECT DATE_FORMAT(period_month, '%Y-%m') AS month,
              SUM(maintenance_paid) AS maintenance_collection,
              SUM(noc_paid) AS noc_collection,
              SUM(interest_paid) AS interest_collection,
              SUM(total_paid) AS grand_total_collection,
              SUM(total_balance) AS outstanding_balances
       FROM maintenance_charges
       WHERE society_id = ? AND period_month BETWEEN ? AND ?
       GROUP BY period_month
       ORDER BY period_month`,
      [societyId, from, to]
    );
    const [flatWise] = await db.query(
      `SELECT f.wing, f.flat_no, f.owner_name,
              SUM(mc.maintenance_paid) AS maintenance_collection,
              SUM(mc.noc_paid) AS noc_collection,
              SUM(mc.interest_paid) AS interest_collection,
              SUM(mc.total_paid) AS grand_total_collection,
              SUM(mc.maintenance_balance) AS maintenance_balance,
              SUM(mc.noc_balance) AS noc_balance,
              SUM(mc.interest_balance) AS interest_balance,
              SUM(mc.total_balance) AS outstanding_balance
       FROM maintenance_charges mc
       JOIN flats f ON f.id = mc.flat_id
       WHERE mc.society_id = ? AND mc.period_month BETWEEN ? AND ?
       GROUP BY f.id, f.wing, f.flat_no, f.owner_name
       ORDER BY f.wing, f.flat_no`,
      [societyId, from, to]
    );
    return [
      { section: "Year Summary", ...summary },
      ...monthWise.map((row) => ({ section: "Month-wise Breakdown", ...row })),
      ...flatWise.map((row) => ({ section: "Flat-wise Breakdown", ...row })),
    ];
  }

  if (type === "flat-ledger") {
    const [rows] = await db.query(
      `SELECT entry_date, period_month, entry_type, description,
              debit_amount, credit_amount, balance_after
       FROM maintenance_ledger_entries
       WHERE society_id = ? AND flat_id = ?
       ORDER BY entry_date ASC, id ASC`,
      [societyId, flatId]
    );
    return rows;
  }

  const [rows] = await db.query(
    `SELECT mc.period_month,
            COUNT(DISTINCT mc.flat_id) AS flats_billed,
            SUM(mc.maintenance_charge + mc.penalty_charge) AS maintenance_billed,
            SUM(mc.noc_charge) AS noc_billed,
            SUM(mc.interest_amount) AS interest_billed,
            SUM(mc.total_due) AS billed,
            SUM(mc.maintenance_paid) AS maintenance_collection,
            SUM(mc.noc_paid) AS noc_collection,
            SUM(mc.interest_paid) AS interest_collection,
            SUM(mc.total_paid) AS grand_total_collection,
            SUM(mc.total_balance) AS outstanding,
            COUNT(DISTINCT CASE WHEN mc.total_paid > 0 THEN mc.flat_id END) AS flats_paid,
            COUNT(DISTINCT CASE WHEN mc.total_balance > 0 THEN mc.flat_id END) AS flats_pending
     FROM maintenance_charges mc
     WHERE mc.society_id = ? AND mc.period_month BETWEEN ? AND ?
     GROUP BY mc.period_month
     ORDER BY mc.period_month DESC`,
    [societyId, from, to]
  );
  return rows;
};

export const exportMaintenanceReport = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  const type = req.query.type || "month-wise";
  const format = req.query.format || "xlsx";
  const selectedMonth =
    req.query.month && req.query.year
      ? `${req.query.year}-${String(req.query.month).padStart(2, "0")}-01`
      : null;
  const from = selectedMonth || (req.query.from ? firstDay(req.query.from) : "1900-01-01");
  const requestedTo = selectedMonth || (req.query.to ? firstDay(req.query.to) : "2999-12-01");
  const to = shouldIncludeFuture(req)
    ? requestedTo
    : requestedTo < currentMonthStart()
      ? requestedTo
      : currentMonthStart();
  const flatId = req.query.flat_id ? Number(req.query.flat_id) : null;

  try {
    if (type === "flat-ledger" && !flatId) {
      return res.status(400).json({ success: false, message: "flat_id is required for flat ledger export" });
    }
    const rows = await reportRows(societyId, type, from, to, flatId);
    const fileName = `maintenance-${type}-${new Date().toISOString().slice(0, 10)}`;
    if (format === "pdf") return setPdfResponse(res, fileName, `Maintenance ${type} report`, rows);
    return setExcelResponse(res, fileName, rows, "Maintenance");
  } catch (error) {
    console.error("EXPORT MAINTENANCE REPORT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to export maintenance report" });
  }
};

export const exportFlatLedger = async (req, res) => {
  req.query.type = "flat-ledger";
  req.query.flat_id = req.params.flatId;
  return exportMaintenanceReport(req, res);
};

export const recalculateInterest = async (req, res) => {
  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  const asOf = req.body.as_of ? new Date(req.body.as_of) : new Date();

  try {
    const rule = await getActiveRule(societyId);
    const [dues] = await db.query(
      `SELECT id, period_month, maintenance_charge, noc_charge, penalty_charge,
              maintenance_paid, noc_balance, interest_paid
       FROM maintenance_charges
       WHERE society_id = ? AND status <> 'paid' AND period_month <= ?`,
      [societyId, currentMonthStart()]
    );

    let updated = 0;
    await db.beginTransaction();
    for (const due of dues) {
      const period = new Date(due.period_month);
      const monthsLate = Math.max(
        0,
        (asOf.getFullYear() - period.getFullYear()) * 12 + (asOf.getMonth() - period.getMonth())
      );
      const graceMet = asOf.getDate() > Number(rule.interest_grace_days || 0);
      if (!monthsLate || !graceMet) continue;

      let base = Number(due.maintenance_charge) + Number(due.penalty_charge || 0) - Number(due.maintenance_paid || 0);
      if (rule.interest_apply_to === "total_outstanding") {
        base += Number(due.noc_charge || 0);
      }
      const rate = Number(rule.interest_rate_monthly || 0) / 100;
      let interest = rule.interest_method === "compound_monthly"
        ? base * (Math.pow(1 + rate, monthsLate) - 1)
        : base * rate * monthsLate;
      if (rule.interest_method === "fixed_penalty") interest = Number(rule.interest_rate_monthly || 0) * monthsLate;
      interest = Math.max(roundByRule(interest, rule.rounding_mode), 0);
      const interestBalance = Math.max(interest - Number(due.interest_paid || 0), 0);

      await db.query(
        `UPDATE maintenance_charges
         SET interest_amount = ?,
             total_due = maintenance_charge + noc_charge + penalty_charge + ?,
             interest_balance = ?,
             total_balance = maintenance_balance + noc_balance + ?,
             status = CASE WHEN maintenance_balance + noc_balance + ? <= 0 THEN 'paid' ELSE status END
         WHERE id = ?`,
        [interest, interest, interestBalance, interestBalance, interestBalance, due.id]
      );
      updated += 1;
    }
    await audit(societyId, adminId, "recalculate", "maintenance_interest", null, null, {
      as_of: asOf.toISOString().slice(0, 10),
      updated,
    });
    await db.commit();
    return res.status(200).json({ success: true, message: "Interest recalculated", updated });
  } catch (error) {
    await db.rollback();
    console.error("RECALCULATE INTEREST ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to recalculate interest" });
  }
};

const sheetRows = (buffer, originalname) => {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    raw: false,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }).map((row) =>
    row.map((cell) => (cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell).trim()))
  );
};

const ownerFromRows = (rows) => {
  for (const row of rows.slice(0, 15)) {
    const joined = row.join(" ");
    const match = joined.match(/Name of the Flat Owner:\s*(.+)$/i);
    if (match) return match[1].trim();
  }
  return "";
};

const parseImportRows = (rows) => {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => /^\d+$/.test(String(row[0] || "").trim()) && firstDay(row[1]))
    .map(({ row, index }) => ({
      source_row: index + 1,
      month: firstDay(row[1]),
      maintenance_charge: amount(row[2]),
      total_maintenance_due: amount(row[3]),
      interest_rate_percent: amount(row[4]),
      interest_amount: amount(row[5]),
      maintenance_paid: amount(row[6]),
      interest_paid: amount(row[7]),
      maintenance_balance: amount(row[8]),
      interest_balance: amount(row[9]),
      total_balance: amount(row[10]),
    }));
};

export const importMaintenanceExcel = async (req, res) => {
  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  if (!req.file) return res.status(400).json({ success: false, message: "Excel file is required" });

  try {
    const rows = sheetRows(req.file.buffer, req.file.originalname);
    const ownerName = req.body.owner_name || ownerFromRows(rows);
    const flatId = req.body.flat_id ? Number(req.body.flat_id) : null;
    const importRows = parseImportRows(rows);

    if (!flatId && !ownerName) {
      return res.status(400).json({
        success: false,
        message: "Provide flat_id or include flat owner name in the sheet",
      });
    }

    const [flats] = flatId
      ? await db.query(`SELECT id FROM flats WHERE id = ? AND society_id = ?`, [flatId, societyId])
      : await db.query(
          `SELECT id FROM flats WHERE society_id = ? AND owner_name LIKE ? ORDER BY status = 'active' DESC LIMIT 1`,
          [societyId, `%${ownerName}%`]
        );

    if (flats.length === 0) {
      return res.status(404).json({ success: false, message: "Matching flat not found for import" });
    }
    if (importRows.length === 0) {
      return res.status(400).json({ success: false, message: "No maintenance rows found in Excel" });
    }

    await db.beginTransaction();
    const [batch] = await db.query(
      `INSERT INTO maintenance_import_batches
       (batch_code, society_id, admin_id, file_name, total_rows, status)
       VALUES (?, ?, ?, ?, ?, 'processing')`,
      [prefixedNanoId("MIB"), societyId, adminId, req.file.originalname, importRows.length]
    );

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    for (const row of importRows) {
      try {
        const [[existing]] = await db.query(
          `SELECT id FROM maintenance_charges
           WHERE society_id = ? AND flat_id = ? AND period_month = ?
           LIMIT 1`,
          [societyId, flats[0].id, row.month]
        );
        const maintenanceCharge = row.maintenance_charge || row.total_maintenance_due || 0;
        const { chargeId, totalDue } = await upsertCharge({
          societyId,
          adminId,
          flatId: flats[0].id,
          periodMonth: row.month,
          maintenanceCharge,
          interestAmount: row.interest_amount,
          maintenancePaid: row.maintenance_paid,
          interestPaid: row.interest_paid,
          source: "import",
          notes: `Imported from ${req.file.originalname}`,
        });
        if (!existing) {
          await addLedgerEntry({
            societyId,
            adminId,
            flatId: flats[0].id,
            chargeId,
            entryDate: new Date().toISOString().slice(0, 10),
            periodMonth: row.month,
            entryType: "charge",
            description: `Imported maintenance bill for ${row.month.slice(0, 7)}`,
            debitAmount: totalDue,
          });
        }
        if (existing) {
          updated += 1;
        } else {
          inserted += 1;
        }
        await db.query(
          `INSERT INTO maintenance_import_errors
           (batch_id, row_no, status, raw_data)
           VALUES (?, ?, 'success', ?)`,
          [batch.insertId, row.source_row, JSON.stringify(row)]
        );
      } catch (error) {
        failed += 1;
        await db.query(
          `INSERT INTO maintenance_import_errors
           (batch_id, row_no, status, error_message, raw_data)
           VALUES (?, ?, 'failed', ?, ?)`,
          [batch.insertId, row.source_row, error.message, JSON.stringify(row)]
        );
      }
    }

    await db.query(
      `UPDATE maintenance_import_batches
       SET inserted_rows = ?, updated_rows = ?, failed_rows = ?, status = ?
       WHERE id = ?`,
      [inserted, updated, failed, failed ? "completed_with_errors" : "completed", batch.insertId]
    );
    await audit(societyId, adminId, "import", "maintenance_import_batch", batch.insertId, null, {
      file: req.file.originalname,
      inserted,
      updated,
      failed,
    });
    await db.commit();
    return res.status(201).json({
      success: true,
      message: "Maintenance import completed",
      data: {
        batch_id: batch.insertId,
        total_rows: importRows.length,
        inserted_rows: inserted,
        updated_rows: updated,
        failed_rows: failed,
      },
    });
  } catch (error) {
    await db.rollback();
    console.error("IMPORT MAINTENANCE EXCEL ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to import maintenance Excel" });
  }
};

export const getImportBatches = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;

  try {
    const [rows] = await db.query(
      `SELECT id, batch_code, file_name, total_rows, inserted_rows, updated_rows,
              failed_rows, status, created_at
       FROM maintenance_import_batches
       WHERE society_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [societyId]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("GET IMPORT BATCHES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch import logs" });
  }
};
