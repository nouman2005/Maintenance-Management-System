import { body, param, query } from "express-validator";

const societyDetailsValidators = [
  body("registration_number")
    .trim()
    .notEmpty()
    .withMessage("Registration number is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Registration number must be 3 to 50 characters"),

  body("total_flats")
    .isInt({ min: 1, max: 10000 })
    .withMessage("Total flats must be between 1 and 10000"),

  body("society_phone")
    .optional({ values: "falsy" })
    .isMobilePhone("en-IN")
    .withMessage("Invalid society phone number"),

  body("society_email")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Invalid society email")
    .normalizeEmail(),

  body("city").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
  body("state").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
  body("pincode")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage("Invalid pincode"),
];

export const createSocietyValidator = [
  body("society_name")
    .trim()
    .notEmpty()
    .withMessage("Society name is required")
    .isLength({ min: 3 })
    .withMessage("Society name must be at least 3 characters"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Address too long"),

  ...societyDetailsValidators,
];

export const societyRegistrationRequestValidator = [
  body("society_name")
    .trim()
    .notEmpty()
    .withMessage("Society name is required")
    .isLength({ min: 3 })
    .withMessage("Society name must be at least 3 characters"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Address too long"),

  ...societyDetailsValidators,

  body("admin_name")
    .trim()
    .notEmpty()
    .withMessage("Admin name is required")
    .isLength({ min: 3 })
    .withMessage("Admin name must be at least 3 characters"),

  body("admin_email")
    .trim()
    .notEmpty()
    .withMessage("Admin email is required")
    .isEmail()
    .withMessage("Invalid admin email")
    .normalizeEmail(),

  body("admin_phone")
    .optional({ values: "falsy" })
    .isMobilePhone("en-IN")
    .withMessage("Invalid phone number"),
];

export const registrationRequestStatusValidator = [
  query("status")
    .optional()
    .isIn(["pending", "approved", "rejected"])
    .withMessage("Invalid request status"),
];

export const rejectRegistrationRequestValidator = [
  param("id").isInt().withMessage("Invalid request ID"),

  body("rejection_reason")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Rejection reason too long"),
];

export const societyIdParamValidator = [
  param("id").isInt().withMessage("Invalid society ID"),
];

export const updateSocietyValidator = [
  param("id").isInt().withMessage("Invalid society ID"),

  body("society_name")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Society name must be at least 3 characters"),

  body("registration_number")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Registration number must be 3 to 50 characters"),

  body("total_flats")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 10000 })
    .withMessage("Total flats must be between 1 and 10000"),

  body("society_phone")
    .optional({ values: "falsy" })
    .isMobilePhone("en-IN")
    .withMessage("Invalid society phone number"),

  body("society_email")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Invalid society email")
    .normalizeEmail(),

  body("address").optional({ values: "falsy" }).trim().isLength({ max: 255 }),
  body("city").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
  body("state").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
  body("pincode")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage("Invalid pincode"),
];

export const societyListValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
];
