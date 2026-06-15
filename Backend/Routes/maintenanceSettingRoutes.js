import express from "express";
import {
  addMaintenanceSetting,
  getAllMaintenanceSettings,
  getSettingByKey,
  softDeleteMaintenanceSetting,
  updateMaintenanceSetting,
} from "../Controllers/maintenanceSettingController.js";
import {
  addSettingValidation,
  deleteSettingValidation,
  getSettingByKeyValidation,
  listSettingValidation,
  updateSettingValidation,
} from "../validators/maintenanceSettingValidator.js";
import { verifyAccessToken } from "../Middlewares/verifyAccessToken.js";
import { adminOnly } from "../Middlewares/adminMiddleware.js";

const router = express.Router();

router.post(
  "/",
  verifyAccessToken,
  adminOnly,
  addSettingValidation,
  addMaintenanceSetting
);

router.get(
  "/",
  verifyAccessToken,
  adminOnly,
  listSettingValidation,
  getAllMaintenanceSettings
);
router.get(
  "/:key",
  verifyAccessToken,
  adminOnly,
  getSettingByKeyValidation,
  getSettingByKey
);

router.patch(
  "/:id",
  verifyAccessToken,
  adminOnly,
  updateSettingValidation,
  updateMaintenanceSetting
);

router.delete(
  "/:id",
  verifyAccessToken,
  adminOnly,
  deleteSettingValidation,
  softDeleteMaintenanceSetting
);

export default router;
