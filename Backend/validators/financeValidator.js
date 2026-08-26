import { body, param, query } from "express-validator";
import { EXPENSE_STATUSES, PAYMENT_MODES } from "../Services/financeService.js";

const optionalDate = (field) =>
  body(field).optional({ nullable: true, checkFalsy: true }).isISO8601();

const optionalQueryDate = (field) =>
  query(field).optional({ nullable: true, checkFalsy: true }).isISO8601();

export const listFinanceValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  optionalQueryDate("from"),
  optionalQueryDate("to"),
  query("month").optional().matches(/^\d{4}-\d{2}$/),
  query("year").optional().isInt({ min: 2000, max: 2100 }),
  query("category_id").optional().isInt({ min: 1 }),
  query("vendor_id").optional().isInt({ min: 1 }),
  query("payment_account_id").optional().isInt({ min: 1 }),
  query("payment_mode").optional().isIn(PAYMENT_MODES),
  query("status").optional().isIn(EXPENSE_STATUSES),
];

export const idValidation = [
  param("id").isInt({ min: 1 }).withMessage("Valid ID is required"),
];

export const categoryValidation = [
  body("category_name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 100 }),
  body("description").optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
  body("status").optional().isIn(["active", "inactive"]),
];

export const vendorValidation = [
  body("vendor_name")
    .trim()
    .notEmpty()
    .withMessage("Vendor name is required")
    .isLength({ max: 150 }),
  body("contact_person").optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  body("phone").optional({ nullable: true, checkFalsy: true }).isLength({ max: 20 }),
  body("email").optional({ nullable: true, checkFalsy: true }).isEmail(),
  body("address").optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
  body("gst_number").optional({ nullable: true, checkFalsy: true }).isLength({ max: 30 }),
  body("notes").optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
  body("status").optional().isIn(["active", "inactive"]),
];

export const paymentAccountValidation = [
  body("account_name")
    .trim()
    .notEmpty()
    .withMessage("Account name is required")
    .isLength({ max: 120 }),
  body("account_type").isIn(["cash", "bank"]),
  body("bank_name").optional({ nullable: true, checkFalsy: true }).isLength({ max: 120 }),
  body("masked_account_number")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 40 }),
  body("opening_balance").optional().isFloat({ min: 0 }),
  body("opening_balance_date").optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body("status").optional().isIn(["active", "inactive"]),
];

export const expenseValidation = [
  body("expense_date").isISO8601().withMessage("Expense date is required"),
  body("category_id").isInt({ min: 1 }).withMessage("Category is required"),
  body("sub_category").optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  body("vendor_id").optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body("paid_to").optional({ nullable: true, checkFalsy: true }).isLength({ max: 150 }),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 255 }),
  body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),
  body("invoice_number").optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  optionalDate("invoice_date"),
  body("payment_mode").isIn(PAYMENT_MODES).withMessage("Valid payment mode is required"),
  body("payment_account_id")
    .if(body("status").equals("paid"))
    .isInt({ min: 1 })
    .withMessage("Payment account is required for paid expenses"),
  body("reference_no").optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  body("cheque_number")
    .if(body("payment_mode").equals("cheque"))
    .notEmpty()
    .withMessage("Cheque number is required"),
  body("cheque_date")
    .if(body("payment_mode").equals("cheque"))
    .isISO8601()
    .withMessage("Cheque date is required"),
  body("status").optional().isIn(EXPENSE_STATUSES),
  body("notes").optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
];

export const expenseStatusValidation = [
  body("status").isIn(EXPENSE_STATUSES).withMessage("Invalid expense status"),
  body("payment_account_id").optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body("payment_mode").optional().isIn(PAYMENT_MODES),
  body("reference_no").optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  body("cheque_number").optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  body("cheque_date").optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body("notes").optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
];

export const cancellationValidation = [
  body("reason").optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
];
