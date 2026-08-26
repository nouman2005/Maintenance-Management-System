import db from "../Config/db.js";
import { prefixedNanoId } from "../Utils/nanoId.js";

export const PAYMENT_MODES = [
  "cash",
  "cheque",
  "bank_transfer",
  "upi",
  "online",
  "card",
  "adjustment",
  "other",
];

export const EXPENSE_STATUSES = [
  "draft",
  "pending",
  "approved",
  "paid",
  "cancelled",
];

const tableMissing = (error) =>
  ["ER_NO_SUCH_TABLE", "ER_BAD_TABLE_ERROR"].includes(error?.code);

export const normalizeDate = (value) => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

export const toMoney = (value) => Number(value || 0).toFixed(2);

export const getScope = (req) => ({
  societyId: req.user?.society_id,
  adminId: req.user?.id,
});

export const ensureAdminSociety = (res, societyId) => {
  if (societyId) return false;
  res.status(400).json({
    success: false,
    message: "Admin society is missing. Please login again.",
  });
  return true;
};

export const defaultAccountNameForMode = (paymentMode) =>
  paymentMode === "cash" ? "Society Cash" : "Primary Bank Account";

export const ensureDefaultPaymentAccount = async ({
  connection = db,
  societyId,
  adminId,
  paymentMode = "cash",
}) => {
  const accountType = paymentMode === "cash" ? "cash" : "bank";
  const accountName = defaultAccountNameForMode(paymentMode);

  const [[existing]] = await connection.query(
    `SELECT id FROM payment_accounts
     WHERE society_id = ? AND account_name = ?
     LIMIT 1`,
    [societyId, accountName],
  );

  if (existing) return existing.id;

  const [result] = await connection.query(
    `INSERT INTO payment_accounts
     (account_code, society_id, admin_id, account_name, account_type,
      bank_name, opening_balance, opening_balance_date, status)
     VALUES (?, ?, ?, ?, ?, ?, 0.00, CURRENT_DATE, 'active')`,
    [
      prefixedNanoId("ACC"),
      societyId,
      adminId,
      accountName,
      accountType,
      accountType === "bank" ? "Bank" : null,
    ],
  );

  await connection.query(
    `INSERT INTO financial_transactions
     (transaction_code, society_id, admin_id, payment_account_id,
      transaction_date, transaction_type, source_type, source_id, reference_no,
      description, debit_amount, credit_amount, status)
     VALUES (?, ?, ?, ?, CURRENT_DATE, 'opening', 'opening_balance', ?,
      NULL, ?, 0.00, 0.00, 'posted')`,
    [
      prefixedNanoId("FTX"),
      societyId,
      adminId,
      result.insertId,
      result.insertId,
      `Opening balance for ${accountName}`,
    ],
  );

  return result.insertId;
};

