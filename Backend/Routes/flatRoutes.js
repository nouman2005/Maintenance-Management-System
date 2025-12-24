import express from "express";
import { verifyAdminToken } from "../middlewares/authMiddleware.js";
import { flatValidation } from "../validators/flatValidator.js";
import {
  addFlat,
  deactivateFlat,
  getFlatById,
  getFlats,
  getFlatsWithPagination,
  updateFlat,
} from "../Controllers/flatController.js";

const router = express.Router();

router.post("/addFlat", verifyAdminToken, flatValidation, addFlat);
router.get("/getFlats", verifyAdminToken, getFlats);
router.get("/paginated/list", verifyAdminToken, getFlatsWithPagination);
router.get("/getFlatByID/:id", verifyAdminToken, getFlatById);
router.put("/updateFlat/:id", verifyAdminToken, updateFlat);
router.delete("/flatDelete/:id", verifyAdminToken, deactivateFlat);

export default router;
