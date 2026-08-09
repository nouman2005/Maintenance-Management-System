// validators/login.validator.js
import { body } from "express-validator";

export const loginValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),

  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["admin", "super_admin"])
    .withMessage("Invalid role"),
];

export const changePasswordValidator = [
  body("current_password")
    .notEmpty()
    .withMessage("Current password is required"),

  body("new_password")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/[a-z]/)
    .withMessage("New password must include a lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("New password must include an uppercase letter")
    .matches(/[0-9]/)
    .withMessage("New password must include a number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("New password must include a symbol"),
];
