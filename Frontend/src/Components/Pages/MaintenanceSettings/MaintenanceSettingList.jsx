import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Eye, History, RefreshCw } from "lucide-react";
import Dropdown from "../../ui/Dropdown";
import {
  getMaintenanceRuleHistory,
  getMaintenanceRules,
} from "../../../api/maintenance.api";

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const yesNoOptions = [
  { value: "all", label: "All" },
  { value: "yes", label: "Enabled" },
  { value: "no", label: "Disabled" },
];

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const date = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");
const labelize = (value) => String(value || "-").replaceAll("_", " ");

function Detail({ label, value }) {
  return (
    <div className='rounded-md bg-slate-50 p-3'>
      <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{label}</div>
      <div className='mt-1 text-sm font-semibold capitalize text-slate-950'>{value}</div>
    </div>
  );
}

function MaintenanceSettingList() {
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    late_fee: "all",
    noc: "all",
    search: "",
  });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const [ruleRes, historyRes] = await Promise.all([
        getMaintenanceRules(),
        getMaintenanceRuleHistory(),
      ]);
      setRules(ruleRes.data.data || []);
      setHistory(historyRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load billing rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const filteredRules = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return rules.filter((rule) => {
      if (filters.status !== "all" && rule.status !== filters.status) return false;
      if (filters.late_fee !== "all" && Boolean(rule.late_fee_enabled) !== (filters.late_fee === "yes")) return false;
      if (filters.noc !== "all" && Boolean(rule.noc_enabled) !== (filters.noc === "yes")) return false;
      if (!search) return true;
      return [rule.name, rule.rule_code, rule.penalty_method, rule.penalty_base]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [rules, filters]);

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-950'>
            Billing Rules
          </h2>
          <p className='text-sm text-slate-500'>
            Versioned maintenance settings, late fee rules, NOC rules, and change history.
          </p>
        </div>
        <button
          type='button'
          onClick={fetchRules}
          className='inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800'
          title='Refresh rules'>
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className='grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[160px_160px_160px_1fr]'>
        <Dropdown value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={statusOptions} />
        <Dropdown value={filters.late_fee} onChange={(value) => setFilters({ ...filters, late_fee: value })} options={yesNoOptions} />
        <Dropdown value={filters.noc} onChange={(value) => setFilters({ ...filters, noc: value })} options={yesNoOptions} />
        <input
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          placeholder='Search rule name, code, method, base'
          className='h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
        />
      </div>

      <div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='bg-slate-100 text-left text-slate-600'>
              <tr>
                <th className='px-4 py-3'>Rule</th>
                <th className='px-4 py-3'>Maintenance</th>
                <th className='px-4 py-3'>NOC</th>
                <th className='px-4 py-3'>Late Fee</th>
                <th className='px-4 py-3'>Applies To</th>
                <th className='px-4 py-3'>Method</th>
                <th className='px-4 py-3'>Effective</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan='9' className='px-4 py-8 text-center text-slate-500'>Loading rules...</td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan='9' className='px-4 py-8 text-center text-slate-500'>No billing rules found</td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.id} className='border-t border-slate-100'>
                    <td className='px-4 py-3'>
                      <div className='font-medium text-slate-950'>{rule.name}</div>
                      <div className='text-xs text-slate-500'>{rule.rule_code}</div>
                    </td>
                    <td className='px-4 py-3 font-semibold'>{money(rule.maintenance_amount)}</td>
                    <td className='px-4 py-3'>
                      {rule.noc_enabled
                        ? `${rule.noc_calculation_type === "percentage" ? `${rule.noc_value}%` : money(rule.noc_value)}`
                        : "Disabled"}
                    </td>
                    <td className='px-4 py-3'>
                      {rule.late_fee_enabled
                        ? `${rule.penalty_type === "percentage" ? `${rule.penalty_rate_value}%` : money(rule.penalty_rate_value)} / ${rule.penalty_rate_period}`
                        : "Disabled"}
                    </td>
                    <td className='px-4 py-3'>
                      {[
                        rule.penalty_applies_maintenance ? "Maintenance" : null,
                        rule.penalty_applies_noc ? "NOC" : null,
                      ].filter(Boolean).join(" + ") || "-"}
                    </td>
                    <td className='px-4 py-3 capitalize'>{labelize(rule.penalty_method)}</td>
                    <td className='px-4 py-3'>{date(rule.effective_from)}</td>
                    <td className='px-4 py-3 capitalize'>{rule.status}</td>
                    <td className='px-4 py-3'>
                      <div className='flex justify-end'>
                        <button
                          type='button'
                          onClick={() => setSelectedRule(rule)}
                          className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50'
                          title='View rule'>
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRule && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4'>
          <button className='absolute inset-0' type='button' onClick={() => setSelectedRule(null)} aria-label='Close' />
          <section className='relative max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-2xl'>
            <div className='flex items-center justify-between border-b border-slate-200 p-5'>
              <div>
                <h3 className='text-lg font-semibold text-slate-950'>{selectedRule.name}</h3>
                <p className='text-sm text-slate-500'>Complete read-only billing rule details</p>
              </div>
              <button type='button' onClick={() => setSelectedRule(null)} className='rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100'>Close</button>
            </div>
            <div className='grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3'>
              <Detail label='Maintenance' value={money(selectedRule.maintenance_amount)} />
              <Detail label='NOC' value={selectedRule.noc_enabled ? `${labelize(selectedRule.noc_calculation_type)} ${selectedRule.noc_value}` : "Disabled"} />
              <Detail label='Late Fee' value={selectedRule.late_fee_enabled ? "Enabled" : "Disabled"} />
              <Detail label='Penalty' value={`${selectedRule.penalty_rate_value || 0} ${selectedRule.penalty_type === "percentage" ? "%" : "Rs."} / ${selectedRule.penalty_rate_period}`} />
              <Detail label='Method' value={labelize(selectedRule.penalty_method)} />
              <Detail label='Base' value={labelize(selectedRule.penalty_base)} />
              <Detail label='Grace Period' value={`${selectedRule.grace_days || selectedRule.interest_grace_days || 0} days`} />
              <Detail label='Due Day' value={selectedRule.due_day || 10} />
              <Detail label='Max Penalty' value={selectedRule.max_penalty_enabled ? money(selectedRule.max_penalty_amount) : "No Limit"} />
            </div>
            <div className='border-t border-slate-200 p-5'>
              <div className='mb-3 flex items-center gap-2 font-semibold text-slate-950'>
                <History size={17} />
                Recent History
              </div>
              <div className='space-y-2'>
                {history
                  .filter((item) => Number(item.rule_id) === Number(selectedRule.id))
                  .slice(0, 6)
                  .map((item) => (
                    <div key={item.id} className='rounded-md bg-slate-50 p-3 text-sm text-slate-700'>
                      <span className='font-semibold capitalize'>{labelize(item.action)}</span>
                      <span className='text-slate-500'> by {item.admin_name || "Admin"} on {date(item.created_at)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default MaintenanceSettingList;
