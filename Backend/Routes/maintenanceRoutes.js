import express from "express";
import { verifyAccessToken } from "../Middlewares/verifyAccessToken.js";
import { adminOnly } from "../Middlewares/adminMiddleware.js";
import {
  createMaintenanceCharge,
  createOldMaintenanceDue,
  exportFlatLedger,
  exportMaintenanceReport,
  getImportBatches,
  getFlatMaintenanceDetails,
  getMaintenanceBalances,
  getMaintenanceCharges,
  getMaintenanceReports,
  getMaintenanceRules,
  getMaintenanceSummary,
  importMaintenanceExcel,
  maintenanceUpload,
  recalculateInterest,
  recordMaintenancePayment,
  runMonthlyChargeGeneration,
  saveMaintenanceRule,
  updateMaintenanceBalance,
} from "../Controllers/maintenanceController.js";
import {
  balanceValidation,
  createChargeValidation,
  listChargeValidation,
  paymentValidation,
  saveRuleValidation,
} from "../validators/maintenanceValidator.js";

const router = express.Router();

router.use(verifyAccessToken, adminOnly);

router.get("/summary", getMaintenanceSummary);
router.get("/rules", getMaintenanceRules);
router.post("/rules", saveRuleValidation, saveMaintenanceRule);
router.get("/reports/export", exportMaintenanceReport);
router.get("/flats/:flatId", getFlatMaintenanceDetails);
router.get("/flats/:flatId/export", exportFlatLedger);
router.get("/charges", listChargeValidation, getMaintenanceCharges);
router.post("/charges", createChargeValidation, createMaintenanceCharge);
router.post("/old-dues", createChargeValidation, createOldMaintenanceDue);
router.put("/balances", balanceValidation, updateMaintenanceBalance);
router.post("/generate-monthly", runMonthlyChargeGeneration);
router.post("/payments", paymentValidation, recordMaintenancePayment);
router.get("/balances", getMaintenanceBalances);
router.get("/reports", getMaintenanceReports);
router.post("/interest/recalculate", recalculateInterest);
router.post("/import", maintenanceUpload.single("file"), importMaintenanceExcel);
router.get("/imports", getImportBatches);

export default router;
