import express from "express";
import {
  addMaintenanceSetting,
  getAllMaintenanceSettings,
  getSettingByKey,
  softDeleteMaintenanceSetting,
  updateMaintenanceSetting,
} from "../Controllers/maintenanceSettingController.js";
import { verifyAdminToken } from "../Middlewares/authMiddleware.js";
import {
  addSettingValidation,
  deleteSettingValidation,
  getSettingByKeyValidation,
  updateSettingValidation,
} from "../validators/maintenanceSettingValidator.js";

const router = express.Router();

router.post(
  "/add",
  verifyAdminToken,
  addSettingValidation,
  addMaintenanceSetting
);

router.get("/all", verifyAdminToken, getAllMaintenanceSettings);
router.get(
  "/setting/:key",
  verifyAdminToken,
  getSettingByKeyValidation,
  getSettingByKey
);

router.patch(
  "/update/:id",
  verifyAdminToken,
  updateSettingValidation,
  updateMaintenanceSetting
);

router.patch(
  "/delete/:id",
  deleteSettingValidation,
  softDeleteMaintenanceSetting
);

export default router;
