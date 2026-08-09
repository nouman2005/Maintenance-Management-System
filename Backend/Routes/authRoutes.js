import express from "express";
import {
  changePassword,
  getProfile,
  logout,
  refreshAccessToken,
} from "../Controllers/auth.controller.js";
import { verifyAccessToken } from "../Middlewares/verifyAccessToken.js";
import { changePasswordValidator } from "../validators/loginValidator.js";

const router = express.Router();

router.post("/refresh-token", refreshAccessToken);
router.get("/me", verifyAccessToken, getProfile);
router.patch(
  "/change-password",
  verifyAccessToken,
  changePasswordValidator,
  changePassword
);
router.post("/logout", logout);

export default router;
