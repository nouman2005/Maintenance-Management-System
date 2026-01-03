import express from "express";
import {
  addTenant,
  deactivateTenant,
  getAllTenants,
  getTenantById,
  getTenantsWithPagination,
  requestTenantExit,
} from "../Controllers/tenantController.js";
import { verifyAdminToken } from "../middlewares/authMiddleware.js";
import {
  addTenantValidation,
  tenantIdValidation,
} from "../validators/tenantValidator.js";

const router = express.Router();

router.post("/addTenant", verifyAdminToken, addTenantValidation, addTenant);

router.get("/getAllTenants", verifyAdminToken, getAllTenants);
router.get(
  "/getTenantById/:id",
  verifyAdminToken,
  tenantIdValidation,
  getTenantById
);

router.get("/getTenantsPagination", verifyAdminToken, getTenantsWithPagination);

router.put(
  "/exitRequest/:id",
  verifyAdminToken,
  tenantIdValidation,
  requestTenantExit
);
router.put("/deActivateTenant/:id", tenantIdValidation, deactivateTenant);

export default router;
