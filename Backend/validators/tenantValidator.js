import { body, param } from "express-validator";

export const addTenantValidation = [
  body("flat_id").isInt().withMessage("Flat ID is required"),
  body("tenant_name").notEmpty().withMessage("Tenant name is required"),
  body("tenant_phone").isMobilePhone().withMessage("Valid phone required"),
  body("move_in_date").notEmpty().withMessage("Move-in date required"),
];

export const tenantIdValidation = [
  param("id").isInt().withMessage("Valid Tenant ID is required"),
];
