import express from "express";
import { verifyAccessToken } from "../Middlewares/verifyAccessToken.js";
import { adminOnly } from "../Middlewares/adminMiddleware.js";
import {
  createTenantValidator,
  tenantIdParamValidator,
  tenantListValidator,
} from "../validators/tenantValidator.js";
import {
  createTenant,
  deactivateTenant,
  getTenantById,
  getTenants,
} from "../Controllers/tenantController.js";

const router = express.Router();

router.post(
  "/",
  verifyAccessToken,
  adminOnly,
  createTenantValidator,
  createTenant,
);

router.get("/", verifyAccessToken, adminOnly, tenantListValidator, getTenants);

router.get(
  "/:id",
  verifyAccessToken,
  adminOnly,
  tenantIdParamValidator,
  getTenantById
);

router.delete(
  "/:id",
  verifyAccessToken,
  adminOnly,
  tenantIdParamValidator,
  deactivateTenant
);

export default router;
