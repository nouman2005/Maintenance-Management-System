import React, { useState } from "react";
import toast from "react-hot-toast";
import { Save, Settings } from "lucide-react";
import { addMaintenanceSetting } from "../../../api/maintenanceSettings.api";

const settingOptions = [
  { value: "base_maintenance", label: "Base Maintenance" },
  { value: "per_sqft_rate", label: "Per Sqft Rate" },
  { value: "late_fee", label: "Late Fee" },
  { value: "parking_fee", label: "Parking Fee" },
  { value: "noc_charge", label: "NOC Charge" },
];

const initialForm = {
  setting_key: "noc_charge",
  setting_value: "",
  value_type: "fixed",
  description: "",
  effective_from: "",
};

function AddMaintenanceSetting() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          value === "" ? undefined : value,
        ])
      );
      const res = await addMaintenanceSetting(payload);
      toast.success(res.data.message);
      setForm(initialForm);
    } catch (err) {
      const errors = err?.response?.data?.errors;
      toast.error(
        errors?.[0]?.msg ||
          err.response?.data?.message ||
          "Failed to save setting"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='mx-auto max-w-4xl space-y-5'>
      <div className='border-b border-slate-200 pb-4'>
        <h2 className='text-2xl font-semibold text-slate-950'>
          Maintenance Settings
        </h2>
        <p className='text-sm text-slate-500'>
          Save society-wise charges, including the NOC charge used for tenants.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className='rounded-lg border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 p-5'>
          <div className='flex items-center gap-2 text-sm font-semibold text-slate-800'>
            <Settings size={18} className='text-sky-600' />
            Charge Details
          </div>
        </div>

        <div className='grid gap-4 p-5 sm:grid-cols-2'>
          <label className='block'>
            <span className='mb-1.5 block text-sm font-medium text-slate-600'>
              Charge Type
            </span>
            <select
              name='setting_key'
              value={form.setting_key}
              onChange={handleChange}
              className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
              {settingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className='block'>
            <span className='mb-1.5 block text-sm font-medium text-slate-600'>
              Amount
            </span>
            <input
              name='setting_value'
              type='number'
              min='0'
              step='0.01'
              value={form.setting_value}
              onChange={handleChange}
              placeholder='500'
              required
              className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </label>

          <label className='block'>
            <span className='mb-1.5 block text-sm font-medium text-slate-600'>
              Value Type
            </span>
            <select
              name='value_type'
              value={form.value_type}
              onChange={handleChange}
              className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
              <option value='fixed'>Fixed</option>
              <option value='percentage'>Percentage</option>
              <option value='per_sqft'>Per Sqft</option>
            </select>
          </label>

          <label className='block'>
            <span className='mb-1.5 block text-sm font-medium text-slate-600'>
              Effective From
            </span>
            <input
              name='effective_from'
              type='date'
              value={form.effective_from}
              onChange={handleChange}
              className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </label>

          <label className='block sm:col-span-2'>
            <span className='mb-1.5 block text-sm font-medium text-slate-600'>
              Description
            </span>
            <input
              name='description'
              value={form.description}
              onChange={handleChange}
              placeholder='Optional note'
              maxLength={255}
              className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            />
          </label>
        </div>

        <div className='flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4'>
          <button
            type='submit'
            disabled={loading}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'>
            <Save size={16} />
            {loading ? "Saving..." : "Save Setting"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddMaintenanceSetting;
