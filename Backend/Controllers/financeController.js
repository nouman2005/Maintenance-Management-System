import { validationResult } from "express-validator";
import db from "../Config/db.js";
import { prefixedNanoId } from "../Utils/nanoId.js";
import {
  createExpenseDebit,
  ensureAdminSociety,
  getAccountBalances,
  getDashboardSummary,
  getScope,
  normalizeDate,
  reverseExpenseDebit,
  toMoney,
} from "../Services/financeService.js";

const validationError = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ success: false, errors: errors.array() });
  return true;
};

const nullable = (value) => (value === "" || value === undefined ? null : value);

const nextExpenseNumber = () =>
  `EXP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

const auditExpense = async ({
  connection = db,
  societyId,
  adminId,
  expenseId,
  action,
  beforeData = null,
  afterData = null,
}) => {
  await connection.query(
    `INSERT INTO expense_audit_logs
     (society_id, admin_id, expense_id, action, before_data, after_data)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      societyId,
      adminId,
      expenseId,
      action,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
    ],
  );
};

const buildExpenseWhere = (query, societyId) => {
  const params = [societyId];
  let where = "WHERE e.society_id = ?";

  if (query.from) {
    where += " AND e.expense_date >= ?";
    params.push(query.from);
  }
  if (query.to) {
    where += " AND e.expense_date <= ?";
    params.push(query.to);
  }
  if (query.month) {
    where += " AND DATE_FORMAT(e.expense_date, '%Y-%m') = ?";
    params.push(query.month);
  }
  if (query.year) {
    where += " AND YEAR(e.expense_date) = ?";
    params.push(query.year);
  }
  if (query.category_id) {
    where += " AND e.category_id = ?";
    params.push(query.category_id);
  }
  if (query.vendor_id) {
    where += " AND e.vendor_id = ?";
    params.push(query.vendor_id);
  }
  if (query.payment_mode) {
    where += " AND e.payment_mode = ?";
    params.push(query.payment_mode);
  }
  if (query.payment_account_id) {
    where += " AND e.payment_account_id = ?";
    params.push(query.payment_account_id);
  }
  if (query.status) {
    where += " AND e.status = ?";
    params.push(query.status);
  }

  return { where, params };
};

const findActive = async (connection, table, id, societyId, label) => {
  if (!id) return null;
  const [[row]] = await connection.query(
    `SELECT * FROM ${table}
     WHERE id = ? AND society_id = ? AND status = 'active'
     LIMIT 1`,
    [id, societyId],
  );
  if (!row) {
    const error = new Error(`${label} is inactive or not found`);
    error.status = 400;
    throw error;
  }
  return row;
};

const normalizeExpensePayload = (body) => ({
  expense_date: normalizeDate(body.expense_date),
  category_id: body.category_id,
  sub_category: nullable(body.sub_category),
  vendor_id: nullable(body.vendor_id),
  paid_to: nullable(body.paid_to),
  description: body.description,
  amount: toMoney(body.amount),
  invoice_number: nullable(body.invoice_number),
  invoice_date: normalizeDate(body.invoice_date),
  payment_mode: body.payment_mode,
  payment_account_id: nullable(body.payment_account_id),
  reference_no: nullable(body.reference_no),
  cheque_number: nullable(body.cheque_number),
  cheque_date: normalizeDate(body.cheque_date),
  status: body.status || "pending",
  notes: nullable(body.notes),
});

export const listExpenseCategories = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const [rows] = await db.query(
      `SELECT * FROM expense_categories
       WHERE society_id = ?
       ORDER BY status = 'inactive', category_name`,
      [societyId],
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("LIST EXPENSE CATEGORIES ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load categories" });
  }
};

