import { body, param, query } from "express-validator";

export const createFlatValidator = [
  body("society_id").optional().isInt().withMessage("Invalid society ID"),

  body("wing")
    .trim()
    .notEmpty()
    .withMessage("Wing is required")
    .isLength({ max: 10 }),

  body("floor_no").isInt({ min: 0 }).withMessage("Invalid floor number"),

  body("flat_no")
    .trim()
    .notEmpty()
    .withMessage("Flat number is required")
    .isLength({ max: 10 }),

  body("area_sqft")
    .optional({ checkFalsy: true })
    .isInt({ min: 100 })
    .withMessage("Invalid area"),

  body("owner_name").trim().notEmpty().withMessage("Owner name is required"),

  body("owner_phone")
    .notEmpty()
    .withMessage("Owner phone is required")
    .isMobilePhone("en-IN")
    .withMessage("Invalid phone"),

  body("owner_whatsapp").optional({ checkFalsy: true }).isMobilePhone("en-IN"),

  body("owner_email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Invalid email")
    .normalizeEmail(),

  body("maintenance_amount")
    .isFloat({ min: 0 })
    .withMessage("Invalid maintenance amount"),
];

export const flatListValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("society_id").optional().isInt(),
  query("occupancy").optional().isIn(["owner", "tenant"]),
];

export const flatIdParamValidator = [
  param("id").isInt().withMessage("Invalid flat ID"),
];

export const updateFlatValidator = [
  param("id").isInt().withMessage("Invalid flat ID"),

  body("owner_name").optional().trim(),
  body("owner_phone").optional().isMobilePhone("en-IN"),
  body("owner_whatsapp").optional({ checkFalsy: true }).isMobilePhone("en-IN"),
  body("owner_email").optional({ checkFalsy: true }).isEmail().normalizeEmail(),

  body("maintenance_amount").optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body("occupancy").optional().isIn(["owner", "tenant"]),
  body("status").optional().isIn(["active", "inactive"]),
];
