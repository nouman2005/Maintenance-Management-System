import { body } from "express-validator";

export const flatValidation = [
  body("wing").notEmpty().withMessage("Wing is required"),
  body("floor_no").isInt().withMessage("Floor number required"),
  body("flat_no").notEmpty().withMessage("Flat number required"),
  body("owner_name").notEmpty().withMessage("Owner name required"),
  body("phone").isMobilePhone().withMessage("Valid phone required"),
  body("maintenance_amount")
    .isFloat({ min: 0 })
    .withMessage("Maintenance amount required"),
];
