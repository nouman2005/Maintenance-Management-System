import React, { useEffect, useState } from "react";
import CommonTable from "../../../ReusableTable/CommonTable";
import { flatDeactivate, getFlatsPaginated } from "../../../api/flats.api";
import FlatDetailsModal from "./FlatDetailsModal";
import toast from "react-hot-toast";

function FlatsDetails() {
  const [flats, setFlats] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFlatId, setSelectedFlatId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchFlats = async () => {
    try {
      const res = await getFlatsPaginated(page, 10);
      setFlats(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFlats();
  }, [page]);

  const columns = [
    { label: "Wing", accessor: "wing" },
    { label: "Flat No", accessor: "flat_no" },
    { label: "Floor", accessor: "floor_no" },
    { label: "Owner", accessor: "owner_name" },
    { label: "Phone", accessor: "phone" },
    { label: "Maintenance", accessor: "maintenance_amount" },
  ];

  const handleView = (row) => {
    setSelectedFlatId(row.id);
    setShowModal(true);
  };

  const handleDelete = async (row) => {
    const confirm = window.confirm(
      `Are you sure you want to deactivate Flat ${row.wing}-${row.flat_no}?`
    );

    if (!confirm) return;

    try {
      await flatDeactivate(row.id);
      toast.success("Flat deactivated successfully");
      fetchFlats();
    } catch (err) {
      console.log(err);
      toast.error("Failed to deactivate flat");
    }
  };

  const mappedData = flats.map((flat) => ({
    ...flat,
    onView: handleView,
    onDelete: handleDelete,
  }));

  return (
    <>
      <CommonTable
        title='Flats Details'
        columns={columns}
        data={mappedData}
        actions={["view", "delete"]}
      />

      {/* Pagination */}
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

      {/* 🔥 MODAL HERE */}
      {showModal && (
        <FlatDetailsModal
          flatId={selectedFlatId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default FlatsDetails;