export const createExpenseCategory = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    await db.query(
      `INSERT INTO expense_categories
       (category_code, society_id, admin_id, category_name, description, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        prefixedNanoId("ECAT"),
        societyId,
        adminId,
        req.body.category_name,
        nullable(req.body.description),
        req.body.status || "active",
      ],
    );
    res.status(201).json({ success: true, message: "Category saved successfully" });
  } catch (error) {
    console.error("CREATE EXPENSE CATEGORY ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to save category" });
  }
};

export const updateExpenseCategory = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const [result] = await db.query(
      `UPDATE expense_categories
       SET category_name = ?, description = ?, status = COALESCE(?, status)
       WHERE id = ? AND society_id = ?`,
      [
        req.body.category_name,
        nullable(req.body.description),
        req.body.status || null,
        req.params.id,
        societyId,
      ],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.status(200).json({ success: true, message: "Category updated successfully" });
  } catch (error) {
    console.error("UPDATE EXPENSE CATEGORY ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to update category" });
  }
};

export const updateExpenseCategoryStatus = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const [result] = await db.query(
      `UPDATE expense_categories SET status = ? WHERE id = ? AND society_id = ?`,
      [req.body.status || "inactive", req.params.id, societyId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.status(200).json({ success: true, message: "Category status updated" });
  } catch (error) {
    console.error("UPDATE CATEGORY STATUS ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to update category status" });
  }
};

export const listVendors = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const [rows] = await db.query(
      `SELECT * FROM vendors
       WHERE society_id = ?
       ORDER BY status = 'inactive', vendor_name`,
      [societyId],
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("LIST VENDORS ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load vendors" });
  }
};

export const createVendor = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    await db.query(
      `INSERT INTO vendors
       (vendor_code, society_id, admin_id, vendor_name, contact_person, phone,
        email, address, gst_number, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prefixedNanoId("VEN"),
        societyId,
        adminId,
        req.body.vendor_name,
        nullable(req.body.contact_person),
        nullable(req.body.phone),
        nullable(req.body.email),
        nullable(req.body.address),
        nullable(req.body.gst_number),
        nullable(req.body.notes),
        req.body.status || "active",
      ],
    );
    res.status(201).json({ success: true, message: "Vendor saved successfully" });
  } catch (error) {
    console.error("CREATE VENDOR ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to save vendor" });
  }
};

export const updateVendor = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const [result] = await db.query(
      `UPDATE vendors
       SET vendor_name = ?, contact_person = ?, phone = ?, email = ?,
           address = ?, gst_number = ?, notes = ?, status = COALESCE(?, status)
       WHERE id = ? AND society_id = ?`,
      [
        req.body.vendor_name,
        nullable(req.body.contact_person),
        nullable(req.body.phone),
        nullable(req.body.email),
        nullable(req.body.address),
        nullable(req.body.gst_number),
        nullable(req.body.notes),
        req.body.status || null,
        req.params.id,
        societyId,
      ],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    res.status(200).json({ success: true, message: "Vendor updated successfully" });
  } catch (error) {
    console.error("UPDATE VENDOR ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to update vendor" });
  }
};

export const updateVendorStatus = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const [result] = await db.query(
      `UPDATE vendors SET status = ? WHERE id = ? AND society_id = ?`,
      [req.body.status || "inactive", req.params.id, societyId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    res.status(200).json({ success: true, message: "Vendor status updated" });
  } catch (error) {
    console.error("UPDATE VENDOR STATUS ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to update vendor status" });
  }
};

export const listPaymentAccounts = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const rows = await getAccountBalances(societyId);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("LIST PAYMENT ACCOUNTS ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load payment accounts" });
  }
};

export const createPaymentAccount = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    await db.beginTransaction();
    const [result] = await db.query(
      `INSERT INTO payment_accounts
       (account_code, society_id, admin_id, account_name, account_type,
        bank_name, masked_account_number, opening_balance, opening_balance_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?)`,
      [
        prefixedNanoId("ACC"),
        societyId,
        adminId,
        req.body.account_name,
        req.body.account_type,
        nullable(req.body.bank_name),
        nullable(req.body.masked_account_number),
        toMoney(req.body.opening_balance),
        normalizeDate(req.body.opening_balance_date),
        req.body.status || "active",
      ],
    );
    await db.query(
      `INSERT INTO financial_transactions
       (transaction_code, society_id, admin_id, payment_account_id,
        transaction_date, transaction_type, source_type, source_id, description,
        debit_amount, credit_amount, status)
       VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_DATE), 'opening',
        'opening_balance', ?, ?, 0.00, 0.00, 'posted')`,
      [
        prefixedNanoId("FTX"),
        societyId,
        adminId,
        result.insertId,
        normalizeDate(req.body.opening_balance_date),
        result.insertId,
        `Opening balance for ${req.body.account_name}`,
      ],
    );
    await db.commit();
    res.status(201).json({ success: true, message: "Payment account saved successfully" });
  } catch (error) {
    await db.rollback();
    console.error("CREATE PAYMENT ACCOUNT ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to save payment account" });
  }
};

