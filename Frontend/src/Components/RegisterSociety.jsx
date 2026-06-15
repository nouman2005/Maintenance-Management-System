import React, { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Building2, Mail, Phone, UserRound } from "lucide-react";
import { sendSocietyRegistrationRequest } from "../api/society.api";

const initialForm = {
  society_name: "",
  registration_number: "",
  total_flats: "",
  society_phone: "",
  society_email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  admin_name: "",
  admin_email: "",
  admin_phone: "",
};

function RegisterSociety() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await sendSocietyRegistrationRequest(form);
      toast.success(res.data.message);
      setForm(initialForm);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.errors?.[0]?.msg ||
          "Unable to send request"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8'>
      <div className='w-full max-w-2xl border border-slate-800 bg-slate-900 p-6 rounded-lg shadow-xl'>
        <div className='mb-6'>
          <h1 className='text-2xl font-semibold'>Register Society</h1>
          <p className='text-sm text-slate-400 mt-1'>
            Submit your society details. Super admin approval will create your
            admin login and send credentials to your email.
          </p>
        </div>

        <form onSubmit={handleSubmit} className='grid gap-4 md:grid-cols-2'>
          <label className='space-y-2'>
            <span className='text-sm text-slate-300 flex items-center gap-2'>
              <Building2 size={16} /> Society Name
            </span>
            <input
              required
              value={form.society_name}
              onChange={(e) => updateField("society_name", e.target.value)}
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm text-slate-300 flex items-center gap-2'>
              <UserRound size={16} /> Admin Name
            </span>
            <input
              required
              value={form.admin_name}
              onChange={(e) => updateField("admin_name", e.target.value)}
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm text-slate-300'>
              Registration Number
            </span>
            <input
              required
              value={form.registration_number}
              onChange={(e) =>
                updateField("registration_number", e.target.value)
              }
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm text-slate-300'>Total Flats</span>
            <input
              required
              type='number'
              min='1'
              value={form.total_flats}
              onChange={(e) => updateField("total_flats", e.target.value)}
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm text-slate-300 flex items-center gap-2'>
              <Mail size={16} /> Admin Email
            </span>
            <input
              required
              type='email'
              value={form.admin_email}
              onChange={(e) => updateField("admin_email", e.target.value)}
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm text-slate-300 flex items-center gap-2'>
              <Phone size={16} /> Admin Phone
            </span>
            <input
              value={form.admin_phone}
              onChange={(e) => updateField("admin_phone", e.target.value)}
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm text-slate-300'>Society Phone</span>
            <input
              value={form.society_phone}
              onChange={(e) => updateField("society_phone", e.target.value)}
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm text-slate-300'>Society Email</span>
            <input
              type='email'
              value={form.society_email}
              onChange={(e) => updateField("society_email", e.target.value)}
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm text-slate-300'>City</span>
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm text-slate-300'>State</span>
            <input
              value={form.state}
              onChange={(e) => updateField("state", e.target.value)}
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm text-slate-300'>Pincode</span>
            <input
              value={form.pincode}
              onChange={(e) => updateField("pincode", e.target.value)}
              className='w-full h-11 rounded bg-slate-950 border border-slate-700 px-3 outline-none focus:border-indigo-500'
            />
          </label>

          <label className='space-y-2 md:col-span-2'>
            <span className='text-sm text-slate-300'>Society Address</span>
            <textarea
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              rows={3}
              className='w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 outline-none focus:border-indigo-500 resize-none'
            />
          </label>

          <div className='md:col-span-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2'>
            <Link to='/login' className='text-sm text-indigo-300'>
              Already approved? Sign in
            </Link>
            <button
              disabled={loading}
              className='h-11 px-5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 font-medium'>
              {loading ? "Sending request..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterSociety;
