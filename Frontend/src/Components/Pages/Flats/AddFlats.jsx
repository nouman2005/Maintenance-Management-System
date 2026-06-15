import React, { useState } from "react";
import toast from "react-hot-toast";
import { Building2, IndianRupee, Save, UserRound } from "lucide-react";
import { addFlat } from "../../../api/flats.api";

const initialForm = {
  wing: "",
  floor_no: "",
  flat_no: "",
  area_sqft: "",
  owner_name: "",
  owner_phone: "",
  owner_whatsapp: "",
  owner_email: "",
  maintenance_amount: "",
};

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

function AddFlats() {
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          value === "" ? undefined : value,
        ])
      );

      const res = await addFlat(payload);
      toast.success(res.data.message);
      setFormData(initialForm);
    } catch (err) {
      const errors = err?.response?.data?.errors;
      toast.error(
        errors?.[0]?.msg || err?.response?.data?.message || "Failed to add flat"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='mx-auto max-w-6xl space-y-5'>
      <div className='flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-950'>Add Flat</h2>
          <p className='text-sm text-slate-500'>
            Create a flat with owner details and a maintenance amount.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className='rounded-lg border border-slate-200 bg-white shadow-sm'>
        <div className='grid gap-5 p-5 lg:grid-cols-[1fr_1fr]'>
          <section className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-semibold text-slate-800'>
              <Building2 size={18} className='text-sky-600' />
              Flat Details
            </div>
            <div className='grid gap-4 sm:grid-cols-3'>
              <Field
                label='Wing'
                name='wing'
                value={formData.wing}
                onChange={handleChange}
                placeholder='A'
                maxLength={10}
                required
              />
              <Field
                label='Floor'
                name='floor_no'
                type='number'
                min='0'
                value={formData.floor_no}
                onChange={handleChange}
                placeholder='1'
                required
              />
              <Field
                label='Flat No'
                name='flat_no'
                value={formData.flat_no}
                onChange={handleChange}
                placeholder='101'
                maxLength={10}
                required
              />
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label='Area Sqft'
                name='area_sqft'
                type='number'
                min='100'
                value={formData.area_sqft}
                onChange={handleChange}
                placeholder='850'
              />
              <Field
                label='Maintenance Amount'
                name='maintenance_amount'
                type='number'
                min='0'
                step='0.01'
                value={formData.maintenance_amount}
                onChange={handleChange}
                placeholder='1500'
                required
              />
            </div>
          </section>

          <section className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-semibold text-slate-800'>
              <UserRound size={18} className='text-emerald-600' />
              Owner Details
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label='Owner Name'
                name='owner_name'
                value={formData.owner_name}
                onChange={handleChange}
                placeholder='Full name'
                required
              />
              <Field
                label='Phone'
                name='owner_phone'
                value={formData.owner_phone}
                onChange={handleChange}
                placeholder='9876543210'
                required
              />
              <Field
                label='WhatsApp'
                name='owner_whatsapp'
                value={formData.owner_whatsapp}
                onChange={handleChange}
                placeholder='Optional'
              />
              <Field
                label='Email'
                name='owner_email'
                type='email'
                value={formData.owner_email}
                onChange={handleChange}
                placeholder='owner@example.com'
              />
            </div>
          </section>
        </div>

        <div className='flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4'>
          <div className='flex items-center gap-2 text-sm text-slate-600'>
            <IndianRupee size={16} />
            <span>Maintenance is used when tenant charges are calculated.</span>
          </div>
          <button
            type='submit'
            disabled={loading}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'>
            <Save size={16} />
            {loading ? "Saving..." : "Save Flat"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddFlats;
