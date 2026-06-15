import express from "express";
import {
  loginUser,
  registerSuperAdmin,
} from "../Controllers/superAdminController.js";
import { superAdminRegisterValidator } from "../validators/superAdminValidator.js";
import { loginValidator } from "../validators/loginValidator.js";

const router = express.Router();

router.post("/register", superAdminRegisterValidator, registerSuperAdmin);

router.post("/login", loginValidator, loginUser);

export default router;
