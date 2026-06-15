import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, RefreshCw, Trash2, UserRound } from "lucide-react";
import { deactivateTenant, getTenants } from "../../../api/tenants.api";

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await getTenants(page, 10, { status });
      setTenants(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, status]);

  const totals = useMemo(
    () => ({
      tenants: tenants.length,
      noc: tenants.reduce((sum, item) => sum + Number(item.noc_charge || 0), 0),
      monthly: tenants.reduce(
        (sum, item) => sum + Number(item.total_monthly_charge || 0),
        0
      ),
    }),
    [tenants]
  );

  const handleDelete = async (tenant) => {
    const confirmed = window.confirm(`Deactivate tenant ${tenant.tenant_name}?`);
    if (!confirmed) return;

    try {
      await deactivateTenant(tenant.id);
      toast.success("Tenant deactivated successfully");
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate tenant");
    }
  };

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-950'>
            Tenants List
          </h2>
          <p className='text-sm text-slate-500'>
            Track tenant occupancy with maintenance and NOC charge snapshots.
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className='h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
            <option value='active'>Active</option>
            <option value='inactive'>Inactive</option>
          </select>
          <button
            onClick={fetchTenants}
            className='inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800'
            title='Refresh tenants'>
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        {[
          ["Tenants", totals.tenants],
          ["Total NOC", money(totals.noc)],
          ["Monthly Total", money(totals.monthly)],
        ].map(([label, value]) => (
          <div
            key={label}
            className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
            <div className='text-sm text-slate-500'>{label}</div>
            <div className='mt-1 text-2xl font-semibold text-slate-950'>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='bg-slate-100 text-left text-slate-600'>
              <tr>
                <th className='px-4 py-3'>Tenant</th>
                <th className='px-4 py-3'>Flat</th>
                <th className='px-4 py-3'>Phone</th>
                <th className='px-4 py-3'>Maintenance</th>
                <th className='px-4 py-3'>NOC</th>
                <th className='px-4 py-3'>Total</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan='8' className='px-4 py-8 text-center text-slate-500'>
                    Loading tenants...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan='8' className='px-4 py-8 text-center text-slate-500'>
                    No tenants found
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className='border-t border-slate-100'>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-3'>
                        <span className='inline-flex h-9 w-9 items-center justify-center rounded-md bg-violet-50 text-violet-700'>
                          <UserRound size={17} />
                        </span>
                        <div>
                          <div className='font-medium text-slate-950'>
                            {tenant.tenant_name}
                          </div>
                          <div className='text-xs text-slate-500'>
                            {tenant.tenant_code || tenant.tenant_email || "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      {tenant.wing}-{tenant.flat_no}
                    </td>
                    <td className='px-4 py-3'>{tenant.tenant_phone}</td>
                    <td className='px-4 py-3'>
                      {money(tenant.maintenance_amount)}
                    </td>
                    <td className='px-4 py-3'>{money(tenant.noc_charge)}</td>
                    <td className='px-4 py-3 font-semibold text-slate-950'>
                      {money(tenant.total_monthly_charge)}
                    </td>
                    <td className='px-4 py-3'>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          tenant.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => navigate(`/tenants/${tenant.id}`)}
                          className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50'
                          title='View tenant'>
                          <Eye size={16} />
                        </button>
                        {tenant.status === "active" && (
                          <button
                            onClick={() => handleDelete(tenant)}
                            className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 text-rose-700 transition hover:bg-rose-50'
                            title='Deactivate tenant'>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className='flex items-center justify-end gap-3'>
        <button
          disabled={page === 1}
          onClick={() => setPage((value) => value - 1)}
          className='h-10 rounded-md border border-slate-300 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50'>
          Prev
        </button>
        <span className='text-sm text-slate-500'>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((value) => value + 1)}
          className='h-10 rounded-md border border-slate-300 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50'>
          Next
        </button>
      </div>
    </div>
  );
}

export default TenantList;
