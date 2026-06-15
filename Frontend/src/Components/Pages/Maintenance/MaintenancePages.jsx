import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  RefreshCw,
  Save,
  Search,
  Share2,
} from "lucide-react";
import { getFlatsPaginated } from "../../../api/flats.api";
import {
  exportMaintenanceReport,
  getFlatMaintenanceDetails,
  getMaintenanceReports,
  payMaintenance,
  updateMaintenanceBalance,
} from "../../../api/maintenance.api";

const today = new Date().toISOString().slice(0, 10);
const thisMonth = new Date().toISOString().slice(0, 7);
const thisYear = new Date().getFullYear();

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

const flatLabel = (flat) =>
  flat ? `${flat.wing}-${flat.flat_no}${flat.owner_name ? ` | ${flat.owner_name}` : ""}` : "";

function PageHeader({ title, subtitle, onRefresh }) {
  return (
    <div className='flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between'>
      <div>
        <h2 className='text-2xl font-semibold text-slate-950'>{title}</h2>
        <p className='text-sm text-slate-500'>{subtitle}</p>
      </div>
      {onRefresh && (
        <button
          type='button'
          onClick={onRefresh}
          className='inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800'
          title='Refresh'>
          <RefreshCw size={17} />
        </button>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className='block'>
      <span className='mb-1.5 block text-sm font-medium text-slate-600'>{label}</span>
      {children}
    </label>
  );
}

function FlatSelect({ flats, value, onChange }) {
  return (
    <select
      value={value}
      required
      onChange={(e) => onChange(e.target.value)}
      className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
      <option value=''>Select flat</option>
      {flats.map((flat) => (
        <option key={flat.id} value={flat.id}>
          {flatLabel(flat)}
        </option>
      ))}
    </select>
  );
}

function Stat({ label, value }) {
  return (
    <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='text-sm text-slate-500'>{label}</div>
      <div className='mt-1 text-lg font-semibold text-slate-950'>{value}</div>
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
                <td className='px-4 py-8 text-center text-slate-500' colSpan={columns.length}>
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className='border-t border-slate-100'>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className='px-4 py-3 text-slate-700'>
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

function useMaintenanceFlats() {
  const [flats, setFlats] = useState([]);
  const [flatDetails, setFlatDetails] = useState(null);

  const loadFlats = async () => {
    const res = await getFlatsPaginated(1, 500);
    setFlats(res.data.data || []);
  };

  const loadFlatDetails = async (flatId) => {
    if (!flatId) {
      setFlatDetails(null);
      return null;
    }
    const res = await getFlatMaintenanceDetails(flatId);
    setFlatDetails(res.data.data || null);
    return res.data.data || null;
  };

  useEffect(() => {
    let active = true;
    const fetchFlats = async () => {
      try {
        const res = await getFlatsPaginated(1, 500);
        if (active) setFlats(res.data.data || []);
      } catch (err) {
        if (active) toast.error(err.response?.data?.message || "Unable to load flats");
      }
    };
    fetchFlats();
    return () => {
      active = false;
    };
  }, []);

  return { flats, flatDetails, loadFlats, loadFlatDetails, setFlatDetails };
}

function BalanceSnapshot({ details }) {
  const lastPayment = details?.payment_history?.[0];
  const lastPaidMonth = lastPayment?.billing_months || "-";
  return (
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
      <Stat label='Current Outstanding' value={money(details?.totals?.outstanding_balance)} />
      <Stat
        label='Pending Maintenance'
        value={money(
          details?.pending_months?.reduce((total, row) => total + Number(row.maintenance_balance || 0), 0)
        )}
      />
      <Stat
        label='Interest Dues'
        value={money(details?.totals?.interest_balance)}
      />
      <Stat
        label='Last Payment Date'
        value={lastPayment?.payment_date ? new Date(lastPayment.payment_date).toLocaleDateString("en-IN") : "-"}
      />
      <Stat label='Last Paid Month' value={lastPaidMonth} />
    </div>
  );
}

export function AddBalanceMaintenancePage() {
  const { flats, flatDetails, loadFlatDetails } = useMaintenanceFlats();
  const [form, setForm] = useState({
    flat_id: "",
    period_month: thisMonth,
    outstanding_maintenance_amount: "",
    outstanding_noc_amount: "",
    outstanding_interest_amount: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);

  const selectFlat = async (flatId) => {
    setForm((prev) => ({ ...prev, flat_id: flatId }));
    try {
      await loadFlatDetails(flatId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load flat maintenance details");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateMaintenanceBalance(form);
      toast.success("Maintenance balance updated");
      await loadFlatDetails(form.flat_id);
    } catch (err) {
      const errors = err.response?.data?.errors;
      toast.error(errors?.[0]?.msg || err.response?.data?.message || "Unable to update balance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-5'>
      <PageHeader
        title='Add Balance Maintenance'
        subtitle='Enter or update outstanding maintenance, NOC, and interest balances for a flat.'
        onRefresh={() => form.flat_id && selectFlat(form.flat_id)}
      />

      <form onSubmit={submit} className='rounded-lg border border-slate-200 bg-white shadow-sm'>
        <div className='grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3'>
          <Field label='Flat'>
            <FlatSelect flats={flats} value={form.flat_id} onChange={selectFlat} />
          </Field>
          <Field label='Balance Month'>
            <input
              type='month'
              value={form.period_month}
              onChange={(e) => setForm({ ...form, period_month: e.target.value })}
              className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </Field>
          <Field label='Outstanding Maintenance Amount'>
            <input
              type='number'
              min='0'
              step='0.01'
              value={form.outstanding_maintenance_amount}
              onChange={(e) => setForm({ ...form, outstanding_maintenance_amount: e.target.value })}
              className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </Field>
          <Field label='Outstanding NOC Amount'>
            <input
              type='number'
              min='0'
              step='0.01'
              value={form.outstanding_noc_amount}
              onChange={(e) => setForm({ ...form, outstanding_noc_amount: e.target.value })}
              className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </Field>
          <Field label='Outstanding Interest Amount'>
            <input
              type='number'
              min='0'
              step='0.01'
              value={form.outstanding_interest_amount}
              onChange={(e) => setForm({ ...form, outstanding_interest_amount: e.target.value })}
              className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </Field>
          <Field label='Remarks'>
            <input
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </Field>
        </div>
        <div className='flex justify-end border-t border-slate-200 bg-slate-50 p-4'>
          <button
            disabled={loading || !form.flat_id}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'>
            <Save size={16} />
            Save Balance
          </button>
        </div>
      </form>

      {flatDetails && (
        <div className='space-y-5'>
          <BalanceSnapshot details={flatDetails} />
          <DataTable
            columns={["Month", "Due", "Paid", "Balance", "Status", "Remarks"]}
            empty='No existing maintenance details'
            rows={flatDetails.monthly_records.map((row) => [
              new Date(row.period_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
              money(row.total_due),
              money(row.total_paid),
              money(row.total_balance),
              row.status,
              row.notes || "-",
            ])}
          />
        </div>
      )}
    </div>
  );
}

export function PayMaintenancePage() {
  const { flats, flatDetails, loadFlatDetails, setFlatDetails } = useMaintenanceFlats();
  const [form, setForm] = useState({
    flat_id: "",
    amount: "",
    billing_months: thisMonth,
    payment_date: today,
    payment_mode: "cash",
    reference_no: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const selectFlat = async (flatId) => {
    setForm((prev) => ({ ...prev, flat_id: flatId }));
    try {
      await loadFlatDetails(flatId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load outstanding balance");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await payMaintenance(form);
      toast.success("Payment recorded");
      setForm({
        flat_id: "",
        amount: "",
        billing_months: thisMonth,
        payment_date: today,
        payment_mode: "cash",
        reference_no: "",
        notes: "",
      });
      setFlatDetails(null);
    } catch (err) {
      const errors = err.response?.data?.errors;
      toast.error(errors?.[0]?.msg || err.response?.data?.message || "Unable to record payment");
    } finally {
      setLoading(false);
    }
  };

  const pendingMaintenance = useMemo(
    () => flatDetails?.pending_months?.reduce((total, row) => total + Number(row.maintenance_balance || 0), 0) || 0,
    [flatDetails]
  );

  return (
    <div className='space-y-5'>
      <PageHeader
        title='Pay Maintenance'
        subtitle='Record maintenance payments and automatically deduct them from outstanding dues.'
        onRefresh={() => form.flat_id && selectFlat(form.flat_id)}
      />

      <form onSubmit={submit} className='rounded-lg border border-slate-200 bg-white shadow-sm'>
        <div className='grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3'>
          <Field label='Flat'>
            <FlatSelect flats={flats} value={form.flat_id} onChange={selectFlat} />
          </Field>
          <Field label='Current Outstanding Balance'>
            <input readOnly value={money(flatDetails?.totals?.outstanding_balance)} className='h-11 w-full rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700' />
          </Field>
          <Field label='Pending Maintenance Amount'>
            <input readOnly value={money(pendingMaintenance)} className='h-11 w-full rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700' />
          </Field>
          <Field label='NOC Dues'>
            <input readOnly value={money(0)} className='h-11 w-full rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700' />
          </Field>
          <Field label='Interest Dues'>
            <input readOnly value={money(flatDetails?.totals?.interest_balance)} className='h-11 w-full rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700' />
          </Field>
          <Field label='Payment Amount'>
            <input
              type='number'
              min='0.01'
              step='0.01'
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </Field>
          <Field label='Billing Month Being Paid'>
            <input
              type='month'
              value={form.billing_months}
              onChange={(e) => setForm({ ...form, billing_months: e.target.value })}
              className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </Field>
          <Field label='Payment Date'>
            <input
              type='date'
              value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </Field>
          <Field label='Payment Method'>
            <select
              value={form.payment_mode}
              onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
              className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
              <option value='cash'>Cash</option>
              <option value='upi'>UPI</option>
              <option value='bank_transfer'>Bank Transfer</option>
              <option value='cheque'>Cheque</option>
              <option value='card'>Card</option>
              <option value='adjustment'>Adjustment</option>
            </select>
          </Field>
          <Field label='Transaction Reference Number'>
            <input
              value={form.reference_no}
              onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
              className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </Field>
          <Field label='Remarks'>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className='h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </Field>
        </div>
        <div className='flex justify-end border-t border-slate-200 bg-slate-50 p-4'>
          <button
            disabled={loading || !form.flat_id}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'>
            <IndianRupee size={16} />
            Save Payment
          </button>
        </div>
      </form>

      {flatDetails && (
        <div className='grid gap-5 xl:grid-cols-2'>
          <DataTable
            columns={["Pending Month", "Due", "Paid", "Outstanding", "Status"]}
            empty='No pending maintenance'
            rows={flatDetails.pending_months.map((row) => [
              new Date(row.period_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
              money(row.total_due),
              money(row.total_paid),
              money(row.total_balance),
              row.status,
            ])}
          />
          <DataTable
            columns={["Receipt", "Date", "Amount", "Method", "Billing Months", "Reference"]}
            empty='No payment history'
            rows={flatDetails.payment_history.map((row) => [
              row.receipt_number,
              row.payment_date ? new Date(row.payment_date).toLocaleDateString("en-IN") : "-",
              money(row.amount),
              row.payment_mode,
              row.billing_months || "-",
              row.reference_no || "-",
            ])}
          />
        </div>
      )}
    </div>
  );
}

export function MonthlyMaintenanceCollectionReportPage() {
  const [filters, setFilters] = useState({
    month: String(new Date().getMonth() + 1).padStart(2, "0"),
    year: String(thisYear),
    search: "",
  });
  const [report, setReport] = useState({ monthly: [], payments: [], collections: [], collection_total: null });
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMaintenanceReports(filters);
      setReport(res.data.data || { monthly: [], payments: [], collections: [], collection_total: null });
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load collection report");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const downloadReport = async (format) => {
    try {
      const res = await exportMaintenanceReport({ ...filters, type: "collection", format });
      downloadBlob(res.data, `monthly-maintenance-collection-${filters.year}-${filters.month}.${format}`);
      toast.success(`${format.toUpperCase()} report downloaded`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to download report");
    }
  };

  const shareReport = async () => {
    const text = `Maintenance collection ${filters.month}/${filters.year}: ${money(
      report.collection_total?.total_collected
    )} collected from ${report.collection_total?.payment_count || 0} payments.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Monthly Maintenance Collection Report", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Report summary copied");
      }
    } catch {
      toast.error("Unable to share report");
    }
  };

  return (
    <div className='space-y-5'>
      <PageHeader
        title='Monthly Maintenance Collection Report'
        subtitle='Review flat-wise maintenance collections with payment history, totals, and exports.'
        onRefresh={loadReport}
      />

      <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='grid gap-3 md:grid-cols-[160px_160px_1fr_auto]'>
          <select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className='h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
            {Array.from({ length: 12 }, (_, index) => {
              const value = String(index + 1).padStart(2, "0");
              return (
                <option key={value} value={value}>
                  {new Date(2024, index, 1).toLocaleDateString("en-IN", { month: "long" })}
                </option>
              );
            })}
          </select>
          <input
            type='number'
            min='2000'
            max='2100'
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className='h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
          />
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-3 text-slate-400' size={17} />
            <input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder='Search by flat number, wing, or owner'
              className='h-11 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </div>
          <button
            type='button'
            onClick={loadReport}
            disabled={loading}
            className='inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'>
            <Search size={16} />
            Apply
          </button>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        <Stat label='Month and Year' value={`${filters.month}/${filters.year}`} />
        <Stat label='Total Maintenance Collected' value={money(report.collection_total?.total_collected)} />
        <Stat label='Payments Recorded' value={report.collection_total?.payment_count || 0} />
      </div>

      <div className='flex flex-wrap gap-2'>
        <button
          type='button'
          onClick={() => downloadReport("xlsx")}
          className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
          <FileSpreadsheet size={16} />
          Excel Export
        </button>
        <button
          type='button'
          onClick={() => downloadReport("pdf")}
          className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
          <FileText size={16} />
          PDF Export
        </button>
        <button
          type='button'
          onClick={() => downloadReport("xlsx")}
          className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
          <Download size={16} />
          Download
        </button>
        <button
          type='button'
          onClick={shareReport}
          className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
          <Share2 size={16} />
          Share
        </button>
      </div>

      <DataTable
        columns={["Flat", "Owner", "Amount Collected", "Payment Date", "Method", "Billing Month", "Reference"]}
        empty='No maintenance payments found for this month'
        rows={report.collections.map((row) => [
          `${row.wing}-${row.flat_no}`,
          row.owner_name,
          money(row.amount),
          row.payment_date ? new Date(row.payment_date).toLocaleDateString("en-IN") : "-",
          row.payment_mode,
          row.billing_months || "-",
          row.reference_no || "-",
        ])}
      />

      <div className='grid gap-5 xl:grid-cols-2'>
        <DataTable
          columns={["Payment Method", "Payments", "Amount"]}
          empty='No payment method summary'
          rows={report.payments.map((row) => [row.payment_mode, row.count, money(row.amount)])}
        />
        <DataTable
          columns={["Month", "Billed", "Collected", "Outstanding", "Interest"]}
          empty='No monthly summary'
          rows={report.monthly.map((row) => [
            new Date(row.period_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
            money(row.billed),
            money(row.collected),
            money(row.outstanding),
            money(row.interest_charged),
          ])}
        />
      </div>
    </div>
  );
}
