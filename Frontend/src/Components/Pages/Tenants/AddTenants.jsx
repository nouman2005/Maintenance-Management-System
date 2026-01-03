import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { addTenant } from "../../../api/tenants.api";

function AddTenants() {
  const [formData, setFormData] = useState({
    flat_id: "",
    tenant_name: "",
    tenant_phone: "",
    tenant_whatsapp: "",
    tenant_email: "",
    move_in_date: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.flat_id || !formData.tenant_name || !formData.tenant_phone) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const res = await addTenant(formData);

      if (res.data.success) {
        toast.success(res.data.message);

        setFormData({
          flat_id: "",
          tenant_name: "",
          tenant_phone: "",
          tenant_whatsapp: "",
          tenant_email: "",
          move_in_date: "",
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add tenant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 flex items-start justify-center p-6'>
      <div className='w-full max-w-3xl bg-white rounded-xl shadow-md p-8'>
        <h2 className='text-2xl font-semibold text-gray-800 mb-6'>
          Add New Tenant
        </h2>

        <form
          onSubmit={handleSubmit}
          className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* Flat ID */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Flat ID <span className='text-red-500'>*</span>
            </label>
            <input
              type='number'
              name='flat_id'
              value={formData.flat_id}
              onChange={handleChange}
              placeholder='Enter flat ID'
              className='w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            />
          </div>

          {/* Tenant Name */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Tenant Name <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              name='tenant_name'
              value={formData.tenant_name}
              onChange={handleChange}
              placeholder='Full name'
              className='w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            />
          </div>

          {/* Phone */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Phone Number <span className='text-red-500'>*</span>
            </label>
            <input
              type='tel'
              name='tenant_phone'
              value={formData.tenant_phone}
              onChange={handleChange}
              placeholder='10-digit mobile number'
              className='w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              WhatsApp Number
            </label>
            <input
              type='tel'
              name='tenant_whatsapp'
              value={formData.tenant_whatsapp}
              onChange={handleChange}
              placeholder='Same as phone (optional)'
              className='w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            />
          </div>

          {/* Email */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Email Address
            </label>
            <input
              type='email'
              name='tenant_email'
              value={formData.tenant_email}
              onChange={handleChange}
              placeholder='example@email.com'
              className='w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            />
          </div>

          {/* Move-in Date */}
          <div>
            <label className='block text-sm font-medium text-gray-600 mb-1'>
              Move-in Date
            </label>
            <input
              type='date'
              name='move_in_date'
              value={formData.move_in_date}
              onChange={handleChange}
              className='w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            />
          </div>

          {/* Submit Button */}
          <div className='col-span-1 md:col-span-2 flex justify-end'>
            <button
              type='submit'
              disabled={loading}
              className={`px-6 py-2 rounded-lg text-white font-medium transition
                ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}>
              {loading ? "Adding Tenant..." : "Add Tenant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTenants;
