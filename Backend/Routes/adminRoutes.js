import express from "express";
import {
  createAdmin,
  deactivateAdmin,
  getAdminById,
  getAdmins,
  updateAdmin,
} from "../Controllers/adminController.js";
import { verifyAccessToken } from "../Middlewares/verifyAccessToken.js";
import { superAdminOnly } from "../Middlewares/superAdminMiddleware.js";
import {
  adminIdParamValidator,
  adminListValidator,
  createAdminValidator,
  updateAdminValidator,
} from "../validators/adminValidator.js";

const router = express.Router();

router.post(
  "/createAdmin",
  verifyAccessToken,
  superAdminOnly,
  createAdminValidator,
  createAdmin
);

router.get(
  "/",
  verifyAccessToken,
  superAdminOnly,
  adminListValidator,
  getAdmins
);

router.get(
  "/:id",
  verifyAccessToken,
  superAdminOnly,
  adminIdParamValidator,
  getAdminById
);

router.put(
  "/:id",
  verifyAccessToken,
  superAdminOnly,
  updateAdminValidator,
  updateAdmin
);

router.delete(
  "/:id",
  verifyAccessToken,
  superAdminOnly,
  adminIdParamValidator,
  deactivateAdmin
);

export default router;
