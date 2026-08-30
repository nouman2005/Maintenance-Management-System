import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Calculator, CalendarDays, Info, Save, Settings } from "lucide-react";
import Dropdown from "../../ui/Dropdown";
import {
  getMaintenanceCalculationPreview,
  getMaintenanceRules,
  saveMaintenanceRule,
} from "../../../api/maintenance.api";

const initialForm = {
  name: "Default monthly maintenance rule",
  maintenance_amount: "500",
  billing_frequency: "monthly",
  due_day: "10",
  noc_enabled: true,
  noc_calculation_type: "fixed",
  noc_value: "0",
  late_fee_enabled: true,
  penalty_type: "percentage",
  penalty_rate_value: "1",
  penalty_rate_period: "monthly",
  penalty_frequency: "monthly",
  penalty_method: "simple",
  penalty_base: "original_eligible_charges",
  penalty_applies_maintenance: true,
  penalty_applies_noc: false,
  grace_days: "5",
  max_penalty_enabled: false,
  max_penalty_amount: "",
  rounding_mode: "nearest",
  effective_from: new Date().toISOString().slice(0, 10),
  reason: "",
};

const yesNoOptions = [
  { value: true, label: "Enabled" },
  { value: false, label: "Disabled" },
];
const calcTypeOptions = [
  { value: "fixed", label: "Fixed Amount" },
  { value: "percentage", label: "Percentage" },
];
const ratePeriodOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];
const frequencyOptions = [
  { value: "one_time", label: "One Time" },
  { value: "monthly", label: "Monthly" },
];
const methodOptions = [
  { value: "simple", label: "Simple" },
  { value: "compound", label: "Compound" },
];
const baseOptions = [
  { value: "original_eligible_charges", label: "Original Eligible Charges" },
  { value: "current_outstanding", label: "Current Outstanding" },
  {
    value: "outstanding_including_previous_penalties",
    label: "Outstanding Including Previous Penalties",
  },
];
const roundingOptions = [
  { value: "nearest", label: "Round Nearest" },
  { value: "floor", label: "Round Down" },
  { value: "ceil", label: "Round Up" },
  { value: "none", label: "No Rounding" },
];

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function Field({ label, helper, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className='mb-1.5 block text-sm font-medium text-slate-700'>
        {label}
      </span>
      {children}
      {helper && <span className='mt-1.5 block text-xs leading-5 text-slate-500'>{helper}</span>}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type='button'
      onClick={() => onChange(!checked)}
      className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
        checked
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}>
      <span className={`h-4 w-4 rounded border ${checked ? "border-sky-600 bg-sky-600" : "border-slate-300"}`} />
      {label}
    </button>
  );
}