export const updatePaymentAccount = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const [result] = await db.query(
      `UPDATE payment_accounts
       SET account_name = ?, account_type = ?, bank_name = ?,
           masked_account_number = ?, status = COALESCE(?, status)
       WHERE id = ? AND society_id = ?`,
      [
        req.body.account_name,
        req.body.account_type,
        nullable(req.body.bank_name),
        nullable(req.body.masked_account_number),
        req.body.status || null,
        req.params.id,
        societyId,
      ],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Payment account not found" });
    }
    res.status(200).json({ success: true, message: "Payment account updated successfully" });
  } catch (error) {
    console.error("UPDATE PAYMENT ACCOUNT ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to update payment account" });
  }
};

export const updatePaymentAccountStatus = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const [result] = await db.query(
      `UPDATE payment_accounts SET status = ? WHERE id = ? AND society_id = ?`,
      [req.body.status || "inactive", req.params.id, societyId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Payment account not found" });
    }
    res.status(200).json({ success: true, message: "Payment account status updated" });
  } catch (error) {
    console.error("UPDATE ACCOUNT STATUS ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to update account status" });
  }
};

export const listExpenses = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const offset = (page - 1) * limit;
  const { where, params } = buildExpenseWhere(req.query, societyId);

  try {
    const [rows] = await db.query(
      `SELECT e.*, ec.category_name, v.vendor_name, pa.account_name
       FROM expenses e
       JOIN expense_categories ec ON ec.id = e.category_id
       LEFT JOIN vendors v ON v.id = e.vendor_id
       LEFT JOIN payment_accounts pa ON pa.id = e.payment_account_id
       ${where}
       ORDER BY e.expense_date DESC, e.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM expenses e
       JOIN expense_categories ec ON ec.id = e.category_id
       LEFT JOIN vendors v ON v.id = e.vendor_id
       LEFT JOIN payment_accounts pa ON pa.id = e.payment_account_id
       ${where}`,
      params,
    );
    res.status(200).json({
      success: true,
      data: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("LIST EXPENSES ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load expenses" });
  }
};

export const getExpenseById = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const [[expense]] = await db.query(
      `SELECT e.*, ec.category_name, v.vendor_name, pa.account_name,
              ft.id AS financial_transaction_id
       FROM expenses e
       JOIN expense_categories ec ON ec.id = e.category_id
       LEFT JOIN vendors v ON v.id = e.vendor_id
       LEFT JOIN payment_accounts pa ON pa.id = e.payment_account_id
       LEFT JOIN financial_transactions ft
         ON ft.source_type = 'expense' AND ft.source_id = e.id
       WHERE e.id = ? AND e.society_id = ?
       LIMIT 1`,
      [req.params.id, societyId],
    );
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }
    const [audit] = await db.query(
      `SELECT * FROM expense_audit_logs
       WHERE expense_id = ? AND society_id = ?
       ORDER BY created_at DESC`,
      [req.params.id, societyId],
    );
    res.status(200).json({ success: true, data: { expense, audit } });
  } catch (error) {
    console.error("GET EXPENSE ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load expense" });
  }
};

