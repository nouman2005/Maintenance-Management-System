import express from "express";
import {
  loginValidation,
  registerValidation,
} from "../validators/adminValidator.js";
import { loginAdmin, registerAdmin } from "../Controllers/adminController.js";
import { validationResult } from "express-validator";

const router = express.Router();

router.post("/register", registerValidation, registerAdmin);
router.post("/login", loginValidation, loginAdmin);

export default router;
