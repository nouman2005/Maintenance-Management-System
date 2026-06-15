import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BadgeIndianRupee, CalendarDays, Save, UserRound } from "lucide-react";
import { getFlatsPaginated } from "../../../api/flats.api";
import { getMaintenanceSettings } from "../../../api/maintenanceSettings.api";
import { addTenant } from "../../../api/tenants.api";

const initialForm = {
  flat_id: "",
  tenant_name: "",
  tenant_phone: "",
  tenant_whatsapp: "",
  tenant_email: "",
  move_in_date: "",
};

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Field = ({ label, className = "", ...props }) => (
  <label className={`block ${className}`}>
    <span className='mb-1.5 block text-sm font-medium text-slate-600'>
      {label}
    </span>
    <input
      {...props}
      className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
    />
  </label>
);

function AddTenants() {
  const [formData, setFormData] = useState(initialForm);
  const [availableFlats, setAvailableFlats] = useState([]);
  const [nocCharge, setNocCharge] = useState(0);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  const selectedFlat = useMemo(
    () => availableFlats.find((flat) => String(flat.id) === formData.flat_id),
    [availableFlats, formData.flat_id]
  );

  const totalCharge = Number(selectedFlat?.maintenance_amount || 0) + nocCharge;

  const loadMeta = async () => {
    setMetaLoading(true);
    try {
      const [flatsRes, settingsRes] = await Promise.all([
        getFlatsPaginated(1, 100, { occupancy: "owner" }),
        getMaintenanceSettings(1, 100),
      ]);

      setAvailableFlats(flatsRes.data.data || []);
      const noc = (settingsRes.data.data || []).find(
        (setting) => setting.setting_key === "noc_charge"
      );
      setNocCharge(Number(noc?.setting_value || 0));
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load tenant form");
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await addTenant(formData);
      toast.success(res.data.message);
      setFormData(initialForm);
      loadMeta();
    } catch (err) {
      const errors = err?.response?.data?.errors;
      toast.error(
        errors?.[0]?.msg ||
          err.response?.data?.message ||
          "Failed to add tenant"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='mx-auto max-w-6xl space-y-5'>
      <div className='flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-950'>Add Tenant</h2>
          <p className='text-sm text-slate-500'>
            Assign a tenant to an available flat and snapshot charges.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className='grid gap-5 lg:grid-cols-[1fr_340px]'>
        <div className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='mb-5 flex items-center gap-2 text-sm font-semibold text-slate-800'>
            <UserRound size={18} className='text-sky-600' />
            Tenant Details
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='block sm:col-span-2'>
              <span className='mb-1.5 block text-sm font-medium text-slate-600'>
                Available Flat
              </span>
              <select
                name='flat_id'
                value={formData.flat_id}
                onChange={handleChange}
                required
                disabled={metaLoading}
                className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
                <option value=''>
                  {metaLoading ? "Loading flats..." : "Select flat"}
                </option>
                {availableFlats.map((flat) => (
                  <option key={flat.id} value={flat.id}>
                    {flat.wing}-{flat.flat_no} | {flat.owner_name} |{" "}
                    {money(flat.maintenance_amount)}
                  </option>
                ))}
              </select>
            </label>

            <Field
              label='Tenant Name'
              name='tenant_name'
              value={formData.tenant_name}
              onChange={handleChange}
              placeholder='Full name'
              required
            />
            <Field
              label='Phone'
              name='tenant_phone'
              value={formData.tenant_phone}
              onChange={handleChange}
              placeholder='9876543210'
              required
            />
            <Field
              label='WhatsApp'
              name='tenant_whatsapp'
              value={formData.tenant_whatsapp}
              onChange={handleChange}
              placeholder='Optional'
            />
            <Field
              label='Email'
              name='tenant_email'
              type='email'
              value={formData.tenant_email}
              onChange={handleChange}
              placeholder='tenant@example.com'
            />
            <Field
              label='Move-in Date'
              name='move_in_date'
              type='date'
              value={formData.move_in_date}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <aside className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='mb-5 flex items-center gap-2 text-sm font-semibold text-slate-800'>
            <BadgeIndianRupee size={18} className='text-emerald-600' />
            Charge Preview
          </div>

          <div className='space-y-3 text-sm'>
            <div className='flex items-center justify-between rounded-md bg-slate-50 p-3'>
              <span className='text-slate-500'>Maintenance</span>
              <span className='font-semibold text-slate-950'>
                {money(selectedFlat?.maintenance_amount)}
              </span>
            </div>
            <div className='flex items-center justify-between rounded-md bg-slate-50 p-3'>
              <span className='text-slate-500'>Society NOC</span>
              <span className='font-semibold text-slate-950'>
                {money(nocCharge)}
              </span>
            </div>
            <div className='flex items-center justify-between rounded-md bg-slate-950 p-3 text-white'>
              <span>Total</span>
              <span className='font-semibold'>{money(totalCharge)}</span>
            </div>
          </div>

          <div className='mt-5 flex items-start gap-2 rounded-md bg-sky-50 p-3 text-sm text-sky-900'>
            <CalendarDays size={16} className='mt-0.5 shrink-0' />
            <span>
              NOC charge is picked from this society's active maintenance
              settings.
            </span>
          </div>

          <button
            type='submit'
            disabled={loading || metaLoading}
            className='mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'>
            <Save size={16} />
            {loading ? "Saving..." : "Save Tenant"}
          </button>
        </aside>
      </form>
    </div>
  );
}

export default AddTenants;
