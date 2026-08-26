import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  IndianRupee,
  Landmark,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tags,
  UsersRound,
  XCircle,
} from "lucide-react";
import Dropdown from "../../ui/Dropdown";
import {
  cancelExpense,
  createExpense,
  createExpenseCategory,
  createPaymentAccount,
  createVendor,
  getExpenseCategories,
  getExpenses,
  getFinanceDashboard,
  getFinancialLedger,
  getPaymentAccounts,
  getVendors,
  updateExpenseStatus,
} from "../../../api/finance.api";

const today = new Date().toISOString().slice(0, 10);

const expenseInitial = {
  expense_date: today,
  category_id: "",
  sub_category: "",
  vendor_id: "",
  paid_to: "",
  description: "",
  amount: "",
  invoice_number: "",
  invoice_date: "",
  payment_mode: "cash",
  payment_account_id: "",
  reference_no: "",
  cheque_number: "",
  cheque_date: "",
  status: "pending",
  notes: "",
};

const categoryInitial = { category_name: "", description: "" };
const vendorInitial = {
  vendor_name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  gst_number: "",
  notes: "",
};
const accountInitial = {
  account_name: "",
  account_type: "cash",
  bank_name: "",
  masked_account_number: "",
  opening_balance: "",
  opening_balance_date: today,
};

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: IndianRupee },
  { id: "add", label: "Add Expense", icon: Plus },
  { id: "list", label: "Expense List", icon: ClipboardList },
  { id: "setup", label: "Setup", icon: Tags },
  { id: "ledger", label: "Ledger", icon: FileText },
];

