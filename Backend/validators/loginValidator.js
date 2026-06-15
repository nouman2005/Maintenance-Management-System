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
