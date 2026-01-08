import { body, param } from "express-validator";

export const addSettingValidation = [
  body("setting_key")
    .notEmpty()
    .withMessage("Setting key is required")
    .isUppercase()
    .withMessage("Setting key must be uppercase"),

  body("setting_value")
    .isDecimal()
    .withMessage("Setting value must be a number"),

  body("description").optional().isLength({ max: 255 }),
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