export const createFinancialTransaction = async ({
  connection = db,
  societyId,
  adminId,
  paymentAccountId,
  transactionDate,
  transactionType,
  sourceType,
  sourceId,
  referenceNo = null,
  description,
  debitAmount = 0,
  creditAmount = 0,
  status = "posted",
}) => {
  const [result] = await connection.query(
    `INSERT INTO financial_transactions
     (transaction_code, society_id, admin_id, payment_account_id,
      transaction_date, transaction_type, source_type, source_id, reference_no,
      description, debit_amount, credit_amount, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      prefixedNanoId("FTX"),
      societyId,
      adminId,
      paymentAccountId,
      transactionDate || new Date().toISOString().slice(0, 10),
      transactionType,
      sourceType,
      sourceId || null,
      referenceNo || null,
      description,
      toMoney(debitAmount),
      toMoney(creditAmount),
      status,
    ],
  );

  return result.insertId;
};

export const createExpenseDebit = async ({
  connection = db,
  societyId,
  adminId,
  expense,
}) =>
  createFinancialTransaction({
    connection,
    societyId,
    adminId,
    paymentAccountId: expense.payment_account_id,
    transactionDate: expense.expense_date,
    transactionType: "expense",
    sourceType: "expense",
    sourceId: expense.id,
    referenceNo: expense.reference_no || expense.cheque_number || null,
    description: `Expense ${expense.expense_number}: ${expense.description}`,
    debitAmount: expense.amount,
    creditAmount: 0,
  });

export const reverseExpenseDebit = async ({
  connection = db,
  societyId,
  adminId,
  expense,
  originalTransactionId,
}) =>
  createFinancialTransaction({
    connection,
    societyId,
    adminId,
    paymentAccountId: expense.payment_account_id,
    transactionDate: new Date().toISOString().slice(0, 10),
    transactionType: "reversal",
    sourceType: "expense_cancellation",
    sourceId: expense.id,
    referenceNo: expense.expense_number,
    description: `Reversal for expense ${expense.expense_number}`,
    debitAmount: 0,
    creditAmount: expense.amount,
    status: "posted",
  }).then(async (reversalId) => {
    await connection.query(
      `UPDATE financial_transactions
       SET reversed_by_transaction_id = ?
       WHERE id = ?`,
      [reversalId, originalTransactionId],
    );
    return reversalId;
  });

export const recordMaintenanceIncomeTransaction = async ({
  connection = db,
  societyId,
  adminId,
  paymentId,
  paymentMode = "cash",
  paymentDate,
  amount,
  referenceNo,
  receiptNumber,
}) => {
  try {
    const paymentAccountId = await ensureDefaultPaymentAccount({
      connection,
      societyId,
      adminId,
      paymentMode,
    });

    const [[existing]] = await connection.query(
      `SELECT id FROM financial_transactions
       WHERE society_id = ?
         AND source_type = 'maintenance_payment'
         AND source_id = ?
       LIMIT 1`,
      [societyId, paymentId],
    );
    if (existing) return existing.id;

    return createFinancialTransaction({
      connection,
      societyId,
      adminId,
      paymentAccountId,
      transactionDate: paymentDate,
      transactionType: "income",
      sourceType: "maintenance_payment",
      sourceId: paymentId,
      referenceNo: referenceNo || receiptNumber,
      description: `Maintenance receipt ${receiptNumber}`,
      debitAmount: 0,
      creditAmount: amount,
    });
  } catch (error) {
    if (tableMissing(error)) return null;
    throw error;
  }
};

export const getAccountBalances = async (societyId) => {
  const [rows] = await db.query(
    `SELECT pa.id, pa.account_name, pa.account_type, pa.bank_name,
            pa.masked_account_number, pa.opening_balance,
            COALESCE(SUM(ft.credit_amount), 0) AS total_credits,
            COALESCE(SUM(ft.debit_amount), 0) AS total_debits,
            pa.opening_balance + COALESCE(SUM(ft.credit_amount), 0)
              - COALESCE(SUM(ft.debit_amount), 0) AS current_balance
     FROM payment_accounts pa
     LEFT JOIN financial_transactions ft
       ON ft.payment_account_id = pa.id
      AND ft.status = 'posted'
     WHERE pa.society_id = ?
     GROUP BY pa.id
     ORDER BY pa.account_type, pa.account_name`,
    [societyId],
  );
  return rows;
};

export const getDashboardSummary = async ({ societyId, from, to }) => {
  const params = [societyId];
  let dateWhere = "";
  if (from) {
    dateWhere += " AND transaction_date >= ?";
    params.push(from);
  }
  if (to) {
    dateWhere += " AND transaction_date <= ?";
    params.push(to);
  }

  const [[summary]] = await db.query(
    `SELECT COALESCE(SUM(CASE WHEN transaction_type IN ('income','reversal')
                              THEN credit_amount ELSE 0 END), 0) AS total_income,
            COALESCE(SUM(CASE WHEN transaction_type = 'expense'
                              THEN debit_amount ELSE 0 END), 0) AS total_expenses
     FROM financial_transactions
     WHERE society_id = ? AND status = 'posted' ${dateWhere}`,
    params,
  );

  const [[opening]] = await db.query(
    `SELECT COALESCE(SUM(opening_balance), 0) AS opening_balance
     FROM payment_accounts
     WHERE society_id = ? AND status = 'active'`,
    [societyId],
  );

  const accounts = await getAccountBalances(societyId);
  const totalIncome = Number(summary.total_income || 0);
  const totalExpenses = Number(summary.total_expenses || 0);
  const openingBalance = Number(opening.opening_balance || 0);

  return {
    opening_balance: openingBalance,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_cash_flow: totalIncome - totalExpenses,
    closing_balance: openingBalance + totalIncome - totalExpenses,
    current_balance: accounts.reduce(
      (sum, account) => sum + Number(account.current_balance || 0),
      0,
    ),
    cash_balance: accounts
      .filter((account) => account.account_type === "cash")
      .reduce((sum, account) => sum + Number(account.current_balance || 0), 0),
    bank_balance: accounts
      .filter((account) => account.account_type === "bank")
      .reduce((sum, account) => sum + Number(account.current_balance || 0), 0),
    accounts,
  };
};
