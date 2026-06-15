import { body, param, query } from "express-validator";

export const createTenantValidator = [
  body("society_id").optional().isInt().withMessage("Invalid society ID"),
  body("flat_id").isInt().withMessage("Invalid flat ID"),

  body("tenant_name").trim().notEmpty().withMessage("Tenant name is required"),

  body("tenant_phone")
    .notEmpty()
    .withMessage("Tenant phone is required")
    .isMobilePhone("en-IN")
    .withMessage("Invalid phone"),

  body("tenant_whatsapp").optional({ checkFalsy: true }).isMobilePhone("en-IN"),

  body("tenant_email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Invalid email")
    .normalizeEmail(),

  body("move_in_date")
    .notEmpty()
    .withMessage("Move-in date required")
    .isDate()
    .withMessage("Invalid move-in date"),
];

export const tenantListValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("flat_id").optional().isInt(),
  query("society_id").optional().isInt(),
  query("status").optional().isIn(["active", "inactive"]),
];

export const tenantIdParamValidator = [
  param("id").isInt().withMessage("Invalid tenant ID"),
];
