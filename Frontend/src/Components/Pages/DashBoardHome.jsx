import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Home,
  IndianRupee,
  RefreshCw,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { getMaintenanceSummary } from "../../api/maintenance.api";

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const monthLabel = (value) => {
  if (!value) return "-";
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
};

function Metric({ icon: Icon, label, value, detail, tone }) {
  const tones = {
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-sm font-medium text-slate-500'>{label}</div>
          <div className='mt-2 text-2xl font-semibold text-slate-950'>{value}</div>
          <div className='mt-1 text-xs text-slate-500'>{detail}</div>
        </div>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
          {React.createElement(Icon, { size: 19 })}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ children }) {
  return <div className='px-4 py-10 text-center text-sm text-slate-500'>{children}</div>;
}

function DashboardHome({ onNavigate }) {
  const { user } = useSelector((state) => state.auth);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await getMaintenanceSummary();
      setDashboard(response.data.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load society dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const society = dashboard?.society || {};
  const summary = dashboard?.summary || {};
  const monthlyCollections = dashboard?.monthly_collections || [];
  const recentPayments = dashboard?.recent_payments || [];
  const activeTenants = dashboard?.active_tenants || [];
  const outstandingDues = dashboard?.outstanding_dues || [];
  const notices = dashboard?.notices || [];

  const totalFlats = Number(society.total_flats || 0);
  const occupancy = {
    total: totalFlats,
    owner: Number(society.owner_occupied || 0),
    tenant: Number(society.tenant_occupied || 0),
    vacant: Number(society.vacant_flats || 0),
    percent: (value) => (totalFlats ? Math.min((value / totalFlats) * 100, 100) : 0),
  };

  const maxCollection = Math.max(
    ...monthlyCollections.map((item) => Number(item.total_collection || 0)),
    1
  );

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <div className='text-sm font-medium text-sky-700'>
            {society.society_name || "Society Administration"}
          </div>
          <h2 className='mt-1 text-2xl font-semibold text-slate-950'>Society Overview</h2>
          <p className='mt-1 text-sm text-slate-500'>
            Welcome back, {user?.name || "Administrator"}. Here is the latest operational and collection summary.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <span className='hidden text-xs text-slate-500 sm:block'>
            Registration: {society.registration_number || "-"}
          </span>
          <button
            type='button'
            onClick={loadDashboard}
            disabled={loading}
            className='inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 disabled:opacity-60'
            title='Refresh dashboard'>
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <Metric
          icon={Building2}
          label='Total Flats'
          value={loading ? "..." : occupancy.total}
          detail={`${society.active_flats || 0} flats registered`}
          tone='blue'
        />
        <Metric
          icon={Home}
          label='Occupied Flats'
          value={loading ? "..." : society.occupied_flats || 0}
          detail={`${occupancy.owner} owner, ${occupancy.tenant} tenant`}
          tone='green'
        />
        <Metric
          icon={Home}
          label='Vacant Flats'
          value={loading ? "..." : occupancy.vacant}
          detail='Available against society capacity'
          tone='slate'
        />
        <Metric
          icon={UsersRound}
          label='Active Tenants'
          value={loading ? "..." : society.active_tenants || 0}
          detail={`${occupancy.tenant} tenant-occupied flats`}
          tone='violet'
        />
        <Metric
          icon={CircleDollarSign}
          label='Total Maintenance Due'
          value={loading ? "..." : money(summary.maintenance_due)}
          detail={`${money(summary.noc_due)} NOC and ${money(summary.interest_due)} interest`}
          tone='amber'
        />
        <Metric
          icon={IndianRupee}
          label='Total Collected'
          value={loading ? "..." : money(summary.total_collected)}
          detail={`${money(summary.maintenance_collected)} maintenance`}
          tone='green'
        />
        <Metric
          icon={AlertCircle}
          label='Pending Amount'
          value={loading ? "..." : money(summary.total_outstanding)}
          detail={`${summary.flats_with_dues || 0} flats with dues`}
          tone='red'
        />
        <Metric
          icon={TrendingUp}
          label='Interest Outstanding'
          value={loading ? "..." : money(summary.interest_outstanding)}
          detail={`${money(summary.noc_outstanding)} NOC pending`}
          tone='amber'
        />
      </div>

      <div className='grid gap-6 xl:grid-cols-[1.25fr_0.75fr]'>
        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='flex items-center justify-between border-b border-slate-200 px-5 py-4'>
            <div>
              <h3 className='font-semibold text-slate-950'>Monthly Collection Summary</h3>
              <p className='text-xs text-slate-500'>Maintenance, NOC, and interest collected over six months</p>
            </div>
            <WalletCards size={19} className='text-slate-500' />
          </div>
          <div className='space-y-4 p-5'>
            {monthlyCollections.length === 0 ? (
              <EmptyState>No collection activity is available yet.</EmptyState>
            ) : (
              monthlyCollections.map((item) => {
                const total = Number(item.total_collection || 0);
                return (
                  <div key={item.month} className='grid grid-cols-[72px_1fr_auto] items-center gap-3'>
                    <div className='text-sm font-medium text-slate-700'>{monthLabel(item.month)}</div>
                    <div className='h-3 overflow-hidden rounded-sm bg-slate-100'>
                      <div
                        className='h-full bg-sky-600'
                        style={{ width: `${Math.max((total / maxCollection) * 100, 2)}%` }}
                      />
                    </div>
                    <div className='w-28 text-right text-sm font-semibold text-slate-950'>{money(total)}</div>
                  </div>
                );
              })
            )}
          </div>
          <div className='grid grid-cols-3 border-t border-slate-200 bg-slate-50'>
            {[
              ["Maintenance", summary.maintenance_collected],
              ["NOC", summary.noc_collected],
              ["Interest", summary.interest_collected],
            ].map(([label, value]) => (
              <div key={label} className='px-4 py-3 text-center'>
                <div className='text-xs text-slate-500'>{label}</div>
                <div className='mt-1 text-sm font-semibold text-slate-900'>{money(value)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='flex items-center justify-between border-b border-slate-200 px-5 py-4'>
            <div>
              <h3 className='font-semibold text-slate-950'>Occupancy</h3>
              <p className='text-xs text-slate-500'>Owner, tenant, and vacant distribution</p>
            </div>
            <UsersRound size={19} className='text-slate-500' />
          </div>
          <div className='p-5'>
            <div className='flex h-5 overflow-hidden rounded-sm bg-slate-100'>
              <div className='bg-emerald-500' style={{ width: `${occupancy.percent(occupancy.owner)}%` }} />
              <div className='bg-violet-500' style={{ width: `${occupancy.percent(occupancy.tenant)}%` }} />
              <div className='bg-slate-300' style={{ width: `${occupancy.percent(occupancy.vacant)}%` }} />
            </div>
            <div className='mt-5 space-y-3'>
              {[
                ["Owner Occupied", occupancy.owner, "bg-emerald-500"],
                ["Tenant Occupied", occupancy.tenant, "bg-violet-500"],
                ["Vacant", occupancy.vacant, "bg-slate-300"],
              ].map(([label, value, color]) => (
                <div key={label} className='flex items-center justify-between text-sm'>
                  <div className='flex items-center gap-2 text-slate-600'>
                    <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
                    {label}
                  </div>
                  <span className='font-semibold text-slate-950'>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className='border-t border-slate-200 p-4'>
            <div className='grid grid-cols-3 gap-2'>
              {[
                ["PayMaintenance", "Collect", IndianRupee],
                ["AddBalanceMaintenance", "Add Balance", CircleDollarSign],
                ["MonthlyMaintenanceCollectionReport", "Reports", CalendarDays],
              ].map(([target, label, Icon]) => (
                <button
                  key={target}
                  type='button'
                  onClick={() => onNavigate?.(target)}
                  className='inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50'>
                  {React.createElement(Icon, { size: 15 })}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='flex items-center justify-between border-b border-slate-200 px-5 py-4'>
            <div>
              <h3 className='font-semibold text-slate-950'>Recent Maintenance Payments</h3>
              <p className='text-xs text-slate-500'>Latest receipts recorded across the society</p>
            </div>
            <IndianRupee size={19} className='text-slate-500' />
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead className='bg-slate-50 text-left text-xs font-medium text-slate-500'>
                <tr>
                  <th className='px-4 py-3'>Flat</th>
                  <th className='px-4 py-3'>Date</th>
                  <th className='px-4 py-3'>Mode</th>
                  <th className='px-4 py-3 text-right'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.length === 0 ? (
                  <tr><td colSpan='4'><EmptyState>No payments have been recorded.</EmptyState></td></tr>
                ) : (
                  recentPayments.map((payment) => (
                    <tr key={payment.id} className='border-t border-slate-100'>
                      <td className='px-4 py-3'>
                        <div className='font-medium text-slate-950'>{payment.wing}-{payment.flat_no}</div>
                        <div className='text-xs text-slate-500'>{payment.owner_name}</div>
                      </td>
                      <td className='px-4 py-3 text-slate-600'>{formatDate(payment.payment_date)}</td>
                      <td className='px-4 py-3 capitalize text-slate-600'>{payment.payment_mode?.replaceAll("_", " ")}</td>
                      <td className='px-4 py-3 text-right font-semibold text-slate-950'>{money(payment.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='flex items-center justify-between border-b border-slate-200 px-5 py-4'>
            <div>
              <h3 className='font-semibold text-slate-950'>Outstanding Dues Summary</h3>
              <p className='text-xs text-slate-500'>Highest pending flat balances</p>
            </div>
            <AlertCircle size={19} className='text-rose-600' />
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead className='bg-slate-50 text-left text-xs font-medium text-slate-500'>
                <tr>
                  <th className='px-4 py-3'>Flat</th>
                  <th className='px-4 py-3'>Oldest Due</th>
                  <th className='px-4 py-3 text-right'>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {outstandingDues.length === 0 ? (
                  <tr><td colSpan='3'><EmptyState>No outstanding dues.</EmptyState></td></tr>
                ) : (
                  outstandingDues.map((due) => (
                    <tr key={due.flat_id} className='border-t border-slate-100'>
                      <td className='px-4 py-3'>
                        <div className='font-medium text-slate-950'>{due.wing}-{due.flat_no}</div>
                        <div className='text-xs text-slate-500'>{due.owner_name}</div>
                      </td>
                      <td className='px-4 py-3 text-slate-600'>{monthLabel(String(due.oldest_due_month || "").slice(0, 7))}</td>
                      <td className='px-4 py-3 text-right font-semibold text-rose-700'>{money(due.total_balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='flex items-center justify-between border-b border-slate-200 px-5 py-4'>
            <div>
              <h3 className='font-semibold text-slate-950'>Active Tenants</h3>
              <p className='text-xs text-slate-500'>Most recently occupied tenant flats</p>
            </div>
            <UserRound size={19} className='text-slate-500' />
          </div>
          {activeTenants.length === 0 ? (
            <EmptyState>No active tenants.</EmptyState>
          ) : (
            <div className='divide-y divide-slate-100'>
              {activeTenants.map((tenant) => (
                <div key={tenant.id} className='flex items-center justify-between gap-4 px-5 py-3'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700'>
                      <UserRound size={17} />
                    </span>
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-medium text-slate-950'>{tenant.tenant_name}</div>
                      <div className='text-xs text-slate-500'>{tenant.wing}-{tenant.flat_no} | Since {formatDate(tenant.move_in_date)}</div>
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='text-xs text-slate-500'>NOC</div>
                    <div className='text-sm font-semibold text-slate-900'>{money(tenant.noc_charge)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='flex items-center justify-between border-b border-slate-200 px-5 py-4'>
            <div>
              <h3 className='font-semibold text-slate-950'>Notices and Announcements</h3>
              <p className='text-xs text-slate-500'>Recent society communication</p>
            </div>
            <Bell size={19} className='text-slate-500' />
          </div>
          {notices.length === 0 ? (
            <div className='flex min-h-48 flex-col items-center justify-center px-6 text-center'>
              <span className='inline-flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-600'>
                <Bell size={20} />
              </span>
              <div className='mt-3 text-sm font-medium text-slate-800'>No current announcements</div>
              <div className='mt-1 max-w-sm text-xs text-slate-500'>
                No society notices have been published.
              </div>
            </div>
          ) : (
            <div className='divide-y divide-slate-100'>
              {notices.map((notice) => (
                <div key={notice.id} className='flex items-start gap-3 px-5 py-4'>
                  <Bell size={17} className='mt-0.5 shrink-0 text-sky-700' />
                  <div className='min-w-0'>
                    <div className='font-medium text-slate-950'>{notice.title}</div>
                    <div className='mt-1 text-sm text-slate-600'>{notice.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <button
        type='button'
        onClick={() => onNavigate?.("MonthlyMaintenanceCollectionReport")}
        className='inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50'>
        View full collection report
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

export default DashboardHome;
