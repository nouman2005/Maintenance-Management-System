import { body, param, query } from "express-validator";

const isEnabled = (value) => value === true || value === "true" || value === 1 || value === "1";
const isBlank = (value) => value === null || value === undefined || String(value).trim() === "";
const isMoney = (value) =>
  typeof value === "number"
    ? Number.isFinite(value) && value >= 0
    : /^\d+(\.\d{1,2})?$/.test(String(value).trim());
const isRate = (value) =>
  typeof value === "number"
    ? Number.isFinite(value) && value >= 0
    : /^\d+(\.\d{1,4})?$/.test(String(value).trim());

const nullableNumbers = [
  "noc_value",
  "penalty_rate_value",
  "max_penalty_amount",
];

export const normalizeMaintenanceRule = (req, res, next) => {
  for (const field of nullableNumbers) {
    if (typeof req.body?.[field] === "string" && req.body[field].trim() === "") {
      req.body[field] = null;
    }
  }
  next();
};

export const saveRuleValidation = [
  body("name").notEmpty().withMessage("Rule name is required").isLength({ max: 100 }),
  body("maintenance_amount")
    .optional({ nullable: true })
    .custom((value) => !isBlank(value) && isMoney(value))
    .withMessage("Maintenance amount must be a valid monetary amount."),
  body("billing_frequency").optional().isIn(["monthly"]),
  body("due_day").optional().isInt({ min: 1, max: 31 }),
  body("noc_enabled").optional().isBoolean(),
  body("noc_calculation_type").custom((value, { req }) => {
    if (!isEnabled(req.body.noc_enabled)) return true;
    if (!["fixed", "percentage"].includes(value)) {
      throw new Error("NOC calculation type is required when NOC is enabled.");
    }
    return true;
  }),
  body("noc_value").custom((value, { req }) => {
    if (!isEnabled(req.body.noc_enabled)) return true;
    if (isBlank(value)) throw new Error("NOC value is required when NOC is enabled.");
    const valid = req.body.noc_calculation_type === "percentage" ? isRate(value) : isMoney(value);
    if (!valid) throw new Error("NOC value must be a valid non-negative amount.");
    return true;
  }),
  body("late_fee_enabled").optional().isBoolean(),
  body("penalty_type").custom((value, { req }) => {
    if (!isEnabled(req.body.late_fee_enabled)) return true;
    if (!["percentage", "fixed"].includes(value)) {
      throw new Error("Penalty type is required when late fee is enabled.");
    }
    return true;
  }),
  body("penalty_rate_value").custom((value, { req }) => {
    if (!isEnabled(req.body.late_fee_enabled)) return true;
    if (isBlank(value)) throw new Error("Penalty rate or amount is required when late fee is enabled.");
    const valid = req.body.penalty_type === "percentage" ? isRate(value) : isMoney(value);
    if (!valid) throw new Error("Penalty rate or amount must be a valid non-negative value.");
    return true;
  }),
  body("penalty_rate_period").custom((value, { req }) => {
    if (!isEnabled(req.body.late_fee_enabled)) return true;
    if (!["monthly", "yearly"].includes(value)) {
      throw new Error("Penalty rate period is required when late fee is enabled.");
    }
    return true;
  }),
  body("penalty_frequency").custom((value, { req }) => {
    if (!isEnabled(req.body.late_fee_enabled)) return true;
    if (!["one_time", "monthly"].includes(value)) {
      throw new Error("Penalty frequency is required when late fee is enabled.");
    }
    return true;
  }),
  body("penalty_method").custom((value, { req }) => {
    if (!isEnabled(req.body.late_fee_enabled)) return true;
    if (!["simple", "compound"].includes(value)) {
      throw new Error("Penalty method is required when late fee is enabled.");
    }
    return true;
  }),
  body("penalty_base").custom((value, { req }) => {
    if (!isEnabled(req.body.late_fee_enabled)) return true;
    if (![
      "original_eligible_charges",
      "current_outstanding",
      "outstanding_including_previous_penalties",
    ].includes(value)) {
      throw new Error("Penalty base is required when late fee is enabled.");
    }
    return true;
  }),
  body("penalty_applies_maintenance").optional().isBoolean(),
  body("penalty_applies_noc").optional().isBoolean(),
  body("grace_days").optional().isInt({ min: 0, max: 365 }),
  body("max_penalty_enabled").optional().isBoolean(),
  body("max_penalty_amount").custom((value, { req }) => {
    if (!isEnabled(req.body.max_penalty_enabled)) return true;
    if (isBlank(value)) {
      throw new Error("Maximum penalty amount is required when maximum penalty is enabled.");
    }
    if (!isMoney(value) || Number(value) <= 0) {
      throw new Error("Maximum penalty amount must be a valid monetary amount greater than 0.");
    }
    return true;
  }),
  body("interest_rate_monthly")
    .optional()
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

export const ruleHistoryValidation = [
  param("id").optional().isInt({ min: 1 }).withMessage("Valid rule ID is required"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const maintenanceRevisionValidation = [
  body("name").trim().notEmpty().isLength({ max: 100 }).withMessage("Revision name is required"),
  body("revision_type").isIn(["fixed_increase", "per_sqft_increase"]).withMessage("Choose a valid revision type"),
  body("increase_amount").isFloat({ gt: 0 }).withMessage("Increase amount must be greater than zero"),
  body("effective_from").isISO8601().withMessage("A valid effective date is required"),
  body("reason").trim().notEmpty().isLength({ max: 255 }).withMessage("A reason for the revision is required"),
  body("notes").optional({ nullable: true }).trim().isLength({ max: 500 }),
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
