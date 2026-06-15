import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Calculator,
  FileSpreadsheet,
  IndianRupee,
  ListChecks,
  RefreshCw,
  Save,
  Settings,
  Upload,
  Eye,
} from "lucide-react";
import { getFlatsPaginated } from "../../../api/flats.api";
import {
  addMaintenanceCharge,
  addOldMaintenanceDue,
  getMaintenanceBalances,
  getMaintenanceCharges,
  getFlatMaintenanceDetails,
  getMaintenanceImports,
  getMaintenanceReports,
  getMaintenanceRules,
  getMaintenanceSummary,
  importMaintenanceExcel,
  payMaintenance,
  recalculateMaintenanceInterest,
  exportFlatLedger,
  exportMaintenanceReport,
  saveMaintenanceRule,
} from "../../../api/maintenance.api";

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const today = new Date().toISOString().slice(0, 10);
const thisMonth = new Date().toISOString().slice(0, 7);
const numberValue = (value) => Number(value || 0);

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const tabs = [
  { id: "list", label: "Maintenance List", icon: Eye },
  { id: "add", label: "Monthly Entry", icon: ListChecks },
  { id: "old", label: "Old Entry", icon: Calculator },
  { id: "pay", label: "Pay Maintenance", icon: IndianRupee },
  { id: "dues", label: "Outstanding Dues", icon: Calculator },
  { id: "reports", label: "Reports", icon: FileSpreadsheet },
  { id: "interest", label: "Interest", icon: RefreshCw },
  { id: "import", label: "Import", icon: Upload },
  { id: "rules", label: "Rules", icon: Settings },
];

const blankCharge = {
  flat_id: "",
  period_month: new Date().toISOString().slice(0, 7),
  due_date: "",
  maintenance_charge: "",
  noc_charge: "0",
  penalty_charge: "0",
  interest_amount: "0",
  notes: "",
};

const blankPayment = {
  flat_id: "",
  maintenance_amount_paid: "",
  noc_amount_paid: "",
  interest_amount_paid: "",
  total_amount_paid: "0.00",
  payment_date: today,
  payment_mode: "cash",
  reference_no: "",
  notes: "",
  from_month: thisMonth,
  to_month: thisMonth,
};

function Stat({ label, value }) {
  return (
    <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='text-sm text-slate-500'>{label}</div>
      <div className='mt-1 text-xl font-semibold text-slate-950'>{value}</div>
    </div>
  );
}

function FlatSelect({ flats, value, onChange, required = true }) {
  return (
    <select
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
      <option value=''>Select flat</option>
      {flats.map((flat) => (
        <option key={flat.id} value={flat.id}>
          {flat.wing}-{flat.flat_no} | {flat.owner_name}
        </option>
      ))}
    </select>
  );
}