const paymentModeOptions = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "online", label: "Online Payment" },
  { value: "card", label: "Card" },
  { value: "adjustment", label: "Adjustment" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

const accountTypeOptions = [
  { value: "cash", label: "Cash Account" },
  { value: "bank", label: "Bank Account" },
];

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const displayDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "-";

const labelize = (value) => String(value || "-").replaceAll("_", " ");

function Stat({ label, value, icon: Icon }) {
  return (
    <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-sm font-medium text-slate-500'>{label}</div>
        {Icon && (
          <span className='inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700'>
            <Icon size={17} />
          </span>
        )}
      </div>
      <div className='mt-2 text-xl font-semibold text-slate-950'>{value}</div>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className='mb-1.5 block text-sm font-medium text-slate-600'>
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 ${
        props.className || ""
      }`}
    />
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
                <th key={column} className='whitespace-nowrap px-4 py-3 font-semibold'>
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
              rows.map((row, index) => (
                <tr key={index} className='border-t border-slate-100'>
                  {row.map((cell, cellIndex) => (
                    <td key={`${index}-${cellIndex}`} className='whitespace-nowrap px-4 py-3 text-slate-700'>
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

function MiniBars({ data, labelKey, valueKey, tone = "sky" }) {
  const max = Math.max(...data.map((item) => Number(item[valueKey] || 0)), 1);
  return (
    <div className='space-y-3'>
      {data.length === 0 ? (
        <div className='rounded-md bg-slate-50 p-4 text-sm text-slate-500'>No data available</div>
      ) : (
        data.map((item) => (
          <div key={item[labelKey]} className='space-y-1'>
            <div className='flex items-center justify-between gap-3 text-sm'>
              <span className='truncate font-medium capitalize text-slate-700'>{labelize(item[labelKey])}</span>
              <span className='shrink-0 font-semibold text-slate-950'>{money(item[valueKey])}</span>
            </div>
            <div className='h-2 overflow-hidden rounded-full bg-slate-100'>
              <div
                className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald-500" : "bg-sky-500"}`}
                style={{ width: `${(Number(item[valueKey] || 0) / max) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function FinanceManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [expenseForm, setExpenseForm] = useState(expenseInitial);
  const [categoryForm, setCategoryForm] = useState(categoryInitial);
  const [vendorForm, setVendorForm] = useState(vendorInitial);
  const [accountForm, setAccountForm] = useState(accountInitial);
  const [filters, setFilters] = useState({ status: "", payment_mode: "", search: "" });
  const [loading, setLoading] = useState(false);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.status === "active")
        .map((category) => ({ value: category.id, label: category.category_name })),
    [categories],
  );
  const vendorOptions = useMemo(
    () => [
      { value: "", label: "No linked vendor" },
      ...vendors
        .filter((vendor) => vendor.status === "active")
        .map((vendor) => ({ value: vendor.id, label: vendor.vendor_name })),
    ],
    [vendors],
  );
  const accountOptions = useMemo(
    () =>
      accounts
        .filter((account) => account.status !== "inactive")
        .map((account) => ({
          value: account.id,
          label: `${account.account_name} (${labelize(account.account_type)})`,
        })),
    [accounts],
  );

  const loadLookups = async () => {
    const [categoryRes, vendorRes, accountRes] = await Promise.all([
      getExpenseCategories(),
      getVendors(),
      getPaymentAccounts(),
    ]);
    setCategories(categoryRes.data.data || []);
    setVendors(vendorRes.data.data || []);
    setAccounts(accountRes.data.data || []);
  };

  const loadDashboard = async () => {
    const res = await getFinanceDashboard();
    setDashboard(res.data.data || null);
  };

  const loadExpenses = async () => {
    const params = {
      status: filters.status || undefined,
      payment_mode: filters.payment_mode || undefined,
    };
    const res = await getExpenses(1, 50, params);
    const data = res.data.data || [];
    const searchText = filters.search.trim().toLowerCase();
    setExpenses(
      searchText
        ? data.filter((expense) =>
            [
              expense.expense_number,
              expense.category_name,
              expense.vendor_name,
              expense.description,
              expense.paid_to,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(searchText),
          )
        : data,
    );
  };

  const loadLedger = async () => {
    const res = await getFinancialLedger();
    setLedger(res.data.data || []);
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await loadLookups();
      await Promise.all([loadDashboard(), loadExpenses(), loadLedger()]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    loadExpenses().catch((error) =>
      toast.error(error.response?.data?.message || "Unable to filter expenses"),
    );
  }, [filters.status, filters.payment_mode]);

  const setExpense = (field, value) =>
    setExpenseForm((current) => ({ ...current, [field]: value }));

  const submitExpense = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await createExpense(expenseForm);
      toast.success("Expense saved successfully");
      setExpenseForm(expenseInitial);
      await refreshAll();
      setActiveTab("list");
    } catch (error) {
      const firstError = error.response?.data?.errors?.[0]?.msg;
      toast.error(firstError || error.response?.data?.message || "Unable to save expense");
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async (expense) => {
    if (!expense.payment_account_id) {
      toast.error("Select a payment account before marking this expense paid");
      return;
    }
    try {
      await updateExpenseStatus(expense.id, { status: "paid" });
      toast.success("Expense marked paid");
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to mark expense paid");
    }
  };

  const cancelSelectedExpense = async (expense) => {
    const reason = window.prompt(`Reason for cancelling ${expense.expense_number}`) || "";
    try {
      await cancelExpense(expense.id, { reason });
      toast.success("Expense cancelled");
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to cancel expense");
    }
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    try {
      await createExpenseCategory(categoryForm);
      toast.success("Category saved");
      setCategoryForm(categoryInitial);
      await loadLookups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save category");
    }
  };

  const submitVendor = async (event) => {
    event.preventDefault();
    try {
      await createVendor(vendorForm);
      toast.success("Vendor saved");
      setVendorForm(vendorInitial);
      await loadLookups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save vendor");
    }
  };

  const submitAccount = async (event) => {
    event.preventDefault();
    try {
      await createPaymentAccount(accountForm);
      toast.success("Payment account saved");
      setAccountForm(accountInitial);
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save account");
    }
  };

  const requiresReference = ["bank_transfer", "upi", "online", "card"].includes(
    expenseForm.payment_mode,
  );

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-950'>Society Finance</h2>
          <p className='text-sm text-slate-500'>
            Track income, expenses, payment accounts, balances, and ledger activity.
          </p>
        </div>
        <button
          type='button'
          onClick={refreshAll}
          disabled={loading}
          className='inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 disabled:opacity-60'
          title='Refresh finance'>
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className='flex gap-2 overflow-x-auto border-b border-slate-200 pb-2'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type='button'
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

      {activeTab === "dashboard" && (
        <div className='space-y-5'>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <Stat label='Opening Balance' value={money(dashboard?.summary?.opening_balance)} icon={Landmark} />
            <Stat label='Total Income' value={money(dashboard?.summary?.total_income)} icon={IndianRupee} />
            <Stat label='Total Expenses' value={money(dashboard?.summary?.total_expenses)} icon={CreditCard} />
            <Stat label='Closing Balance' value={money(dashboard?.summary?.closing_balance)} icon={Building2} />
          </div>
          <div className='grid gap-3 sm:grid-cols-3'>
            <Stat label='Net Cash Flow' value={money(dashboard?.summary?.net_cash_flow)} />
            <Stat label='Cash Balance' value={money(dashboard?.summary?.cash_balance)} />
            <Stat label='Bank Balance' value={money(dashboard?.summary?.bank_balance)} />
          </div>
          <div className='grid gap-5 xl:grid-cols-2'>
            <section className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <h3 className='mb-4 font-semibold text-slate-950'>Expense Category Breakdown</h3>
              <MiniBars data={dashboard?.categoryBreakdown || []} labelKey='category_name' valueKey='amount' />
            </section>
            <section className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <h3 className='mb-4 font-semibold text-slate-950'>Payment Mode Breakdown</h3>
              <MiniBars data={dashboard?.paymentModeBreakdown || []} labelKey='payment_mode' valueKey='amount' tone='emerald' />
            </section>
          </div>
          <DataTable
            columns={["Expense No.", "Date", "Category", "Paid To", "Amount", "Mode", "Account", "Status"]}
            empty='No recent expenses'
            rows={(dashboard?.recentExpenses || []).map((expense) => [
              expense.expense_number,
              displayDate(expense.expense_date),
              expense.category_name,
              expense.vendor_name || expense.paid_to || "-",
              money(expense.amount),
              labelize(expense.payment_mode),
              expense.account_name || "-",
              labelize(expense.status),
            ])}
          />
        </div>
      )}

      {activeTab === "add" && (
        <form onSubmit={submitExpense} className='rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 p-5 font-semibold text-slate-800'>Expense Details</div>
          <div className='grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3'>
            <Field label='Expense Date *'>
              <TextInput type='date' value={expenseForm.expense_date} onChange={(e) => setExpense("expense_date", e.target.value)} required />
            </Field>
            <Field label='Expense Category *'>
              <Dropdown value={expenseForm.category_id} onChange={(value) => setExpense("category_id", value)} options={categoryOptions} placeholder='Select category' searchable required />
            </Field>
            <Field label='Sub Category'>
              <TextInput value={expenseForm.sub_category} onChange={(e) => setExpense("sub_category", e.target.value)} placeholder='Optional' />
            </Field>
            <Field label='Vendor / Payee'>
              <Dropdown value={expenseForm.vendor_id} onChange={(value) => setExpense("vendor_id", value)} options={vendorOptions} searchable />
            </Field>
            <Field label='Paid To'>
              <TextInput value={expenseForm.paid_to} onChange={(e) => setExpense("paid_to", e.target.value)} placeholder='Name if no vendor is linked' />
            </Field>
            <Field label='Amount *'>
              <TextInput type='number' min='0.01' step='0.01' value={expenseForm.amount} onChange={(e) => setExpense("amount", e.target.value)} required />
            </Field>
            <Field label='Description *' className='md:col-span-2 xl:col-span-3'>
              <TextInput value={expenseForm.description} onChange={(e) => setExpense("description", e.target.value)} placeholder='What was this expense for?' required />
            </Field>
            <Field label='Invoice Number'>
              <TextInput value={expenseForm.invoice_number} onChange={(e) => setExpense("invoice_number", e.target.value)} />
            </Field>
            <Field label='Invoice Date'>
              <TextInput type='date' value={expenseForm.invoice_date} onChange={(e) => setExpense("invoice_date", e.target.value)} />
            </Field>
            <Field label='Status'>
              <Dropdown value={expenseForm.status} onChange={(value) => setExpense("status", value)} options={statusOptions.filter((item) => item.value !== "cancelled")} />
            </Field>
          </div>

          <div className='border-y border-slate-200 bg-slate-50 p-5 font-semibold text-slate-800'>Payment Details</div>
          <div className='grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3'>
            <Field label='Payment Mode *'>
              <Dropdown value={expenseForm.payment_mode} onChange={(value) => setExpense("payment_mode", value)} options={paymentModeOptions} required />
            </Field>
            <Field label={expenseForm.status === "paid" ? "Payment Account *" : "Payment Account"}>
              <Dropdown value={expenseForm.payment_account_id} onChange={(value) => setExpense("payment_account_id", value)} options={accountOptions} placeholder='Select account' searchable required={expenseForm.status === "paid"} />
            </Field>
            {requiresReference && (
              <Field label='Reference / Transaction No.'>
                <TextInput value={expenseForm.reference_no} onChange={(e) => setExpense("reference_no", e.target.value)} placeholder='UPI, bank or online reference' />
              </Field>
            )}
            {expenseForm.payment_mode === "cheque" && (
              <>
                <Field label='Cheque Number *'>
                  <TextInput value={expenseForm.cheque_number} onChange={(e) => setExpense("cheque_number", e.target.value)} required />
                </Field>
                <Field label='Cheque Date *'>
                  <TextInput type='date' value={expenseForm.cheque_date} onChange={(e) => setExpense("cheque_date", e.target.value)} required />
                </Field>
              </>
            )}
            <Field label='Notes' className='md:col-span-2 xl:col-span-3'>
              <TextInput value={expenseForm.notes} onChange={(e) => setExpense("notes", e.target.value)} placeholder='Optional internal note' />
            </Field>
          </div>
          <div className='flex justify-end border-t border-slate-200 bg-slate-50 p-4'>
            <button disabled={loading} className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60'>
              <Save size={16} />
              Save Expense
            </button>
          </div>
        </form>
      )}

      {activeTab === "list" && (
        <div className='space-y-4'>
          <div className='grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[180px_180px_1fr]'>
            <Dropdown value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={[{ value: "", label: "All Statuses" }, ...statusOptions]} />
            <Dropdown value={filters.payment_mode} onChange={(value) => setFilters({ ...filters, payment_mode: value })} options={[{ value: "", label: "All Modes" }, ...paymentModeOptions]} />
            <div className='relative'>
              <Search size={17} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
              <TextInput value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} onBlur={loadExpenses} placeholder='Search expense, category, vendor, description' className='pl-10' />
            </div>
          </div>
          <DataTable
            columns={["Expense No.", "Date", "Category", "Paid To", "Description", "Amount", "Mode", "Account", "Status", "Actions"]}
            empty='No expenses found'
            rows={expenses.map((expense) => [
              expense.expense_number,
              displayDate(expense.expense_date),
              expense.category_name,
              expense.vendor_name || expense.paid_to || "-",
              expense.description,
              money(expense.amount),
              labelize(expense.payment_mode),
              expense.account_name || "-",
              labelize(expense.status),
              <div className='flex justify-end gap-2'>
                {expense.status !== "paid" && expense.status !== "cancelled" && (
                  <button type='button' onClick={() => markPaid(expense)} className='inline-flex h-8 items-center rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white'>
                    Paid
                  </button>
                )}
                {expense.status !== "cancelled" && (
                  <button type='button' onClick={() => cancelSelectedExpense(expense)} className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50' title='Cancel expense'>
                    <XCircle size={15} />
                  </button>
                )}
              </div>,
            ])}
          />
        </div>
      )}

      {activeTab === "setup" && (
        <div className='grid gap-5 xl:grid-cols-3'>
          <form onSubmit={submitCategory} className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
            <h3 className='mb-4 flex items-center gap-2 font-semibold text-slate-950'><Tags size={17} /> Expense Categories</h3>
            <div className='space-y-3'>
              <TextInput value={categoryForm.category_name} onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })} placeholder='Category name' required />
              <TextInput value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder='Description' />
              <button className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white'><Save size={16} /> Save Category</button>
            </div>
            <div className='mt-4 max-h-56 space-y-2 overflow-y-auto'>
              {categories.map((item) => (
                <div key={item.id} className='rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700'>{item.category_name}</div>
              ))}
            </div>
          </form>

          <form onSubmit={submitVendor} className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
            <h3 className='mb-4 flex items-center gap-2 font-semibold text-slate-950'><UsersRound size={17} /> Vendors / Payees</h3>
            <div className='space-y-3'>
              <TextInput value={vendorForm.vendor_name} onChange={(e) => setVendorForm({ ...vendorForm, vendor_name: e.target.value })} placeholder='Vendor name' required />
              <TextInput value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} placeholder='Phone' />
              <TextInput value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} placeholder='Email' />
              <button className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white'><Save size={16} /> Save Vendor</button>
            </div>
          </form>

          <form onSubmit={submitAccount} className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
            <h3 className='mb-4 flex items-center gap-2 font-semibold text-slate-950'><Landmark size={17} /> Payment Accounts</h3>
            <div className='space-y-3'>
              <TextInput value={accountForm.account_name} onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })} placeholder='Account name' required />
              <Dropdown value={accountForm.account_type} onChange={(value) => setAccountForm({ ...accountForm, account_type: value })} options={accountTypeOptions} />
              {accountForm.account_type === "bank" && (
                <>
                  <TextInput value={accountForm.bank_name} onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })} placeholder='Bank name' />
                  <TextInput value={accountForm.masked_account_number} onChange={(e) => setAccountForm({ ...accountForm, masked_account_number: e.target.value })} placeholder='Masked account number' />
                </>
              )}
              <TextInput type='number' min='0' step='0.01' value={accountForm.opening_balance} onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })} placeholder='Opening balance' />
              <button className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white'><Save size={16} /> Save Account</button>
            </div>
            <div className='mt-4 max-h-56 space-y-2 overflow-y-auto'>
              {accounts.map((item) => (
                <div key={item.id} className='rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700'>
                  <div className='font-medium'>{item.account_name}</div>
                  <div className='text-xs text-slate-500'>{money(item.current_balance)}</div>
                </div>
              ))}
            </div>
          </form>
        </div>
      )}

      {activeTab === "ledger" && (
        <DataTable
          columns={["Date", "Type", "Reference", "Description", "Account", "Debit", "Credit", "Running Balance"]}
          empty='No financial transactions found'
          rows={ledger.map((row) => [
            displayDate(row.transaction_date),
            labelize(row.transaction_type),
            row.reference_no || row.transaction_code,
            row.description,
            row.account_name,
            money(row.debit_amount),
            money(row.credit_amount),
            money(row.running_balance),
          ])}
        />
      )}
    </div>
  );
}

export default FinanceManagement;
