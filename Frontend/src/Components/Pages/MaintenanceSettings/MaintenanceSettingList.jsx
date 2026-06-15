import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  deleteMaintenanceSetting,
  getMaintenanceSettings,
} from "../../../api/maintenanceSettings.api";

const labels = {
  base_maintenance: "Base Maintenance",
  per_sqft_rate: "Per Sqft Rate",
  late_fee: "Late Fee",
  parking_fee: "Parking Fee",
  noc_charge: "NOC Charge",
};

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function MaintenanceSettingList() {
  const [settings, setSettings] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getMaintenanceSettings(page, 10);
      setSettings(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [page]);

  const handleDelete = async (setting) => {
    const confirmed = window.confirm(
      `Deactivate ${labels[setting.setting_key] || setting.setting_key}?`
    );

    if (!confirmed) return;

    try {
      await deleteMaintenanceSetting(setting.id);
      toast.success("Setting deactivated successfully");
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate setting");
    }
  };

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-950'>
            Active Charges
          </h2>
          <p className='text-sm text-slate-500'>
            Society-specific maintenance and NOC settings.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className='inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800'
          title='Refresh settings'>
          <RefreshCw size={17} />
        </button>
      </div>

      <div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='bg-slate-100 text-left text-slate-600'>
              <tr>
                <th className='px-4 py-3'>Code</th>
                <th className='px-4 py-3'>Charge</th>
                <th className='px-4 py-3'>Amount</th>
                <th className='px-4 py-3'>Type</th>
                <th className='px-4 py-3'>Effective</th>
                <th className='px-4 py-3 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan='6' className='px-4 py-8 text-center text-slate-500'>
                    Loading settings...
                  </td>
                </tr>
              ) : settings.length === 0 ? (
                <tr>
                  <td colSpan='6' className='px-4 py-8 text-center text-slate-500'>
                    No active settings found
                  </td>
                </tr>
              ) : (
                settings.map((setting) => (
                  <tr key={setting.id} className='border-t border-slate-100'>
                    <td className='px-4 py-3 text-xs text-slate-500'>
                      {setting.setting_code}
                    </td>
                    <td className='px-4 py-3 font-medium text-slate-950'>
                      {labels[setting.setting_key] || setting.setting_key}
                    </td>
                    <td className='px-4 py-3 font-semibold'>
                      {money(setting.setting_value)}
                    </td>
                    <td className='px-4 py-3 capitalize'>
                      {setting.value_type?.replace("_", " ")}
                    </td>
                    <td className='px-4 py-3'>
                      {setting.effective_from
                        ? new Date(setting.effective_from).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex justify-end'>
                        <button
                          onClick={() => handleDelete(setting)}
                          className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 text-rose-700 transition hover:bg-rose-50'
                          title='Deactivate setting'>
                          <Trash2 size={16} />
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

export default MaintenanceSettingList;
