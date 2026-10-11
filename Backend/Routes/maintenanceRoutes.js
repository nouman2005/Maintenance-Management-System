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
  getMaintenanceCalculationPreview,
  getMaintenanceBalances,
  getMaintenanceCharges,
  getMaintenanceReports,
  getMaintenanceRuleHistory,
  getMaintenanceRules,
  getFlatMaintenanceStatement,
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
  applyMaintenanceRevision,
  getMaintenanceRevisions,
  previewMaintenanceRevision,
} from "../Controllers/maintenanceRevisionController.js";
import {
  balanceValidation,
  createChargeValidation,
  listChargeValidation,
  paymentValidation,
  normalizeMaintenanceRule,
  maintenanceRevisionValidation,
  ruleHistoryValidation,
  saveRuleValidation,
} from "../validators/maintenanceValidator.js";

const router = express.Router();

router.use(verifyAccessToken, adminOnly);

router.get("/summary", getMaintenanceSummary);
router.get("/rules", getMaintenanceRules);
router.post("/rules", normalizeMaintenanceRule, saveRuleValidation, saveMaintenanceRule);
router.get("/rules/history", ruleHistoryValidation, getMaintenanceRuleHistory);
router.get("/rules/:id/history", ruleHistoryValidation, getMaintenanceRuleHistory);
router.post("/revisions/preview", maintenanceRevisionValidation, previewMaintenanceRevision);
router.post("/revisions", maintenanceRevisionValidation, applyMaintenanceRevision);
router.get("/revisions", getMaintenanceRevisions);
router.get("/reports/export", exportMaintenanceReport);
router.get("/flats/:flatId", getFlatMaintenanceDetails);
router.get("/statement/:flatId", getFlatMaintenanceStatement);
router.get("/flats/:flatId/export", exportFlatLedger);
router.get("/charges", listChargeValidation, getMaintenanceCharges);
router.post("/charges", createChargeValidation, createMaintenanceCharge);
router.post("/old-dues", createChargeValidation, createOldMaintenanceDue);
router.put("/balances", balanceValidation, updateMaintenanceBalance);
router.post("/generate-monthly", runMonthlyChargeGeneration);
router.post("/payments", paymentValidation, recordMaintenancePayment);
router.get("/balances", getMaintenanceBalances);
router.get("/reports", getMaintenanceReports);
router.post("/calculation-preview", getMaintenanceCalculationPreview);
router.post("/interest/recalculate", recalculateInterest);
router.post("/import", maintenanceUpload.single("file"), importMaintenanceExcel);
router.get("/imports", getImportBatches);

export default router;
