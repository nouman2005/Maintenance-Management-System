import { body, param, query } from "express-validator";

export const createAdminValidator = [
  body("society_id").isInt({ gt: 0 }).withMessage("Invalid society ID"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/[A-Za-z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),

  body("phone")
    .optional()
    .isString()
    .isMobilePhone("en-IN")
    .withMessage("Invalid phone number"),
];

export const adminListValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("society_id").optional().isInt(),
];

export const adminIdParamValidator = [
  param("id").isInt().withMessage("Invalid admin ID"),
];

export const updateAdminValidator = [
  param("id").isInt().withMessage("Invalid admin ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters"),

  body("phone")
    .optional()
    .isMobilePhone("en-IN")
    .withMessage("Invalid phone number"),

  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Invalid status"),
];
