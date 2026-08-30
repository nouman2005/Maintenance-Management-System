import db from "../Config/db.js";

const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (value) => Number((Number(value || 0) / 100).toFixed(2));

export const firstDay = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text.slice(0, 7)}-01`;
  return null;
};

export const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next.toISOString().slice(0, 10);
};

export const monthEnd = (periodMonth) => {
  const period = new Date(periodMonth);
  return new Date(period.getFullYear(), period.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
};

const normalizeRule = (rule = {}) => {
  const penaltyRateValue =
    rule.penalty_rate_value ?? rule.interest_rate_monthly ?? 0;
  const penaltyRatePeriod = rule.penalty_rate_period || "monthly";
  const monthlyRate =
    penaltyRatePeriod === "yearly"
      ? Number(penaltyRateValue || 0) / 12
      : Number(penaltyRateValue || 0);

  return {
    id: rule.id || null,
    name: rule.name || "Default monthly maintenance rule",
    maintenance_amount: Number(rule.maintenance_amount || 0),
    billing_frequency: rule.billing_frequency || "monthly",
    due_day: Number(rule.due_day || 10),
    noc_enabled: Boolean(rule.noc_enabled ?? true),
    noc_calculation_type: rule.noc_calculation_type || "fixed",
    noc_value: Number(rule.noc_value || 0),
    late_fee_enabled: Boolean(rule.late_fee_enabled ?? Number(rule.interest_rate_monthly || 0) > 0),
    penalty_type: rule.penalty_type || "percentage",
    penalty_rate_value: Number(penaltyRateValue || 0),
    penalty_rate_period: penaltyRatePeriod,
    monthly_penalty_rate: Number(monthlyRate.toFixed(4)),
    penalty_frequency: rule.penalty_frequency || "monthly",
    penalty_method:
      rule.penalty_method ||
      (rule.interest_method === "compound_monthly" ? "compound" : "simple"),
    penalty_base: rule.penalty_base || "original_eligible_charges",
    penalty_applies_maintenance: Boolean(rule.penalty_applies_maintenance ?? true),
    penalty_applies_noc: Boolean(
      rule.penalty_applies_noc ?? !Boolean(rule.exclude_noc_from_interest),
    ),
    grace_days: Number(rule.grace_days ?? rule.interest_grace_days ?? 0),
    max_penalty_enabled: Boolean(rule.max_penalty_enabled ?? false),
    max_penalty_amount: Number(rule.max_penalty_amount || 0),
    rounding_mode: rule.rounding_mode || "nearest",
    effective_from: rule.effective_from || null,
    effective_to: rule.effective_to || null,
    status: rule.status || "active",
  };
};

export const getApplicableMaintenanceRule = async ({
  connection = db,
  societyId,
  periodMonth,
}) => {
  const [rows] = await connection.query(
    `SELECT *
     FROM maintenance_rule_configs
     WHERE society_id = ?
       AND status = 'active'
       AND effective_from <= ?
       AND (effective_to IS NULL OR effective_to >= ?)
     ORDER BY effective_from DESC, id DESC
     LIMIT 1`,
    [societyId, periodMonth, periodMonth],
  );

  return normalizeRule(rows[0]);
};

export const getPreviousOutstanding = async ({
  connection = db,
  societyId,
  flatId,
  periodMonth,
}) => {
  const [[row]] = await connection.query(
    `SELECT COALESCE(SUM(total_balance), 0) AS previous_outstanding
     FROM maintenance_charges
     WHERE society_id = ?
       AND flat_id = ?
       AND period_month < ?
       AND status <> 'cancelled'`,
    [societyId, flatId, periodMonth],
  );
  return Number(row?.previous_outstanding || 0);
};

export const calculateDueDate = (periodMonth, dueDay = 10) => {
  const period = new Date(periodMonth);
  const lastDay = new Date(period.getFullYear(), period.getMonth() + 1, 0).getDate();
  const day = Math.min(Math.max(Number(dueDay || 10), 1), lastDay);
  return `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const calculateNoc = ({ rule, maintenanceAmount, tenantNocCharge, hasTenant }) => {
  if (!rule.noc_enabled || !hasTenant) return 0;
  if (Number(tenantNocCharge || 0) > 0) return Number(tenantNocCharge || 0);
  if (rule.noc_calculation_type === "percentage") {
    return fromCents(Math.round((toCents(maintenanceAmount) * rule.noc_value) / 100));
  }
  return Number(rule.noc_value || 0);
};

const calculatePenalty = ({
  rule,
  maintenanceAmount,
  nocAmount,
  previousOutstanding,
  asOfDate,
  penaltyEligibilityDate,
}) => {
  if (!rule.late_fee_enabled || !asOfDate || asOfDate < penaltyEligibilityDate) {
    return { penalty: 0, base: 0 };
  }

  let baseCents = 0;
  if (rule.penalty_base === "current_outstanding") {
    baseCents = toCents(previousOutstanding) + toCents(maintenanceAmount) + toCents(nocAmount);
  } else if (rule.penalty_base === "outstanding_including_previous_penalties") {
    baseCents = toCents(previousOutstanding) + toCents(maintenanceAmount) + toCents(nocAmount);
  } else {
    if (rule.penalty_applies_maintenance) baseCents += toCents(maintenanceAmount);
    if (rule.penalty_applies_noc) baseCents += toCents(nocAmount);
  }

  let penaltyCents = 0;
  if (rule.penalty_type === "fixed") {
    penaltyCents = toCents(rule.penalty_rate_value);
  } else {
    penaltyCents = Math.round((baseCents * rule.monthly_penalty_rate) / 100);
  }

  if (rule.max_penalty_enabled && rule.max_penalty_amount >= 0) {
    penaltyCents = Math.min(penaltyCents, toCents(rule.max_penalty_amount));
  }

  return { penalty: fromCents(penaltyCents), base: fromCents(baseCents) };
};

