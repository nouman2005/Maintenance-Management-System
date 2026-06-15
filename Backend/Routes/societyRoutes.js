import express from "express";
import {
  createSociety,
  approveSocietyRegistrationRequest,
  deactivateSociety,
  getSocieties,
  getSocietyById,
  getSocietyRegistrationRequests,
  rejectSocietyRegistrationRequest,
  requestSocietyRegistration,
  updateSociety,
} from "../Controllers/societyController.js";
import { verifyAccessToken } from "../Middlewares/verifyAccessToken.js";
import { superAdminOnly } from "../Middlewares/superAdminMiddleware.js";
import {
  createSocietyValidator,
  registrationRequestStatusValidator,
  rejectRegistrationRequestValidator,
  societyRegistrationRequestValidator,
  societyIdParamValidator,
  societyListValidator,
  updateSocietyValidator,
} from "../validators/societyValidator.js";

const router = express.Router();

router.post(
  "/register-request",
  societyRegistrationRequestValidator,
  requestSocietyRegistration
);

router.get(
  "/registration-requests",
  verifyAccessToken,
  superAdminOnly,
  registrationRequestStatusValidator,
  getSocietyRegistrationRequests
);

router.patch(
  "/registration-requests/:id/approve",
  verifyAccessToken,
  superAdminOnly,
  societyIdParamValidator,
  approveSocietyRegistrationRequest
);

router.patch(
  "/registration-requests/:id/reject",
  verifyAccessToken,
  superAdminOnly,
  rejectRegistrationRequestValidator,
  rejectSocietyRegistrationRequest
);

router.post(
  "/createSociety",
  verifyAccessToken,
  superAdminOnly,
  createSocietyValidator,
  createSociety
);

router.get(
  "/",
  verifyAccessToken,
  superAdminOnly,
  societyListValidator,
  getSocieties
);

router.get("/:id", verifyAccessToken, societyIdParamValidator, getSocietyById);

router.put(
  "/:id",
  verifyAccessToken,
  superAdminOnly,
  updateSocietyValidator,
  updateSociety
);

router.delete(
  "/:id",
  verifyAccessToken,
  superAdminOnly,
  societyIdParamValidator,
  deactivateSociety
);
export default router;