function MaintenanceManagement() {
  const [activeTab, setActiveTab] = useState("list");
  const [flats, setFlats] = useState([]);
  const [summary, setSummary] = useState(null);
  const [charges, setCharges] = useState([]);
  const [balances, setBalances] = useState([]);
  const [reports, setReports] = useState({ monthly: [], payments: [], collections: [], collection_total: {} });
  const [flatMaintenance, setFlatMaintenance] = useState(null);
  const [rules, setRules] = useState([]);
  const [imports, setImports] = useState([]);
  const [chargeForm, setChargeForm] = useState(blankCharge);
  const [oldForm, setOldForm] = useState({
    flat_id: "",
    period_month: new Date().toISOString().slice(0, 7),
    due_date: "",
    maintenance_charge: "",
    noc_charge: "0",
    interest_amount: "0",
    penalty_charge: "0",
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState(blankPayment);
  const [ruleForm, setRuleForm] = useState({
    name: "Default monthly maintenance rule",
    interest_rate_monthly: "1.3",
    interest_grace_days: "0",
    interest_method: "simple_monthly",
    interest_apply_to: "maintenance_only",
    exclude_noc_from_interest: true,
    rounding_mode: "nearest",
    effective_from: today,
  });
  const [importForm, setImportForm] = useState({ flat_id: "", owner_name: "", file: null });
  const [interestDate, setInterestDate] = useState(today);
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);

  const activeRule = useMemo(() => rules.find((rule) => rule.status === "active"), [rules]);

  const selectedPaymentFlat = useMemo(
    () => flats.find((flat) => String(flat.id) === String(paymentForm.flat_id)),
    [flats, paymentForm.flat_id]
  );

  const paymentOutstanding = useMemo(() => {
    const totals = flatMaintenance?.totals || {};
    const maintenance = numberValue(totals.maintenance_balance);
    const noc = numberValue(totals.noc_balance);
    const interest = numberValue(totals.interest_balance);
    return { maintenance, noc, interest, total: maintenance + noc + interest };
  }, [flatMaintenance]);

  useEffect(() => {
    const total =
      numberValue(paymentForm.maintenance_amount_paid) +
      numberValue(paymentForm.noc_amount_paid) +
      numberValue(paymentForm.interest_amount_paid);
    setPaymentForm((current) =>
      current.total_amount_paid === total.toFixed(2)
        ? current
        : { ...current, total_amount_paid: total.toFixed(2) }
    );
  }, [
    paymentForm.maintenance_amount_paid,
    paymentForm.noc_amount_paid,
    paymentForm.interest_amount_paid,
  ]);

  const fetchBase = async () => {
    try {
      const [flatRes, summaryRes, ruleRes] = await Promise.all([
        getFlatsPaginated(1, 500),
        getMaintenanceSummary(),
        getMaintenanceRules(),
      ]);
      setFlats(flatRes.data.data || []);
      setSummary(summaryRes.data.data?.summary || null);
      setRules(ruleRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load maintenance data");
    }
  };

  const fetchTabData = async () => {
    try {
      if (activeTab === "add") {
        const res = await getMaintenanceCharges(1, 12);
        setCharges(res.data.data || []);
      }
      if (activeTab === "list") {
        const res = await getMaintenanceBalances();
        setBalances(res.data.data || []);
      }
      if (activeTab === "dues") {
        const res = await getMaintenanceBalances();
        setBalances(res.data.data || []);
      }
      if (activeTab === "reports") {
        const res = await getMaintenanceReports();
        setReports(res.data.data || { monthly: [], payments: [] });
      }
      if (activeTab === "import") {
        const res = await getMaintenanceImports();
        setImports(res.data.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load tab data");
    }
  };

  useEffect(() => {
    fetchBase();
  }, []);

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const refreshAll = async () => {
    await fetchBase();
    await fetchTabData();
    if (paymentForm.flat_id) {
      await fetchFlatMaintenance(paymentForm.flat_id);
    }
  };

  const fetchFlatMaintenance = async (flatId) => {
    if (!flatId) {
      setFlatMaintenance(null);
      return;
    }
    try {
      const res = await getFlatMaintenanceDetails(flatId);
      setFlatMaintenance(res.data.data || null);
    } catch (err) {
      setFlatMaintenance(null);
      toast.error(err.response?.data?.message || "Unable to load flat ledger");
    }
  };

  const submitCharge = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addMaintenanceCharge(chargeForm);
      toast.success("Maintenance charge saved");
      setChargeForm(blankCharge);
      refreshAll();
    } catch (err) {
      const errors = err.response?.data?.errors;
      toast.error(errors?.[0]?.msg || err.response?.data?.message || "Unable to save charge");
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await payMaintenance({
        ...paymentForm,
        amount: paymentForm.total_amount_paid,
      });
      toast.success(res.data.message || "Payment recorded");
      setPaymentForm(blankPayment);
      setFlatMaintenance(null);
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to record payment");
    } finally {
      setLoading(false);
    }
  };

  const submitOldDue = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addOldMaintenanceDue(oldForm);
      toast.success("Old maintenance dues added");
      setOldForm({
        flat_id: "",
        period_month: new Date().toISOString().slice(0, 7),
        due_date: "",
        maintenance_charge: "",
        noc_charge: "0",
        interest_amount: "0",
        penalty_charge: "0",
        notes: "",
      });
      refreshAll();
    } catch (err) {
      const errors = err.response?.data?.errors;
      toast.error(errors?.[0]?.msg || err.response?.data?.message || "Unable to save old dues");
    } finally {
      setLoading(false);
    }
  };

  const submitRule = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveMaintenanceRule(ruleForm);
      toast.success("Maintenance rule saved");
      fetchBase();
    } catch (err) {
      const errors = err.response?.data?.errors;
      toast.error(errors?.[0]?.msg || err.response?.data?.message || "Unable to save rule");
    } finally {
      setLoading(false);
    }
  };

  const submitImport = async (e) => {
    e.preventDefault();
    if (!importForm.file) {
      toast.error("Choose an Excel file");
      return;
    }
    setLoading(true);
    try {
      const data = new FormData();
      data.append("file", importForm.file);
      if (importForm.flat_id) data.append("flat_id", importForm.flat_id);
      if (importForm.owner_name) data.append("owner_name", importForm.owner_name);
      const res = await importMaintenanceExcel(data);
      toast.success(res.data.message || "Import completed");
      setImportForm({ flat_id: "", owner_name: "", file: null });
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to import file");
    } finally {
      setLoading(false);
    }
  };

  const runInterest = async () => {
    setLoading(true);
    try {
      const res = await recalculateMaintenanceInterest({ as_of: interestDate });
      toast.success(`${res.data.updated || 0} dues recalculated`);
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to recalculate interest");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (type, format = "xlsx", flatId = null) => {
    try {
      const reportParams =
        type === "yearly"
          ? { type, format, from: `${reportYear}-01`, to: `${reportYear}-12` }
          : { type, format };
      const res = flatId
        ? await exportFlatLedger(flatId, format)
        : await exportMaintenanceReport(reportParams);
      downloadBlob(res.data, `maintenance-${type}.${format}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to download report");
    }
  };

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-950'>Maintenance Management</h2>
          <p className='text-sm text-slate-500'>
            Monthly billing, payments, outstanding balances, imports, and society rules.
          </p>
        </div>
        <button
          onClick={refreshAll}
          className='inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800'
          title='Refresh maintenance'>
          <RefreshCw size={17} />
        </button>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <Stat label='Total Billed' value={money(summary?.total_billed)} />
        <Stat label='Collected' value={money(summary?.total_collected)} />
        <Stat label='Outstanding' value={money(summary?.total_outstanding)} />
        <Stat label='Interest Due' value={money(summary?.interest_outstanding)} />
      </div>

      <div className='flex gap-2 overflow-x-auto border-b border-slate-200 pb-2'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}>
            {React.createElement(tab.icon, { size: 16 })}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "list" && (
        <div className='space-y-5'>
          <div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
            <div className='overflow-x-auto'>
              <table className='min-w-full text-sm'>
                <thead className='bg-slate-100 text-left text-slate-600'>
                  <tr>
                    <th className='px-4 py-3'>Flat</th>
                    <th className='px-4 py-3'>Owner</th>
                    <th className='px-4 py-3'>Current Outstanding</th>
                    <th className='px-4 py-3'>Maintenance</th>
                    <th className='px-4 py-3 text-right'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {flats.map((flat) => {
                    const balance = balances.find((item) => Number(item.flat_id) === Number(flat.id));
                    return (
                      <tr key={flat.id} className='border-t border-slate-100'>
                        <td className='px-4 py-3 font-medium text-slate-950'>
                          {flat.wing}-{flat.flat_no}
                        </td>
                        <td className='px-4 py-3'>{flat.owner_name}</td>
                        <td className='px-4 py-3 font-semibold'>{money(balance?.total_balance)}</td>
                        <td className='px-4 py-3'>{money(flat.maintenance_amount)}</td>
                        <td className='px-4 py-3'>
                          <div className='flex justify-end'>
                            <button
                              type='button'
                              onClick={() => fetchFlatMaintenance(flat.id)}
                              className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50'
                              title='View flat maintenance'>
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {flatMaintenance && (
            <FlatMaintenancePanel
              flatMaintenance={flatMaintenance}
              onDownload={(format) => downloadReport("flat-ledger", format, flatMaintenance.flat.id)}
            />
          )}
        </div>
      )}

      {activeTab === "add" && (
        <div className='grid gap-5 xl:grid-cols-[420px_1fr]'>
          <form onSubmit={submitCharge} className='rounded-lg border border-slate-200 bg-white shadow-sm'>
            <div className='border-b border-slate-200 p-5 font-semibold text-slate-800'>Add Maintenance</div>
            <div className='grid gap-4 p-5'>
              <FlatSelect
                flats={flats}
                value={chargeForm.flat_id}
                onChange={(value) => setChargeForm({ ...chargeForm, flat_id: value })}
              />
              <input
                type='month'
                value={chargeForm.period_month}
                onChange={(e) => setChargeForm({ ...chargeForm, period_month: e.target.value })}
                required
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              />
              <input
                type='date'
                value={chargeForm.due_date}
                onChange={(e) => setChargeForm({ ...chargeForm, due_date: e.target.value })}
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                title='Due date'
              />
              {[
                ["maintenance_charge", "Maintenance Charge"],
                ["noc_charge", "NOC Charge"],
                ["penalty_charge", "Penalty"],
                ["interest_amount", "Interest"],
              ].map(([name, label]) => (
                <label key={name} className='block'>
                  <span className='mb-1.5 block text-sm font-medium text-slate-600'>{label}</span>
                  <input
                    name={name}
                    type='number'
                    min='0'
                    step='0.01'
                    value={chargeForm[name]}
                    onChange={(e) => setChargeForm({ ...chargeForm, [name]: e.target.value })}
                    required={name === "maintenance_charge"}
                    className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                  />
                </label>
              ))}
              <input
                value={chargeForm.notes}
                onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })}
                placeholder='Optional note'
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              />
            </div>
            <div className='flex justify-end border-t border-slate-200 bg-slate-50 p-4'>
              <button
                disabled={loading}
                className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'>
                <Save size={16} />
                Save
              </button>
            </div>
          </form>

          <DataTable
            columns={["Flat", "Month", "Due", "Paid", "Balance", "Status"]}
            empty='No maintenance charges yet'
            rows={charges.map((row) => [
              `${row.wing}-${row.flat_no}`,
              new Date(row.period_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
              money(row.total_due),
              money(row.total_paid),
              money(row.total_balance),
              row.status,
            ])}
          />
        </div>
      )}

      {activeTab === "old" && (
        <form onSubmit={submitOldDue} className='max-w-4xl rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 p-5 font-semibold text-slate-800'>
            Old Maintenance Entry
          </div>
          <div className='grid gap-4 p-5 sm:grid-cols-2'>
            <FlatSelect
              flats={flats}
              value={oldForm.flat_id}
              onChange={(value) => setOldForm({ ...oldForm, flat_id: value })}
            />
            <input
              type='month'
              value={oldForm.period_month}
              onChange={(e) => setOldForm({ ...oldForm, period_month: e.target.value })}
              required
              className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
            <input
              type='date'
              value={oldForm.due_date}
              onChange={(e) => setOldForm({ ...oldForm, due_date: e.target.value })}
              className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              title='Due date'
            />
            {[
              ["maintenance_charge", "Old Maintenance Amount"],
              ["noc_charge", "Old NOC Amount"],
              ["interest_amount", "Old Interest Amount"],
              ["penalty_charge", "Old Recurring/Penalty Amount"],
            ].map(([name, label]) => (
              <label key={name} className='block'>
                <span className='mb-1.5 block text-sm font-medium text-slate-600'>{label}</span>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={oldForm[name]}
                  onChange={(e) => setOldForm({ ...oldForm, [name]: e.target.value })}
                  required={name === "maintenance_charge"}
                  className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                />
              </label>
            ))}
            <input
              value={oldForm.notes}
              onChange={(e) => setOldForm({ ...oldForm, notes: e.target.value })}
              placeholder='Remarks'
              className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:col-span-2'
            />
          </div>
          <div className='flex justify-end border-t border-slate-200 bg-slate-50 p-4'>
            <button
              disabled={loading}
              className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'>
              <Save size={16} />
              Add Old Dues
            </button>
          </div>
        </form>
      )}

      {activeTab === "pay" && (
        <div className='space-y-5'>
          <form onSubmit={submitPayment} className='rounded-lg border border-slate-200 bg-white shadow-sm'>
            <div className='border-b border-slate-200 p-5 font-semibold text-slate-800'>Pay Maintenance</div>
            <div className='grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3'>
              <FlatSelect
                flats={flats}
                value={paymentForm.flat_id}
                onChange={(value) => {
                  setPaymentForm({ ...paymentForm, flat_id: value });
                  fetchFlatMaintenance(value);
                }}
              />
              {[
                ["pending_maintenance", "Pending Maintenance Amount", paymentOutstanding.maintenance],
                ["pending_noc", "Pending NOC Amount", paymentOutstanding.noc],
                ["pending_interest", "Pending Interest Amount", paymentOutstanding.interest],
                ["total_outstanding", "Total Outstanding Amount", paymentOutstanding.total],
              ].map(([name, label, value]) => (
                <label key={name} className='block'>
                  <span className='mb-1.5 block text-sm font-medium text-slate-600'>{label}</span>
                  <input
                    readOnly
                    value={money(value)}
                    className='h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none'
                  />
                </label>
              ))}
              {[
                ["maintenance_amount_paid", "Maintenance Amount Paid"],
                ["noc_amount_paid", "NOC Amount Paid"],
                ["interest_amount_paid", "Interest Amount Paid"],
              ].map(([name, label]) => (
                <label key={name} className='block'>
                  <span className='mb-1.5 block text-sm font-medium text-slate-600'>{label}</span>
                  <input
                    type='number'
                    min='0'
                    step='0.01'
                    value={paymentForm[name]}
                    onChange={(e) => setPaymentForm({ ...paymentForm, [name]: e.target.value })}
                    className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                  />
                </label>
              ))}
              <label className='block'>
                <span className='mb-1.5 block text-sm font-medium text-slate-600'>Total Amount Paid</span>
                <input
                  readOnly
                  value={paymentForm.total_amount_paid}
                  className='h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none'
                />
              </label>
              <label className='block'>
                <span className='mb-1.5 block text-sm font-medium text-slate-600'>From Month</span>
                <input
                  type='month'
                  value={paymentForm.from_month}
                  onChange={(e) => setPaymentForm({ ...paymentForm, from_month: e.target.value })}
                  required
                  className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                />
              </label>
              <label className='block'>
                <span className='mb-1.5 block text-sm font-medium text-slate-600'>To Month</span>
                <input
                  type='month'
                  value={paymentForm.to_month}
                  onChange={(e) => setPaymentForm({ ...paymentForm, to_month: e.target.value })}
                  required
                  className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                />
              </label>
              <input
                type='date'
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              />
              <select
                value={paymentForm.payment_mode}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                className='h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
                <option value='cash'>Cash</option>
                <option value='cheque'>Cheque</option>
                <option value='upi'>UPI</option>
                <option value='bank_transfer'>Bank Transfer</option>
                <option value='card'>Card</option>
                <option value='adjustment'>Adjustment</option>
              </select>
              <input
                placeholder='Transaction reference'
                value={paymentForm.reference_no}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              />
              <input
                placeholder='Remarks'
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              />
            </div>
            <div className='flex justify-end border-t border-slate-200 bg-slate-50 p-4'>
              <button
                disabled={loading || !paymentForm.flat_id || numberValue(paymentForm.total_amount_paid) <= 0}
                className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'>
                <IndianRupee size={16} />
                Save Payment
              </button>
            </div>
          </form>

          {flatMaintenance && (
            <div className='space-y-5'>
              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
                <Stat
                  label='Selected Flat'
                  value={`${selectedPaymentFlat?.wing || flatMaintenance.flat.wing}-${selectedPaymentFlat?.flat_no || flatMaintenance.flat.flat_no}`}
                />
                <Stat label='Owner' value={flatMaintenance.flat.owner_name} />
                <Stat label='Maintenance Due' value={money(paymentOutstanding.maintenance)} />
                <Stat label='NOC Due' value={money(paymentOutstanding.noc)} />
                <Stat label='Interest Due' value={money(paymentOutstanding.interest)} />
              </div>

              <div className='flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={() => downloadReport("flat-ledger", "xlsx", paymentForm.flat_id)}
                  className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
                  <FileSpreadsheet size={16} />
                  Ledger Excel
                </button>
                <button
                  type='button'
                  onClick={() => downloadReport("flat-ledger", "pdf", paymentForm.flat_id)}
                  className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
                  <FileSpreadsheet size={16} />
                  Ledger PDF
                </button>
              </div>

              <div className='grid gap-5 xl:grid-cols-2'>
                <DataTable
                  columns={["Pending Month", "Due Date", "Maintenance", "NOC", "Interest", "Outstanding", "Status"]}
                  empty='No pending months for this flat'
                  rows={flatMaintenance.pending_months.map((row) => [
                    new Date(row.period_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
                    row.due_date ? new Date(row.due_date).toLocaleDateString("en-IN") : "-",
                    money(row.maintenance_balance),
                    money(row.noc_balance),
                    money(row.interest_balance),
                    money(row.total_balance),
                    row.status,
                  ])}
                />
                <DataTable
                  columns={["Receipt", "Date", "Maintenance", "NOC", "Interest", "Total", "Period", "Mode"]}
                  empty='No payments recorded for this flat'
                  rows={flatMaintenance.payment_history.map((row) => [
                    row.receipt_number,
                    row.payment_date ? new Date(row.payment_date).toLocaleDateString("en-IN") : "-",
                    money(row.maintenance_amount_paid),
                    money(row.noc_amount_paid),
                    money(row.interest_amount_paid),
                    money(row.amount),
                    row.from_month && row.to_month
                      ? `${new Date(row.from_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} - ${new Date(row.to_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
                      : row.billing_months || "-",
                    row.payment_mode,
                  ])}
                />
              </div>

              <DataTable
                columns={["Date", "Month", "Type", "Description", "Debit", "Credit", "Closing"]}
                empty='No ledger entries for this flat'
                rows={flatMaintenance.ledger.map((row) => [
                  row.entry_date ? new Date(row.entry_date).toLocaleDateString("en-IN") : "-",
                  row.period_month
                    ? new Date(row.period_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                    : "-",
                  row.entry_type,
                  row.description,
                  money(row.debit_amount),
                  money(row.credit_amount),
                  money(row.balance_after),
                ])}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "dues" && (
        <DataTable
          columns={["Flat", "Owner", "Maintenance", "NOC", "Interest", "Total", "Oldest Due"]}
          empty='No outstanding dues'
          rows={balances.map((row) => [
            `${row.wing}-${row.flat_no}`,
            row.owner_name,
            money(row.maintenance_balance),
            money(row.noc_balance),
            money(row.interest_balance),
            money(row.total_balance),
            row.oldest_due_month
              ? new Date(row.oldest_due_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
              : "-",
          ])}
        />
      )}

      {activeTab === "reports" && (
        <div className='space-y-5'>
          <div className='flex flex-wrap items-center gap-2'>
            <input
              type='number'
              min='2000'
              max='2100'
              value={reportYear}
              onChange={(e) => setReportYear(e.target.value)}
              className='h-10 w-28 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              title='Year for yearly exports'
            />
            {[
              ["flat-wise", "Flat-wise"],
              ["month-wise", "Month-wise"],
              ["outstanding", "Outstanding"],
              ["collection", "Collection"],
              ["yearly", "Yearly"],
              ["interest", "Interest"],
              ["noc", "NOC"],
            ].map(([type, label]) => (
              <React.Fragment key={type}>
                <button
                  type='button'
                  onClick={() => downloadReport(type, "xlsx")}
                  className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
                  <FileSpreadsheet size={16} />
                  {label} Excel
                </button>
                <button
                  type='button'
                  onClick={() => downloadReport(type, "pdf")}
                  className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
                  <FileSpreadsheet size={16} />
                  {label} PDF
                </button>
              </React.Fragment>
            ))}
          </div>
          <div className='grid gap-5 xl:grid-cols-2'>
            <DataTable
              columns={["Month", "Maintenance", "NOC", "Interest", "Grand Total", "Paid Flats", "Pending Flats"]}
              empty='No monthly report data'
              rows={reports.monthly.map((row) => [
                new Date(row.period_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
                money(row.maintenance_collection),
                money(row.noc_collection),
                money(row.interest_collection),
                money(row.grand_total_collection),
                row.paid_flats || 0,
                row.pending_flats || 0,
              ])}
            />
            <DataTable
              columns={["Mode", "Payments", "Maintenance", "NOC", "Interest", "Grand Total"]}
              empty='No payment report data'
              rows={reports.payments.map((row) => [
                row.payment_mode,
                row.count,
                money(row.maintenance_collection),
                money(row.noc_collection),
                money(row.interest_collection),
                money(row.amount),
              ])}
            />
          </div>
          <DataTable
            columns={["Flat", "Date", "Maintenance", "NOC", "Interest", "Grand Total", "Mode", "Period"]}
            empty='No flat-wise collection data'
            rows={(reports.collections || []).map((row) => [
              `${row.wing}-${row.flat_no}`,
              row.payment_date ? new Date(row.payment_date).toLocaleDateString("en-IN") : "-",
              money(row.maintenance_amount_paid),
              money(row.noc_amount_paid),
              money(row.interest_amount_paid),
              money(row.amount),
              row.payment_mode,
              row.from_month && row.to_month
                ? `${new Date(row.from_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} - ${new Date(row.to_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
                : row.billing_months || "-",
            ])}
          />
        </div>
      )}

      {activeTab === "interest" && (
        <div className='max-w-3xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='mb-4 flex items-start gap-3'>
            <Calculator className='mt-1 text-sky-700' size={20} />
            <div>
              <div className='font-semibold text-slate-950'>Interest Calculation</div>
              <div className='text-sm text-slate-500'>
                Active rule: {activeRule ? `${activeRule.interest_rate_monthly}% monthly` : "No active rule configured"}.
                NOC interest exclusion is controlled by the rule.
              </div>
            </div>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <input
              type='date'
              value={interestDate}
              onChange={(e) => setInterestDate(e.target.value)}
              className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
            <button
              onClick={runInterest}
              disabled={loading}
              className='inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'>
              <RefreshCw size={16} />
              Recalculate Interest
            </button>
          </div>
        </div>
      )}

      {activeTab === "import" && (
        <div className='grid gap-5 xl:grid-cols-[420px_1fr]'>
          <form onSubmit={submitImport} className='rounded-lg border border-slate-200 bg-white shadow-sm'>
            <div className='border-b border-slate-200 p-5 font-semibold text-slate-800'>Import Maintenance Data</div>
            <div className='grid gap-4 p-5'>
              <FlatSelect
                flats={flats}
                value={importForm.flat_id}
                required={false}
                onChange={(value) => setImportForm({ ...importForm, flat_id: value })}
              />
              <input
                placeholder='Owner name fallback'
                value={importForm.owner_name}
                onChange={(e) => setImportForm({ ...importForm, owner_name: e.target.value })}
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              />
              <input
                type='file'
                accept='.xlsx,.xls,.csv'
                onChange={(e) => setImportForm({ ...importForm, file: e.target.files?.[0] || null })}
                className='rounded-md border border-slate-300 bg-white px-3 py-2 text-sm'
              />
            </div>
            <div className='flex justify-end border-t border-slate-200 bg-slate-50 p-4'>
              <button
                disabled={loading}
                className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'>
                <Upload size={16} />
                Import
              </button>
            </div>
          </form>
          <DataTable
            columns={["Batch", "File", "Rows", "Imported", "Failed", "Status"]}
            empty='No imports yet'
            rows={imports.map((row) => [
              row.batch_code,
              row.file_name,
              row.total_rows,
              row.inserted_rows,
              row.failed_rows,
              row.status,
            ])}
          />
        </div>
      )}

      {activeTab === "rules" && (
        <div className='grid gap-5 xl:grid-cols-[460px_1fr]'>
          <form onSubmit={submitRule} className='rounded-lg border border-slate-200 bg-white shadow-sm'>
            <div className='border-b border-slate-200 p-5 font-semibold text-slate-800'>Society Maintenance Rules</div>
            <div className='grid gap-4 p-5 sm:grid-cols-2'>
              <input
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder='Rule name'
                required
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:col-span-2'
              />
              <input
                type='number'
                min='0'
                step='0.0001'
                value={ruleForm.interest_rate_monthly}
                onChange={(e) => setRuleForm({ ...ruleForm, interest_rate_monthly: e.target.value })}
                placeholder='Monthly interest %'
                required
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              />
              <input
                type='number'
                min='0'
                value={ruleForm.interest_grace_days}
                onChange={(e) => setRuleForm({ ...ruleForm, interest_grace_days: e.target.value })}
                placeholder='Grace days'
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              />
              <select
                value={ruleForm.interest_method}
                onChange={(e) => setRuleForm({ ...ruleForm, interest_method: e.target.value })}
                className='h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
                <option value='simple_monthly'>Simple Monthly</option>
                <option value='compound_monthly'>Compound Monthly</option>
                <option value='fixed_penalty'>Fixed Penalty</option>
              </select>
              <select
                value={ruleForm.interest_apply_to}
                onChange={(e) => setRuleForm({ ...ruleForm, interest_apply_to: e.target.value })}
                className='h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
                <option value='maintenance_only'>Maintenance Only</option>
                <option value='maintenance_and_penalties'>Maintenance + Penalties</option>
                <option value='total_outstanding'>Total Outstanding</option>
              </select>
              <select
                value={ruleForm.rounding_mode}
                onChange={(e) => setRuleForm({ ...ruleForm, rounding_mode: e.target.value })}
                className='h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
                <option value='nearest'>Round Nearest</option>
                <option value='floor'>Round Down</option>
                <option value='ceil'>Round Up</option>
                <option value='none'>No Rounding</option>
              </select>
              <input
                type='date'
                value={ruleForm.effective_from}
                onChange={(e) => setRuleForm({ ...ruleForm, effective_from: e.target.value })}
                className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
              />
              <label className='flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2'>
                <input
                  type='checkbox'
                  checked={ruleForm.exclude_noc_from_interest}
                  onChange={(e) => setRuleForm({ ...ruleForm, exclude_noc_from_interest: e.target.checked })}
                />
                Exclude NOC charges from interest
              </label>
            </div>
            <div className='flex justify-end border-t border-slate-200 bg-slate-50 p-4'>
              <button
                disabled={loading}
                className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'>
                <Save size={16} />
                Save Rule
              </button>
            </div>
          </form>
          <DataTable
            columns={["Rule", "Interest", "Method", "Applies To", "NOC", "Status"]}
            empty='No rules configured'
            rows={rules.map((row) => [
              row.name,
              `${row.interest_rate_monthly}%`,
              row.interest_method?.replaceAll("_", " "),
              row.interest_apply_to?.replaceAll("_", " "),
              row.exclude_noc_from_interest ? "Excluded" : "Included",
              row.status,
            ])}
          />
        </div>
      )}
    </div>
  );
}

function FlatMaintenancePanel({ flatMaintenance, onDownload }) {
  return (
    <div className='space-y-5'>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        <Stat label='Flat' value={`${flatMaintenance.flat.wing}-${flatMaintenance.flat.flat_no}`} />
        <Stat label='Owner' value={flatMaintenance.flat.owner_name} />
        <Stat label='Maintenance Due' value={money(flatMaintenance.totals.maintenance_balance)} />
        <Stat label='NOC Due' value={money(flatMaintenance.totals.noc_balance)} />
        <Stat label='Interest Due' value={money(flatMaintenance.totals.interest_balance)} />
      </div>

      <div className='flex flex-wrap gap-2'>
        <button
          type='button'
          onClick={() => onDownload("xlsx")}
          className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
          <FileSpreadsheet size={16} />
          Ledger Excel
        </button>
        <button
          type='button'
          onClick={() => onDownload("pdf")}
          className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
          <FileSpreadsheet size={16} />
          Ledger PDF
        </button>
      </div>

      <div className='grid gap-5 xl:grid-cols-2'>
        <DataTable
          columns={["Month", "Due Date", "Maintenance", "NOC", "Interest", "Outstanding", "Status"]}
          empty='No monthly maintenance records up to current month'
          rows={flatMaintenance.monthly_records.map((row) => [
            new Date(row.period_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
            row.due_date ? new Date(row.due_date).toLocaleDateString("en-IN") : "-",
            money(row.maintenance_balance),
            money(row.noc_balance),
            money(row.interest_balance),
            money(row.total_balance),
            row.status,
          ])}
        />
        <DataTable
          columns={["Receipt", "Date", "Maintenance", "NOC", "Interest", "Total", "Period", "Mode"]}
          empty='No payment history'
          rows={flatMaintenance.payment_history.map((row) => [
            row.receipt_number,
            row.payment_date ? new Date(row.payment_date).toLocaleDateString("en-IN") : "-",
            money(row.maintenance_amount_paid),
            money(row.noc_amount_paid),
            money(row.interest_amount_paid),
            money(row.amount),
            row.from_month && row.to_month
              ? `${new Date(row.from_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} - ${new Date(row.to_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
              : row.billing_months || "-",
            row.payment_mode,
          ])}
        />
      </div>

      <DataTable
        columns={["Date", "Month", "Type", "Description", "Debit", "Credit", "Closing"]}
        empty='No ledger entries'
        rows={flatMaintenance.ledger.map((row) => [
          row.entry_date ? new Date(row.entry_date).toLocaleDateString("en-IN") : "-",
          row.period_month
            ? new Date(row.period_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
            : "-",
          row.entry_type,
          row.description,
          money(row.debit_amount),
          money(row.credit_amount),
          money(row.balance_after),
        ])}
      />
    </div>
  );
}

function DataTable({ columns, rows, empty }) {
  return (
    <div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead className='bg-slate-100 text-left text-slate-600'>
            <tr>
              {columns.map((column) => (
                <th key={column} className='px-4 py-3 font-semibold'>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className='px-4 py-8 text-center text-slate-500'>
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className='border-t border-slate-100'>
                  {row.map((cell, cellIndex) => (
                    <td key={`${index}-${cellIndex}`} className='px-4 py-3 text-slate-700'>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MaintenanceManagement;