export const createExpense = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  const payload = normalizeExpensePayload(req.body);

  try {
    await db.beginTransaction();
    await findActive(db, "expense_categories", payload.category_id, societyId, "Category");
    if (payload.vendor_id) {
      await findActive(db, "vendors", payload.vendor_id, societyId, "Vendor");
    }
    if (payload.status === "paid") {
      await findActive(db, "payment_accounts", payload.payment_account_id, societyId, "Payment account");
    }

    const [result] = await db.query(
      `INSERT INTO expenses
       (expense_number, society_id, admin_id, expense_date, category_id,
        sub_category, vendor_id, paid_to, description, amount, invoice_number,
        invoice_date, payment_mode, payment_account_id, reference_no,
        cheque_number, cheque_date, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextExpenseNumber(),
        societyId,
        adminId,
        payload.expense_date,
        payload.category_id,
        payload.sub_category,
        payload.vendor_id,
        payload.paid_to,
        payload.description,
        payload.amount,
        payload.invoice_number,
        payload.invoice_date,
        payload.payment_mode,
        payload.payment_account_id,
        payload.reference_no,
        payload.cheque_number,
        payload.cheque_date,
        payload.status,
        payload.notes,
      ],
    );

    const [[expense]] = await db.query(
      `SELECT * FROM expenses WHERE id = ? LIMIT 1`,
      [result.insertId],
    );
    if (payload.status === "paid") {
      await createExpenseDebit({ connection: db, societyId, adminId, expense });
    }
    await auditExpense({
      connection: db,
      societyId,
      adminId,
      expenseId: result.insertId,
      action: "create",
      afterData: expense,
    });
    await db.commit();
    res.status(201).json({
      success: true,
      message: "Expense saved successfully",
      data: expense,
    });
  } catch (error) {
    await db.rollback();
    console.error("CREATE EXPENSE ERROR:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Unable to save expense",
    });
  }
};

export const updateExpense = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  const payload = normalizeExpensePayload(req.body);

  try {
    await db.beginTransaction();
    const [[existing]] = await db.query(
      `SELECT * FROM expenses WHERE id = ? AND society_id = ? LIMIT 1`,
      [req.params.id, societyId],
    );
    if (!existing) {
      await db.rollback();
      return res.status(404).json({ success: false, message: "Expense not found" });
    }
    if (existing.status === "paid" || existing.status === "cancelled") {
      await db.rollback();
      return res.status(400).json({
        success: false,
        message: "Paid or cancelled expenses cannot be edited directly",
      });
    }

    await findActive(db, "expense_categories", payload.category_id, societyId, "Category");
    if (payload.vendor_id) {
      await findActive(db, "vendors", payload.vendor_id, societyId, "Vendor");
    }
    if (payload.status === "paid") {
      await findActive(db, "payment_accounts", payload.payment_account_id, societyId, "Payment account");
    }

    await db.query(
      `UPDATE expenses
       SET expense_date = ?, category_id = ?, sub_category = ?, vendor_id = ?,
           paid_to = ?, description = ?, amount = ?, invoice_number = ?,
           invoice_date = ?, payment_mode = ?, payment_account_id = ?,
           reference_no = ?, cheque_number = ?, cheque_date = ?, status = ?,
           notes = ?, updated_by_admin_id = ?
       WHERE id = ? AND society_id = ?`,
      [
        payload.expense_date,
        payload.category_id,
        payload.sub_category,
        payload.vendor_id,
        payload.paid_to,
        payload.description,
        payload.amount,
        payload.invoice_number,
        payload.invoice_date,
        payload.payment_mode,
        payload.payment_account_id,
        payload.reference_no,
        payload.cheque_number,
        payload.cheque_date,
        payload.status,
        payload.notes,
        adminId,
        req.params.id,
        societyId,
      ],
    );
    const [[updated]] = await db.query(`SELECT * FROM expenses WHERE id = ?`, [req.params.id]);
    if (payload.status === "paid") {
      await createExpenseDebit({ connection: db, societyId, adminId, expense: updated });
    }
    await auditExpense({
      connection: db,
      societyId,
      adminId,
      expenseId: req.params.id,
      action: "update",
      beforeData: existing,
      afterData: updated,
    });
    await db.commit();
    res.status(200).json({ success: true, message: "Expense updated successfully", data: updated });
  } catch (error) {
    await db.rollback();
    console.error("UPDATE EXPENSE ERROR:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Unable to update expense",
    });
  }
};

export const updateExpenseStatus = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  const nextStatus = req.body.status;

  try {
    await db.beginTransaction();
    const [[expense]] = await db.query(
      `SELECT * FROM expenses WHERE id = ? AND society_id = ? LIMIT 1`,
      [req.params.id, societyId],
    );
    if (!expense) {
      await db.rollback();
      return res.status(404).json({ success: false, message: "Expense not found" });
    }
    if (expense.status === "cancelled") {
      await db.rollback();
      return res.status(400).json({ success: false, message: "Cancelled expenses cannot be changed" });
    }
    if (expense.status === "paid" && nextStatus !== "cancelled") {
      await db.rollback();
      return res.status(400).json({ success: false, message: "Paid expenses can only be cancelled" });
    }

    const merged = {
      ...expense,
      status: nextStatus,
      payment_account_id: req.body.payment_account_id || expense.payment_account_id,
      payment_mode: req.body.payment_mode || expense.payment_mode,
      reference_no: nullable(req.body.reference_no) || expense.reference_no,
      cheque_number: nullable(req.body.cheque_number) || expense.cheque_number,
      cheque_date: normalizeDate(req.body.cheque_date) || expense.cheque_date,
      notes: nullable(req.body.notes) || expense.notes,
    };

    if (nextStatus === "paid") {
      await findActive(db, "payment_accounts", merged.payment_account_id, societyId, "Payment account");
      const [[existingTransaction]] = await db.query(
        `SELECT id FROM financial_transactions
         WHERE society_id = ? AND source_type = 'expense' AND source_id = ?
         LIMIT 1`,
        [societyId, expense.id],
      );
      if (!existingTransaction) {
        await createExpenseDebit({ connection: db, societyId, adminId, expense: merged });
      }
    }

    await db.query(
      `UPDATE expenses
       SET status = ?, payment_account_id = ?, payment_mode = ?, reference_no = ?,
           cheque_number = ?, cheque_date = ?, notes = ?, updated_by_admin_id = ?
       WHERE id = ? AND society_id = ?`,
      [
        merged.status,
        merged.payment_account_id,
        merged.payment_mode,
        merged.reference_no,
        merged.cheque_number,
        merged.cheque_date,
        merged.notes,
        adminId,
        expense.id,
        societyId,
      ],
    );
    await auditExpense({
      connection: db,
      societyId,
      adminId,
      expenseId: expense.id,
      action: `status:${nextStatus}`,
      beforeData: expense,
      afterData: merged,
    });
    await db.commit();
    res.status(200).json({ success: true, message: "Expense status updated" });
  } catch (error) {
    await db.rollback();
    console.error("UPDATE EXPENSE STATUS ERROR:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Unable to update expense status",
    });
  }
};

export const cancelExpense = async (req, res) => {
  const { societyId, adminId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    await db.beginTransaction();
    const [[expense]] = await db.query(
      `SELECT * FROM expenses WHERE id = ? AND society_id = ? LIMIT 1`,
      [req.params.id, societyId],
    );
    if (!expense) {
      await db.rollback();
      return res.status(404).json({ success: false, message: "Expense not found" });
    }
    if (expense.status === "cancelled") {
      await db.rollback();
      return res.status(400).json({ success: false, message: "Expense is already cancelled" });
    }

    if (expense.status === "paid") {
      const [[transaction]] = await db.query(
        `SELECT id FROM financial_transactions
         WHERE society_id = ? AND source_type = 'expense' AND source_id = ?
           AND status = 'posted' AND reversed_by_transaction_id IS NULL
         LIMIT 1`,
        [societyId, expense.id],
      );
      if (transaction) {
        await reverseExpenseDebit({
          connection: db,
          societyId,
          adminId,
          expense,
          originalTransactionId: transaction.id,
        });
      }
    }

    await db.query(
      `UPDATE expenses
       SET status = 'cancelled', cancellation_reason = ?, cancelled_at = NOW(),
           updated_by_admin_id = ?
       WHERE id = ? AND society_id = ?`,
      [nullable(req.body.reason), adminId, expense.id, societyId],
    );
    await auditExpense({
      connection: db,
      societyId,
      adminId,
      expenseId: expense.id,
      action: "cancel",
      beforeData: expense,
      afterData: { reason: nullable(req.body.reason) },
    });
    await db.commit();
    res.status(200).json({ success: true, message: "Expense cancelled successfully" });
  } catch (error) {
    await db.rollback();
    console.error("CANCEL EXPENSE ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to cancel expense" });
  }
};

export const getFinanceDashboard = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    const summary = await getDashboardSummary({ societyId, from, to });
    const [recentExpenses] = await db.query(
      `SELECT e.id, e.expense_number, e.expense_date, e.amount, e.payment_mode,
              e.status, e.description, ec.category_name, v.vendor_name,
              pa.account_name
       FROM expenses e
       JOIN expense_categories ec ON ec.id = e.category_id
       LEFT JOIN vendors v ON v.id = e.vendor_id
       LEFT JOIN payment_accounts pa ON pa.id = e.payment_account_id
       WHERE e.society_id = ?
       ORDER BY e.expense_date DESC, e.id DESC
       LIMIT 8`,
      [societyId],
    );
    const [monthly] = await db.query(
      `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month,
              COALESCE(SUM(credit_amount), 0) AS income,
              COALESCE(SUM(debit_amount), 0) AS expense
       FROM financial_transactions
       WHERE society_id = ? AND status = 'posted'
       GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
      [societyId],
    );
    const [categoryBreakdown] = await db.query(
      `SELECT ec.category_name, COALESCE(SUM(e.amount), 0) AS amount
       FROM expenses e
       JOIN expense_categories ec ON ec.id = e.category_id
       WHERE e.society_id = ? AND e.status = 'paid'
       GROUP BY ec.id, ec.category_name
       ORDER BY amount DESC
       LIMIT 8`,
      [societyId],
    );
    const [paymentModeBreakdown] = await db.query(
      `SELECT payment_mode, COALESCE(SUM(amount), 0) AS amount
       FROM expenses
       WHERE society_id = ? AND status = 'paid'
       GROUP BY payment_mode
       ORDER BY amount DESC`,
      [societyId],
    );
    res.status(200).json({
      success: true,
      data: { summary, recentExpenses, monthly, categoryBreakdown, paymentModeBreakdown },
    });
  } catch (error) {
    console.error("GET FINANCE DASHBOARD ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load finance dashboard" });
  }
};