function PreviewPanel({ preview, form }) {
  const monthlyEquivalent =
    form.penalty_rate_period === "yearly"
      ? Number(form.penalty_rate_value || 0) / 12
      : Number(form.penalty_rate_value || 0);
  const yearlyReference =
    form.penalty_rate_period === "monthly"
      ? Number(form.penalty_rate_value || 0) * 12
      : Number(form.penalty_rate_value || 0);

  return (
    <section className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='mb-4 flex items-center gap-2 font-semibold text-slate-950'>
        <Calculator size={18} className='text-sky-600' />
        Calculation Preview
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='rounded-md bg-slate-50 p-3'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Maintenance</div>
          <div className='mt-1 text-lg font-semibold text-slate-950'>{money(preview?.current?.maintenance)}</div>
        </div>
        <div className='rounded-md bg-slate-50 p-3'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>NOC</div>
          <div className='mt-1 text-lg font-semibold text-slate-950'>{money(preview?.current?.noc)}</div>
        </div>
        <div className='rounded-md bg-slate-50 p-3'>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Example Penalty</div>
          <div className='mt-1 text-lg font-semibold text-slate-950'>{money(preview?.current?.penalty)}</div>
        </div>
        <div className='rounded-md bg-slate-950 p-3 text-white'>
          <div className='text-xs font-semibold uppercase tracking-wide text-white/70'>Current Total</div>
          <div className='mt-1 text-lg font-semibold'>{money(preview?.current?.total)}</div>
        </div>
      </div>

      <div className='mt-4 rounded-md border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900'>
        {form.penalty_rate_period === "yearly"
          ? `${form.penalty_rate_value || 0}% yearly is treated as ${monthlyEquivalent.toFixed(2)}% per month.`
          : `${form.penalty_rate_value || 0}% monthly is shown as ${yearlyReference.toFixed(2)}% yearly reference.`}
      </div>

      <div className='mt-4 space-y-3'>
        {(preview?.months || []).map((row) => (
          <div key={row.month} className='rounded-md border border-slate-200 p-3 text-sm'>
            <div className='mb-2 font-semibold text-slate-950'>{row.month}</div>
            <div className='grid gap-2 sm:grid-cols-2'>
              <span>Previous Outstanding: {money(row.previous_outstanding)}</span>
              <span>Current Maintenance: {money(row.maintenance)}</span>
              <span>NOC: {money(row.noc)}</span>
              <span>Subtotal: {money(row.subtotal)}</span>
              <span>Penalty: {money(row.penalty)}</span>
              <span className='font-semibold'>Outstanding: {money(row.outstanding)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AddMaintenanceSetting() {
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const activeTargets = useMemo(
    () => [
      form.penalty_applies_maintenance ? "Maintenance" : null,
      form.penalty_applies_noc ? "NOC" : null,
    ].filter(Boolean).join(" + ") || "No charge selected",
    [form.penalty_applies_maintenance, form.penalty_applies_noc]
  );

  useEffect(() => {
    let active = true;
    getMaintenanceCalculationPreview(form)
      .then((res) => {
        if (active) setPreview(res.data.data);
      })
      .catch(() => {
        if (active) setPreview(null);
      });
    return () => {
      active = false;
    };
  }, [form]);

  useEffect(() => {
    let active = true;
    getMaintenanceRules()
      .then((res) => {
        const current = (res.data.data || []).find((item) => item.status === "active");
        if (active && current) {
          setForm((existing) => ({
            ...existing,
            ...Object.fromEntries(
              Object.entries(current).filter(([, value]) => value !== null && value !== undefined)
            ),
            noc_enabled: Boolean(current.noc_enabled),
            late_fee_enabled: Boolean(current.late_fee_enabled),
            penalty_applies_maintenance: Boolean(current.penalty_applies_maintenance),
            penalty_applies_noc: Boolean(current.penalty_applies_noc),
            max_penalty_enabled: Boolean(current.max_penalty_enabled),
          }));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await saveMaintenanceRule(form);
      toast.success("Maintenance billing rule saved");
    } catch (err) {
      const errors = err?.response?.data?.errors;
      toast.error(errors?.[0]?.msg || err.response?.data?.message || "Failed to save rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='mx-auto max-w-6xl space-y-5'>
      <div className='border-b border-slate-200 pb-4'>
        <h2 className='text-2xl font-semibold text-slate-950'>
          Maintenance Billing Rules
        </h2>
        <p className='text-sm text-slate-500'>
          Configure society-specific maintenance, NOC, due dates, grace period, and late-fee rules.
        </p>
      </div>

      <form onSubmit={submit} className='grid gap-5 xl:grid-cols-[1fr_380px]'>
        <div className='space-y-5'>
          <section className='rounded-lg border border-slate-200 bg-white shadow-sm'>
            <div className='border-b border-slate-200 p-5'>
              <div className='flex items-center gap-2 text-sm font-semibold text-slate-800'>
                <Settings size={18} className='text-sky-600' />
                General Maintenance
              </div>
            </div>
            <div className='grid gap-4 p-5 sm:grid-cols-2'>
              <Field label='Rule Name'>
                <TextInput value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </Field>
              <Field label='Maintenance Amount'>
                <TextInput type='number' min='0' step='0.01' value={form.maintenance_amount} onChange={(e) => update("maintenance_amount", e.target.value)} required />
              </Field>
              <Field label='Billing Frequency'>
                <Dropdown value={form.billing_frequency} onChange={(value) => update("billing_frequency", value)} options={[{ value: "monthly", label: "Monthly" }]} />
              </Field>
              <Field label='Due Day' helper='Day of the billing month when payment is due.'>
                <TextInput type='number' min='1' max='31' value={form.due_day} onChange={(e) => update("due_day", e.target.value)} required />
              </Field>
              <Field label='Effective From'>
                <TextInput type='date' value={form.effective_from} onChange={(e) => update("effective_from", e.target.value)} />
              </Field>
              <Field label='Change Reason'>
                <TextInput value={form.reason} onChange={(e) => update("reason", e.target.value)} placeholder='Optional history note' />
              </Field>
            </div>
          </section>

          <section className='rounded-lg border border-slate-200 bg-white shadow-sm'>
            <div className='border-b border-slate-200 p-5 font-semibold text-slate-800'>
              NOC / Tenant Charges
            </div>
            <div className='grid gap-4 p-5 sm:grid-cols-3'>
              <Field label='NOC Enabled'>
                <Dropdown value={form.noc_enabled} onChange={(value) => update("noc_enabled", value)} options={yesNoOptions} />
              </Field>
              <Field label='Calculation Type'>
                <Dropdown value={form.noc_calculation_type} onChange={(value) => update("noc_calculation_type", value)} options={calcTypeOptions} disabled={!form.noc_enabled} />
              </Field>
              <Field label={form.noc_calculation_type === "percentage" ? "NOC Rate %" : "NOC Amount"}>
                <TextInput type='number' min='0' step='0.01' value={form.noc_value} onChange={(e) => update("noc_value", e.target.value)} disabled={!form.noc_enabled} />
              </Field>
            </div>
          </section>

          <section className='rounded-lg border border-slate-200 bg-white shadow-sm'>
            <div className='border-b border-slate-200 p-5 font-semibold text-slate-800'>
              Late Fee / Penalty
            </div>
            <div className='grid gap-4 p-5 sm:grid-cols-2'>
              <Field label='Enable Late Fee'>
                <Dropdown value={form.late_fee_enabled} onChange={(value) => update("late_fee_enabled", value)} options={yesNoOptions} />
              </Field>
              <Field label='Grace Period' helper='Number of days after due date before late fee applies.'>
                <TextInput type='number' min='0' value={form.grace_days} onChange={(e) => update("grace_days", e.target.value)} disabled={!form.late_fee_enabled} />
              </Field>
              <Field label='Penalty Type'>
                <Dropdown value={form.penalty_type} onChange={(value) => update("penalty_type", value)} options={calcTypeOptions} disabled={!form.late_fee_enabled} />
              </Field>
              <Field label={form.penalty_type === "percentage" ? "Penalty Rate %" : "Penalty Amount"}>
                <TextInput type='number' min='0' step='0.01' value={form.penalty_rate_value} onChange={(e) => update("penalty_rate_value", e.target.value)} disabled={!form.late_fee_enabled} />
              </Field>
              <Field label='Rate Period' helper='Yearly rates are divided by 12 for monthly billing.'>
                <Dropdown value={form.penalty_rate_period} onChange={(value) => update("penalty_rate_period", value)} options={ratePeriodOptions} disabled={!form.late_fee_enabled || form.penalty_type === "fixed"} />
              </Field>
              <Field label='Penalty Frequency'>
                <Dropdown value={form.penalty_frequency} onChange={(value) => update("penalty_frequency", value)} options={frequencyOptions} disabled={!form.late_fee_enabled} />
              </Field>
              <div className='sm:col-span-2'>
                <div className='mb-2 text-sm font-medium text-slate-700'>Penalty Applies To</div>
                <div className='flex flex-wrap gap-2'>
                  <Toggle checked={form.penalty_applies_maintenance} onChange={(value) => update("penalty_applies_maintenance", value)} label='Maintenance' />
                  <Toggle checked={form.penalty_applies_noc} onChange={(value) => update("penalty_applies_noc", value)} label='NOC' />
                </div>
                <p className='mt-2 text-xs text-slate-500'>Current selection: {activeTargets}</p>
              </div>
            </div>
          </section>

          <section className='rounded-lg border border-slate-200 bg-white shadow-sm'>
            <button
              type='button'
              onClick={() => setAdvancedOpen((current) => !current)}
              className='flex w-full items-center justify-between border-b border-slate-200 p-5 text-left font-semibold text-slate-800'>
              Advanced Rules
              <span className='text-sm text-slate-500'>{advancedOpen ? "Hide" : "Show"}</span>
            </button>
            {advancedOpen && (
              <div className='grid gap-4 p-5 sm:grid-cols-2'>
                <Field label='Penalty Method' helper='Simple avoids repeatedly applying penalty to previous penalties. Compound can use outstanding balances as the base.'>
                  <Dropdown value={form.penalty_method} onChange={(value) => update("penalty_method", value)} options={methodOptions} />
                </Field>
                <Field label='Penalty Base'>
                  <Dropdown value={form.penalty_base} onChange={(value) => update("penalty_base", value)} options={baseOptions} />
                </Field>
                <Field label='Maximum Penalty'>
                  <Dropdown value={form.max_penalty_enabled} onChange={(value) => update("max_penalty_enabled", value)} options={[{ value: false, label: "No Limit" }, { value: true, label: "Maximum Amount" }]} />
                </Field>
                <Field label='Maximum Amount'>
                  <TextInput type='number' min='0' step='0.01' value={form.max_penalty_amount} onChange={(e) => update("max_penalty_amount", e.target.value)} disabled={!form.max_penalty_enabled} />
                </Field>
                <Field label='Rounding'>
                  <Dropdown value={form.rounding_mode} onChange={(value) => update("rounding_mode", value)} options={roundingOptions} />
                </Field>
              </div>
            )}
          </section>

          <div className='flex justify-end'>
            <button
              type='submit'
              disabled={loading}
              className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'>
              <Save size={16} />
              {loading ? "Saving..." : "Save Billing Rule"}
            </button>
          </div>
        </div>

        <div className='space-y-5'>
          <PreviewPanel preview={preview} form={form} />
          <section className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
            <div className='mb-3 flex items-center gap-2 font-semibold text-slate-950'>
              <Info size={18} className='text-sky-600' />
              How late fee works
            </div>
            <p className='text-sm leading-6 text-slate-600'>
              If a month is unpaid, its outstanding carries forward. The next bill adds previous outstanding plus the current month charge, then applies penalty only after the due date and grace period.
            </p>
            <div className='mt-3 flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600'>
              <CalendarDays size={16} />
              Due day {form.due_day || 10}, grace {form.grace_days || 0} day(s).
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}

export default AddMaintenanceSetting;
