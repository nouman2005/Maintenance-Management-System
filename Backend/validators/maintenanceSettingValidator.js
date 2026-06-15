import { body, param, query } from "express-validator";

const settingKeys = [
  "base_maintenance",
  "per_sqft_rate",
  "late_fee",
  "parking_fee",
  "noc_charge",
];

export const addSettingValidation = [
  body("setting_key")
    .notEmpty()
    .withMessage("Setting key is required")
    .isIn(settingKeys)
    .withMessage("Invalid setting key"),

  body("setting_value")
    .isFloat({ min: 0 })
    .withMessage("Setting value must be a number"),

  body("value_type")
    .optional()
    .isIn(["fixed", "percentage", "per_sqft"])
    .withMessage("Invalid value type"),

  body("description").optional().isLength({ max: 255 }),
];

export const listSettingValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().isIn(["active", "inactive"]),
];

export const updateSettingValidation = [
  param("id").isInt().withMessage("Valid setting ID required"),

  body("setting_value")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Setting value must be a valid number"),

  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Invalid status"),
];

export const getSettingByKeyValidation = [
  param("key")
    .notEmpty()
    .withMessage("Setting key is required")
    .matches(/^[A-Z_]+$/i)
    .withMessage("Invalid setting key format"),
];

export const deleteSettingValidation = [
  param("id").isInt().withMessage("Valid setting ID required"),
];
