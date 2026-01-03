import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommonTable from "../../../ReusableTable/CommonTable";
import { getTenants, deactivateTenant } from "../../../api/tenants.api";
import toast from "react-hot-toast";

function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  const fetchTenants = async () => {
    try {
      const res = await getTenants(page, 10);
      setTenants(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page]);

  /* 🔹 TABLE COLUMNS */
  const columns = [
    { label: "Tenant Name", accessor: "tenant_name" },
    { label: "Email", accessor: "tenant_email" },
    { label: "Flat", accessor: "flat" },
    { label: "Phone", accessor: "tenant_phone" },
    { label: "Status", accessor: "status" },
  ];

  /* 🔹 ACTION HANDLERS */
  const handleView = (row) => {
    navigate(`/tenants/${row.id}`);
  };

  const handleDelete = async (row) => {
    const confirm = window.confirm(`Deactivate tenant ${row.tenant_name}?`);
    if (!confirm) return;

    try {
      await deactivateTenant(row.id);
      toast.success("Tenant deactivated successfully");
      fetchTenants();
    } catch (err) {
      toast.error("Failed to deactivate tenant");
    }
  };

  /* 🔹 MAP DATA FOR TABLE */
  const mappedData = tenants.map((tenant) => ({
    ...tenant,
    flat: `${tenant.wing}-${tenant.flat_no}`,
    onView: handleView,
    onDelete: handleDelete,
  }));

  return (
    <>
      <CommonTable
        title='Tenant Details'
        columns={columns}
        data={mappedData}
        actions={["view", "delete"]}
      />

      {/* 🔹 PAGINATION */}
      <div className='flex justify-end gap-3 px-6 mt-4'>
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className='px-4 py-2 border rounded disabled:opacity-50'>
          Prev
        </button>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className='px-4 py-2 border rounded disabled:opacity-50'>
          Next
        </button>
      </div>
    </>
  );
}

export default TenantList;
