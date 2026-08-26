import express from "express";
import { verifyAccessToken } from "../Middlewares/verifyAccessToken.js";
import { adminOnly } from "../Middlewares/adminMiddleware.js";
import {
  cancelExpense,
  createExpense,
  createExpenseCategory,
  createPaymentAccount,
  createVendor,
  getExpenseById,
  getFinanceDashboard,
  getFinanceSummary,
  getFinancialLedger,
  listExpenseCategories,
  listExpenses,
  listPaymentAccounts,
  listVendors,
  updateExpense,
  updateExpenseCategory,
  updateExpenseCategoryStatus,
  updateExpenseStatus,
  updatePaymentAccount,
  updatePaymentAccountStatus,
  updateVendor,
  updateVendorStatus,
} from "../Controllers/financeController.js";
import {
  cancellationValidation,
  categoryValidation,
  expenseStatusValidation,
  expenseValidation,
  idValidation,
  listFinanceValidation,
  paymentAccountValidation,
  vendorValidation,
} from "../validators/financeValidator.js";

const router = express.Router();

router.use(verifyAccessToken, adminOnly);

router.get("/dashboard", getFinanceDashboard);
router.get("/ledger", listFinanceValidation, getFinancialLedger);
router.get("/summary", getFinanceSummary);
router.get("/monthly-summary", getFinanceSummary);
router.get("/yearly-summary", getFinanceSummary);
router.get("/category-summary", getFinanceSummary);
router.get("/payment-mode-summary", getFinanceSummary);
router.get("/account-summary", getFinanceSummary);

router.get("/expenses", listFinanceValidation, listExpenses);
router.post("/expenses", expenseValidation, createExpense);
router.get("/expenses/:id", idValidation, getExpenseById);
router.put("/expenses/:id", idValidation, expenseValidation, updateExpense);
router.patch("/expenses/:id/status", idValidation, expenseStatusValidation, updateExpenseStatus);
router.post("/expenses/:id/cancel", idValidation, cancellationValidation, cancelExpense);

router.get("/expense-categories", listExpenseCategories);
router.post("/expense-categories", categoryValidation, createExpenseCategory);
router.put("/expense-categories/:id", idValidation, categoryValidation, updateExpenseCategory);
router.patch("/expense-categories/:id/status", idValidation, updateExpenseCategoryStatus);

router.get("/vendors", listVendors);
router.post("/vendors", vendorValidation, createVendor);
router.put("/vendors/:id", idValidation, vendorValidation, updateVendor);
router.patch("/vendors/:id/status", idValidation, updateVendorStatus);

router.get("/payment-accounts", listPaymentAccounts);
router.post("/payment-accounts", paymentAccountValidation, createPaymentAccount);
router.put("/payment-accounts/:id", idValidation, paymentAccountValidation, updatePaymentAccount);
router.patch("/payment-accounts/:id/status", idValidation, updatePaymentAccountStatus);

export default router;
