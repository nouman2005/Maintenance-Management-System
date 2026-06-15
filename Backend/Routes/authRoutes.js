import express from "express";
import { logout, refreshAccessToken } from "../Controllers/auth.controller.js";

const router = express.Router();

router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);

export default router;