export const getFinancialLedger = async (req, res) => {
  if (validationError(req, res)) return;
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  const params = [societyId];
  let where = "WHERE ft.society_id = ? AND ft.status = 'posted'";
  if (req.query.from) {
    where += " AND ft.transaction_date >= ?";
    params.push(req.query.from);
  }
  if (req.query.to) {
    where += " AND ft.transaction_date <= ?";
    params.push(req.query.to);
  }
  if (req.query.payment_account_id) {
    where += " AND ft.payment_account_id = ?";
    params.push(req.query.payment_account_id);
  }
  try {
    const [rows] = await db.query(
      `SELECT ft.*, pa.account_name,
              pa.opening_balance
                + SUM(ft.credit_amount - ft.debit_amount)
                  OVER (PARTITION BY ft.payment_account_id
                        ORDER BY ft.transaction_date, ft.id) AS running_balance
       FROM financial_transactions ft
       JOIN payment_accounts pa ON pa.id = ft.payment_account_id
       ${where}
       ORDER BY ft.transaction_date DESC, ft.id DESC`,
      params,
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("GET FINANCIAL LEDGER ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load financial ledger" });
  }
};

export const getFinanceSummary = async (req, res) => {
  const { societyId } = getScope(req);
  if (ensureAdminSociety(res, societyId)) return;
  try {
    const [monthly] = await db.query(
      `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS period,
              COALESCE(SUM(credit_amount), 0) AS income,
              COALESCE(SUM(debit_amount), 0) AS expenses,
              COALESCE(SUM(credit_amount - debit_amount), 0) AS net
       FROM financial_transactions
       WHERE society_id = ? AND status = 'posted'
       GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
       ORDER BY period DESC`,
      [societyId],
    );
    const [category] = await db.query(
      `SELECT ec.category_name, COALESCE(SUM(e.amount), 0) AS amount
       FROM expenses e
       JOIN expense_categories ec ON ec.id = e.category_id
       WHERE e.society_id = ? AND e.status = 'paid'
       GROUP BY ec.id, ec.category_name
       ORDER BY amount DESC`,
      [societyId],
    );
    const [paymentMode] = await db.query(
      `SELECT payment_mode, COALESCE(SUM(amount), 0) AS amount
       FROM expenses
       WHERE society_id = ? AND status = 'paid'
       GROUP BY payment_mode
       ORDER BY amount DESC`,
      [societyId],
    );
    const accounts = await getAccountBalances(societyId);
    res.status(200).json({ success: true, data: { monthly, category, paymentMode, accounts } });
  } catch (error) {
    console.error("GET FINANCE SUMMARY ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load finance summary" });
  }
};
