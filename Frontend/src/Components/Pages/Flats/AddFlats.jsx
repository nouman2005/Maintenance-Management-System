import React, { useState } from "react";
import toast from "react-hot-toast";
import { addFlat } from "../../../api/flats.api";

function AddFlats() {
  const [formData, setFormData] = useState({
    wing: "",
    floor_no: "",
    flat_no: "",
    area: "",
    owner_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    maintenance_amount: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await addFlat(formData);
      toast.success(res.data.message);

      setFormData({
        wing: "",
        floor_no: "",
        flat_no: "",
        area: "",
        owner_name: "",
        phone: "",
        whatsapp: "",
        email: "",
        maintenance_amount: "",
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add flat");
    }
  };

  return (
    <div className='max-w-5xl mx-auto'>
      {/* Header */}
      <div className='mb-6'>
        <h2 className='text-2xl font-semibold text-gray-800'>Add New Flat</h2>
        <p className='text-sm text-gray-500'>
          Fill flat and owner details carefully
        </p>
      </div>

      {/* Card */}
      <div className='bg-white rounded-2xl border border-gray-200 shadow-sm'>
        <form
          onSubmit={handleSubmit}
          className='p-6 grid grid-cols-1 md:grid-cols-2 gap-5'>
          {/* Wing */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Wing
            </label>
            <input
              name='wing'
              value={formData.wing}
              onChange={handleChange}
              placeholder='A / B / C'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition'
            />
          </div>

          {/* Floor */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Floor No
            </label>
            <input
              name='floor_no'
              value={formData.floor_no}
              onChange={handleChange}
              placeholder='1, 2, 3...'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition'
            />
          </div>

          {/* Flat */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Flat No
            </label>
            <input
              name='flat_no'
              value={formData.flat_no}
              onChange={handleChange}
              placeholder='101, 202'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition'
            />
          </div>

          {/* Area */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Area (sqft)
            </label>
            <input
              name='area'
              value={formData.area}
              onChange={handleChange}
              placeholder='1200'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition'
            />
          </div>

          {/* Owner */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Owner Name
            </label>
            <input
              name='owner_name'
              value={formData.owner_name}
              onChange={handleChange}
              placeholder='Full Name'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition'
            />
          </div>

          {/* Phone */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Phone
            </label>
            <input
              name='phone'
              value={formData.phone}
              onChange={handleChange}
              placeholder='9876543210'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition'
            />
          </div>

          {/* Whatsapp */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Whatsapp
            </label>
            <input
              name='whatsapp'
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder='Same as phone'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition'
            />
          </div>

          {/* Email */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Email
            </label>
            <input
              name='email'
              value={formData.email}
              onChange={handleChange}
              placeholder='owner@email.com'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition'
            />
          </div>

          {/* Maintenance */}
          <div className='md:col-span-2'>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Maintenance Amount
            </label>
            <input
              name='maintenance_amount'
              value={formData.maintenance_amount}
              onChange={handleChange}
              placeholder='₹ 1500'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition'
            />
          </div>

          {/* Submit */}
          <div className='md:col-span-2 flex justify-end pt-4 border-t'>
            <button
              type='submit'
              className='rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium
              text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40 transition'>
              Add Flat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddFlats;
