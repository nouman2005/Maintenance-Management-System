import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTenantById } from "../../../api/tenants.api";

function TenantsDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenant();
  }, [id]);

  const fetchTenant = async () => {
    try {
      const res = await getTenantById(id);
      setTenant(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <p className='p-6 text-gray-500'>Loading tenant details...</p>;

  if (!tenant) return <p className='p-6 text-red-500'>Tenant not found</p>;

  return (
    <div className='p-6 space-y-6 bg-gray-50 min-h-screen'>
      {/* 🔝 HEADER */}
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-gray-500'>Tenants / Details</p>
          <h1 className='text-2xl font-semibold'>{tenant.tenant_name}</h1>
          <p className='text-sm text-gray-500'>{tenant.tenant_code}</p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className='px-4 py-2 border rounded-lg bg-white hover:bg-gray-100'>
          ← Back
        </button>
      </div>

      {/* 🧑 PROFILE CARD */}
      <div className='bg-white shadow rounded-xl p-6'>
        <h2 className='text-lg font-semibold mb-4'>Personal Information</h2>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <Detail label='Full Name' value={tenant.tenant_name} />
          <Detail label='Email Address' value={tenant.tenant_email} />
        </div>
      </div>

      {/* 📞 CONTACT DETAILS */}
      <div className='bg-white shadow rounded-xl p-6'>
        <h2 className='text-lg font-semibold mb-4'>Contact Details</h2>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <Detail label='Mobile Number' value={tenant.tenant_phone} />
          <Detail label='WhatsApp Number' value={tenant.tenant_whatsapp} />
          <Detail label='Status' value={tenant.status} badge />
        </div>
      </div>

      {/* 🏠 FLAT DETAILS */}
      <div className='bg-white shadow rounded-xl p-6'>
        <h2 className='text-lg font-semibold mb-4'>Flat & Tenancy</h2>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <Detail
            label='Flat Number'
            value={`${tenant.wing}-${tenant.flat_no}`}
          />
          <Detail
            label='Move In Date'
            value={formatDate(tenant.move_in_date)}
          />
          <Detail
            label='Move Out Date'
            value={formatDate(tenant.move_out_date)}
          />
        </div>
      </div>

      <div className='bg-white shadow rounded-xl p-6'>
        <h2 className='text-lg font-semibold mb-4'>Charges</h2>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <Detail
            label='Maintenance'
            value={formatMoney(tenant.maintenance_amount)}
          />
          <Detail label='NOC Charge' value={formatMoney(tenant.noc_charge)} />
          <Detail
            label='Total Monthly Charge'
            value={formatMoney(tenant.total_monthly_charge)}
          />
        </div>
      </div>
    </div>
  );
}

/* 🔹 REUSABLE FIELD COMPONENT */
const Detail = ({ label, value, badge }) => (
  <div>
    <p className='text-sm text-gray-500 mb-1'>{label}</p>
    {badge ? (
      <span className='inline-block px-3 py-1 text-sm rounded-full bg-green-100 text-green-700'>
        {value}
      </span>
    ) : (
      <p className='font-medium text-gray-900'>{value || "-"}</p>
    )}
  </div>
);

/* 🇮🇳 INDIAN DATE FORMAT */
const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default TenantsDetails;
