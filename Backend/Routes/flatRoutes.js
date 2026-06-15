import express from "express";
import { verifyAccessToken } from "../Middlewares/verifyAccessToken.js";
import { adminOnly } from "../Middlewares/adminMiddleware.js";
import {
  createFlatValidator,
  flatIdParamValidator,
  flatListValidator,
  updateFlatValidator,
} from "../validators/flatValidator.js";
import {
  createFlat,
  deactivateFlat,
  getFlatById,
  getFlats,
  updateFlat,
} from "../Controllers/flatController.js";

const router = express.Router();

router.post("/", verifyAccessToken, adminOnly, createFlatValidator, createFlat);

router.get("/", verifyAccessToken, adminOnly, flatListValidator, getFlats);

router.get(
  "/:id",
  verifyAccessToken,
  adminOnly,
  flatIdParamValidator,
  getFlatById
);

router.put(
  "/:id",
  verifyAccessToken,
  adminOnly,
  updateFlatValidator,
  updateFlat
);

router.delete(
  "/:id",
  verifyAccessToken,
  adminOnly,
  flatIdParamValidator,
  deactivateFlat
);
export default router;
