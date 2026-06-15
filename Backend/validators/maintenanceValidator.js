import { body, param, query } from "express-validator";

export const saveRuleValidation = [
  body("name").notEmpty().withMessage("Rule name is required").isLength({ max: 100 }),
  body("interest_rate_monthly")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Monthly interest rate must be between 0 and 100"),
  body("interest_grace_days").optional().isInt({ min: 0, max: 365 }),
  body("interest_method")
    .optional()
    .isIn(["simple_monthly", "compound_monthly", "fixed_penalty"])
    .withMessage("Invalid interest method"),
  body("interest_apply_to")
    .optional()
    .isIn(["maintenance_only", "maintenance_and_penalties", "total_outstanding"])
    .withMessage("Invalid interest applicability"),
  body("exclude_noc_from_interest").optional().isBoolean(),
  body("rounding_mode")
    .optional()
    .isIn(["nearest", "floor", "ceil", "none"])
    .withMessage("Invalid rounding mode"),
  body("effective_from").optional().isISO8601().toDate(),
];

export const createChargeValidation = [
  body("flat_id").isInt({ min: 1 }).withMessage("Valid flat is required"),
  body("period_month")
    .matches(/^\d{4}-\d{2}(-\d{2})?$/)
    .withMessage("Period month must be YYYY-MM or YYYY-MM-DD"),
  body("maintenance_charge").isFloat({ min: 0 }),
  body("noc_charge").optional().isFloat({ min: 0 }),
  body("penalty_charge").optional().isFloat({ min: 0 }),
  body("interest_amount").optional().isFloat({ min: 0 }),
  body("due_date").optional().isISO8601().toDate(),
  body("notes").optional().isLength({ max: 255 }),
];

export const listChargeValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("flat_id").optional().isInt({ min: 1 }),
  query("status").optional().isIn(["unpaid", "partial", "paid", "waived"]),
  query("from").optional().matches(/^\d{4}-\d{2}(-\d{2})?$/),
  query("to").optional().matches(/^\d{4}-\d{2}(-\d{2})?$/),
];

export const paymentValidation = [
  body("flat_id").isInt({ min: 1 }).withMessage("Valid flat is required"),
  body("payment_date").optional().isISO8601().toDate(),
  body("amount").optional().isFloat({ min: 0.01 }),
  body("total_amount_paid").optional().isFloat({ min: 0.01 }),
  body("maintenance_amount_paid").optional().isFloat({ min: 0 }),
  body("noc_amount_paid").optional().isFloat({ min: 0 }),
  body("interest_amount_paid").optional().isFloat({ min: 0 }),
  body("payment_mode")
    .optional()
    .isIn(["cash", "cheque", "upi", "bank_transfer", "card", "adjustment"]),
  body("reference_no").optional().isLength({ max: 100 }),
  body("receipt_number").optional().isLength({ max: 30 }),
  body("notes").optional().isLength({ max: 255 }),
  body("allocations").optional().isArray(),
  body("billing_months").optional(),
  body("from_month").optional().matches(/^\d{4}-\d{2}(-\d{2})?$/),
  body("to_month").optional().matches(/^\d{4}-\d{2}(-\d{2})?$/),
  body("monthly_maintenance_amount").optional().isFloat({ min: 0 }),
  body("noc_amount").optional().isFloat({ min: 0 }),
  body("interest_amount").optional().isFloat({ min: 0 }),
];

export const balanceValidation = [
  body("flat_id").isInt({ min: 1 }).withMessage("Valid flat is required"),
  body("period_month")
    .optional()
    .matches(/^\d{4}-\d{2}(-\d{2})?$/)
    .withMessage("Period month must be YYYY-MM or YYYY-MM-DD"),
  body("outstanding_maintenance_amount").optional().isFloat({ min: 0 }),
  body("outstanding_noc_amount").optional().isFloat({ min: 0 }),
  body("outstanding_interest_amount").optional().isFloat({ min: 0 }),
  body("remarks").optional().isLength({ max: 255 }),
];

export const idValidation = [
  param("id").isInt({ min: 1 }).withMessage("Valid ID is required"),
];
