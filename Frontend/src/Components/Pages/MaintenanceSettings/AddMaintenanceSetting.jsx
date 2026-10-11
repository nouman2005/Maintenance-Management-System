import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, Settings, TrendingUp } from "lucide-react";
import Dropdown from "../../ui/Dropdown";
import { applyMaintenanceRevision, getMaintenanceRevisions, getMaintenanceRules, previewMaintenanceRevision, saveMaintenanceRule } from "../../../api/maintenance.api";

const today = new Date().toISOString().slice(0, 10);
const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const yesNo = [{ value: true, label: "Enabled" }, { value: false, label: "Disabled" }];
const calculationTypes = [{ value: "fixed", label: "Fixed Amount" }, { value: "percentage", label: "Percentage" }];
const revisionTypes = [{ value: "fixed_increase", label: "Fixed Increase" }, { value: "per_sqft_increase", label: "Per Square Foot Increase" }];
const Input = (props) => <input {...props} className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100' />;
const Field = ({ label, children }) => <label className='block'><span className='mb-1.5 block text-sm font-medium text-slate-700'>{label}</span>{children}</label>;

export default function AddMaintenanceSetting() {
  const [rules, setRules] = useState({ noc_enabled: true, noc_calculation_type: "fixed", noc_value: "0", late_fee_enabled: true, penalty_type: "percentage", penalty_rate_value: "1", grace_days: "5" });
  const [revision, setRevision] = useState({ name: "", revision_type: "fixed_increase", increase_amount: "", effective_from: today, reason: "", notes: "" });
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const setRule = (key, value) => setRules((current) => ({ ...current, [key]: value }));
  const setRevisionValue = (key, value) => { setPreview(null); setRevision((current) => ({ ...current, [key]: value })); };
  const load = async () => {
    try {
      const [ruleResponse, revisionResponse] = await Promise.all([getMaintenanceRules(), getMaintenanceRevisions()]);
      const active = (ruleResponse.data.data || []).find((rule) => rule.status === "active");
      if (active) setRules((current) => ({ ...current, ...active, noc_enabled: Boolean(active.noc_enabled), late_fee_enabled: Boolean(active.late_fee_enabled) }));
      setHistory(revisionResponse.data.data || []);
    } catch { toast.error("Unable to load maintenance settings"); }
  };
  useEffect(() => { load(); }, []);
  const saveRules = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      await saveMaintenanceRule({ ...rules, name: "Society billing rules", billing_frequency: "monthly", due_day: 10, effective_from: today, penalty_rate_period: "monthly", penalty_frequency: "monthly", penalty_method: "simple", penalty_base: "original_eligible_charges", penalty_applies_maintenance: true, penalty_applies_noc: false, max_penalty_enabled: false, max_penalty_amount: null, rounding_mode: "nearest", noc_value: rules.noc_enabled ? rules.noc_value || null : null, penalty_rate_value: rules.late_fee_enabled ? rules.penalty_rate_value || null : null });
      toast.success("NOC and late-fee settings saved");
    } catch (error) { toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || "Unable to save settings"); }
    finally { setBusy(false); }
  };
  const previewRevision = async (event) => {
    event.preventDefault(); setBusy(true);
    try { const response = await previewMaintenanceRevision(revision); setPreview(response.data.data); }
    catch (error) { toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || "Unable to preview revision"); }
    finally { setBusy(false); }
  };
  const applyRevision = async () => {
    if (!preview || !window.confirm(`Apply this revision to ${preview.affected_flats} flat(s)? Existing bills and receipts will not change.`)) return;
    setBusy(true);
    try { await applyMaintenanceRevision(revision); toast.success("Maintenance revision applied"); setPreview(null); setRevision({ name: "", revision_type: "fixed_increase", increase_amount: "", effective_from: today, reason: "", notes: "" }); load(); }
    catch (error) { toast.error(error.response?.data?.message || "Unable to apply revision"); }
    finally { setBusy(false); }
  };
  return <div className='mx-auto max-w-6xl space-y-5'>
    <div className='border-b border-slate-200 pb-4'><h2 className='text-2xl font-semibold text-slate-950'>Maintenance Settings</h2><p className='text-sm text-slate-500'>Flat-level maintenance amounts are managed from Flats. Configure NOC, late fees, and future revisions here.</p></div>
    <form onSubmit={saveRules} className='space-y-5'>
      <section className='rounded-lg border border-slate-200 bg-white shadow-sm'><div className='flex items-center gap-2 border-b border-slate-200 p-5 font-semibold text-slate-800'><Settings size={18} className='text-sky-600' />NOC Settings</div><div className='grid gap-4 p-5 sm:grid-cols-3'><Field label='NOC'><Dropdown value={rules.noc_enabled} onChange={(value) => setRule("noc_enabled", value)} options={yesNo} /></Field><Field label='Calculation Type'><Dropdown value={rules.noc_calculation_type} onChange={(value) => setRule("noc_calculation_type", value)} options={calculationTypes} disabled={!rules.noc_enabled} /></Field><Field label={rules.noc_calculation_type === "percentage" ? "NOC Rate %" : "Monthly NOC Amount"}><Input type='number' min='0' step='0.01' value={rules.noc_value} disabled={!rules.noc_enabled} onChange={(event) => setRule("noc_value", event.target.value)} /></Field></div></section>
      <section className='rounded-lg border border-slate-200 bg-white shadow-sm'><div className='border-b border-slate-200 p-5 font-semibold text-slate-800'>Late Fee / Penalty</div><div className='grid gap-4 p-5 sm:grid-cols-2'><Field label='Late Fee'><Dropdown value={rules.late_fee_enabled} onChange={(value) => setRule("late_fee_enabled", value)} options={yesNo} /></Field><Field label='Grace Period (days)'><Input type='number' min='0' value={rules.grace_days} disabled={!rules.late_fee_enabled} onChange={(event) => setRule("grace_days", event.target.value)} /></Field><Field label='Penalty Type'><Dropdown value={rules.penalty_type} onChange={(value) => setRule("penalty_type", value)} options={calculationTypes} disabled={!rules.late_fee_enabled} /></Field><Field label={rules.penalty_type === "percentage" ? "Penalty Rate %" : "Penalty Amount"}><Input type='number' min='0' step='0.01' value={rules.penalty_rate_value} disabled={!rules.late_fee_enabled} onChange={(event) => setRule("penalty_rate_value", event.target.value)} /></Field></div><div className='flex justify-end border-t p-4'><button disabled={busy} className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'><Save size={16} />Save Settings</button></div></section>
    </form>
    <section className='rounded-lg border border-slate-200 bg-white shadow-sm'><div className='flex items-center gap-2 border-b border-slate-200 p-5 font-semibold text-slate-800'><TrendingUp size={18} className='text-sky-600' />Maintenance Revision</div><form onSubmit={previewRevision} className='grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3'><Field label='Revision Name'><Input required value={revision.name} onChange={(event) => setRevisionValue("name", event.target.value)} /></Field><Field label='Revision Type'><Dropdown value={revision.revision_type} onChange={(value) => setRevisionValue("revision_type", value)} options={revisionTypes} /></Field><Field label={revision.revision_type === "per_sqft_increase" ? "Increase per sq. ft." : "Monthly fixed increase"}><Input required type='number' min='0.01' step='0.01' value={revision.increase_amount} onChange={(event) => setRevisionValue("increase_amount", event.target.value)} /></Field><Field label='Effective From'><Input required type='date' value={revision.effective_from} onChange={(event) => setRevisionValue("effective_from", event.target.value)} /></Field><Field label='Reason'><Input required value={revision.reason} onChange={(event) => setRevisionValue("reason", event.target.value)} /></Field><Field label='Notes (optional)'><Input value={revision.notes} onChange={(event) => setRevisionValue("notes", event.target.value)} /></Field><div className='flex items-end'><button disabled={busy} className='h-10 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-60'>Preview Revision</button></div></form>
      {preview && <div className='border-t p-5'><div className='grid gap-3 sm:grid-cols-4'>{[["Affected Flats", preview.affected_flats], ["Current Total", money(preview.totals.current_monthly)], ["Monthly Increase", money(preview.totals.monthly_increase)], ["Revised Total", money(preview.totals.revised_monthly)]].map(([label, value]) => <div key={label} className='rounded bg-slate-50 p-3'><div className='text-xs font-semibold uppercase text-slate-500'>{label}</div><div className='mt-1 font-semibold'>{value}</div></div>)}</div><div className='mt-4 max-h-52 overflow-auto rounded border'><table className='min-w-full text-sm'><thead className='bg-slate-50'><tr><th className='p-2 text-left'>Flat</th><th className='p-2 text-left'>Current</th><th className='p-2 text-left'>Increase</th><th className='p-2 text-left'>Revised</th></tr></thead><tbody>{preview.flats.map((flat) => <tr key={flat.id} className='border-t'><td className='p-2'>{flat.wing}-{flat.flat_no}</td><td className='p-2'>{money(flat.previous_amount)}</td><td className='p-2'>{money(flat.increase_amount)}</td><td className='p-2'>{money(flat.new_amount)}</td></tr>)}</tbody></table></div><div className='mt-4 flex justify-end'><button type='button' onClick={applyRevision} disabled={busy} className='h-10 rounded-md bg-sky-600 px-4 text-sm font-medium text-white disabled:opacity-60'>Confirm and Apply Revision</button></div></div>}
    </section>
    <section className='rounded-lg border border-slate-200 bg-white shadow-sm'><div className='border-b p-5 font-semibold text-slate-800'>Revision History</div><div className='overflow-auto'><table className='min-w-full text-sm'><thead className='bg-slate-50'><tr><th className='p-3 text-left'>Revision</th><th className='p-3 text-left'>Effective</th><th className='p-3 text-left'>Increase</th><th className='p-3 text-left'>Flats</th></tr></thead><tbody>{history.length ? history.map((item) => <tr className='border-t' key={item.id}><td className='p-3'>{item.name}<div className='text-xs text-slate-500'>{item.reason}</div></td><td className='p-3'>{new Date(item.effective_from).toLocaleDateString("en-IN")}</td><td className='p-3'>{money(item.increase_amount)}</td><td className='p-3'>{item.affected_flats}</td></tr>) : <tr><td colSpan='4' className='p-6 text-center text-slate-500'>No maintenance revisions yet.</td></tr>}</tbody></table></div></section>
  </div>;
}