export const calculateMonthlyBill = async ({
  connection = db,
  societyId,
  flat,
  periodMonth,
  asOfDate = null,
}) => {
  const rule = await getApplicableMaintenanceRule({ connection, societyId, periodMonth });
  const previousOutstanding = await getPreviousOutstanding({
    connection,
    societyId,
    flatId: flat.id,
    periodMonth,
  });
  const dueDate = calculateDueDate(periodMonth, rule.due_day);
  const penaltyEligibilityDate = addDays(dueDate, rule.grace_days + 1);
  const maintenanceAmount =
    rule.maintenance_amount > 0
      ? rule.maintenance_amount
      : Number(flat.maintenance_amount || 0);
  const nocAmount = calculateNoc({
    rule,
    maintenanceAmount,
    tenantNocCharge: flat.noc_charge,
    hasTenant: Boolean(flat.has_active_tenant),
  });
  const { penalty, base } = calculatePenalty({
    rule,
    maintenanceAmount,
    nocAmount,
    previousOutstanding,
    asOfDate,
    penaltyEligibilityDate,
  });
  const currentCharges = fromCents(toCents(maintenanceAmount) + toCents(nocAmount));
  const totalDue = fromCents(
    toCents(previousOutstanding) + toCents(currentCharges) + toCents(penalty),
  );

  return {
    rule,
    rule_id: rule.id,
    period_month: periodMonth,
    due_date: dueDate,
    penalty_eligibility_date: penaltyEligibilityDate,
    previous_outstanding: previousOutstanding,
    maintenance_charge: maintenanceAmount,
    noc_charge: nocAmount,
    current_charge: currentCharges,
    penalty_charge: penalty,
    penalty_base_amount: base,
    total_due: totalDue,
    total_balance: totalDue,
    snapshot: {
      maintenance_amount: maintenanceAmount,
      noc_amount: nocAmount,
      previous_outstanding: previousOutstanding,
      penalty_rate_value: rule.penalty_rate_value,
      penalty_rate_period: rule.penalty_rate_period,
      monthly_penalty_rate: rule.monthly_penalty_rate,
      penalty_type: rule.penalty_type,
      penalty_frequency: rule.penalty_frequency,
      penalty_method: rule.penalty_method,
      penalty_base: rule.penalty_base,
      penalty_applies_to: [
        rule.penalty_applies_maintenance ? "maintenance" : null,
        rule.penalty_applies_noc ? "noc" : null,
      ].filter(Boolean),
      grace_days: rule.grace_days,
      due_date: dueDate,
      penalty_eligibility_date: penaltyEligibilityDate,
      max_penalty_enabled: rule.max_penalty_enabled,
      max_penalty_amount: rule.max_penalty_amount,
    },
  };
};

export const buildPreview = (input = {}) => {
  const rule = normalizeRule({
    ...input,
    maintenance_amount: input.maintenance_amount || input.example_maintenance || 500,
    noc_value: input.noc_value || input.example_noc || 0,
  });
  const maintenanceAmount = Number(input.example_maintenance || rule.maintenance_amount || 500);
  const nocAmount = rule.noc_enabled
    ? rule.noc_calculation_type === "percentage"
      ? fromCents(Math.round((toCents(maintenanceAmount) * rule.noc_value) / 100))
      : Number(rule.noc_value || input.example_noc || 0)
    : 0;
  const dueDate = "2026-08-10";
  const penaltyEligibilityDate = addDays(dueDate, rule.grace_days + 1);
  const month1Penalty = calculatePenalty({
    rule,
    maintenanceAmount,
    nocAmount,
    previousOutstanding: 0,
    asOfDate: "2026-08-16",
    penaltyEligibilityDate,
  }).penalty;
  const month1Outstanding = fromCents(
    toCents(maintenanceAmount) + toCents(nocAmount) + toCents(month1Penalty),
  );
  const month2Penalty = calculatePenalty({
    rule,
    maintenanceAmount,
    nocAmount,
    previousOutstanding: month1Outstanding,
    asOfDate: "2026-09-16",
    penaltyEligibilityDate: "2026-09-16",
  }).penalty;
  const month2Subtotal = fromCents(
    toCents(month1Outstanding) + toCents(maintenanceAmount) + toCents(nocAmount),
  );
  const month2Outstanding = fromCents(toCents(month2Subtotal) + toCents(month2Penalty));

  return {
    rule,
    current: {
      maintenance: maintenanceAmount,
      noc: nocAmount,
      penalty: month1Penalty,
      total: month1Outstanding,
      due_date: dueDate,
      penalty_eligibility_date: penaltyEligibilityDate,
    },
    months: [
      {
        month: "Month 1",
        previous_outstanding: 0,
        maintenance: maintenanceAmount,
        noc: nocAmount,
        subtotal: fromCents(toCents(maintenanceAmount) + toCents(nocAmount)),
        penalty: month1Penalty,
        outstanding: month1Outstanding,
      },
      {
        month: "Month 2",
        previous_outstanding: month1Outstanding,
        maintenance: maintenanceAmount,
        noc: nocAmount,
        subtotal: month2Subtotal,
        penalty: month2Penalty,
        outstanding: month2Outstanding,
      },
    ],
  };
};
