import React, { useEffect, useState } from "react";
import { getFlatById, updateFlat } from "../../../api/flats.api";
import { FaHome, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";

function FlatDetailsModal({ flatId, onClose }) {
  const [flat, setFlat] = useState(null);
  const [form, setForm] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (flatId) {
      getFlatById(flatId).then((res) => {
        setFlat(res.data);
        setForm(res.data);
      });
    }
  }, [flatId]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await updateFlat(flatId, form);
      toast.success("Flat updated successfully");
      setFlat(form);
      setEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (!flat) return null;

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50'>
      <div className='bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white'>
          <div className='flex items-center gap-2'>
            <FaHome />
            <h2 className='text-lg font-semibold'>
              {editMode ? "Edit Flat Details" : "Flat Details"}
            </h2>
          </div>
          <button onClick={onClose} className='text-xl hover:opacity-80'>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className='p-6 space-y-6'>
          {/* FLAT INFO */}
          <div>
            <h3 className='text-sm font-semibold text-gray-500 mb-3'>
              Flat Information
            </h3>

            <div className='grid grid-cols-2 gap-4'>
              {[
                ["Wing", "wing"],
                ["Flat No", "flat_no"],
                ["Floor", "floor_no"],
                ["Area (sqft)", "area"],
                ["Maintenance Amount", "maintenance_amount"],
                ["Occupancy", "occupancy"],
                ["Status", "status"],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className='text-xs text-gray-500'>{label}</label>
                  {editMode ? (
                    <input
                      name={key}
                      value={form[key] || ""}
                      onChange={handleChange}
                      className='w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500'
                    />
                  ) : (
                    <div className='mt-1 px-3 py-2 bg-gray-50 rounded-lg font-medium'>
                      {key === "maintenance_amount"
                        ? `₹ ${flat[key]}`
                        : flat[key]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* OWNER INFO */}
          <div>
            <h3 className='text-sm font-semibold text-gray-500 mb-3'>
              Owner Information
            </h3>

            <div className='grid grid-cols-2 gap-4'>
              {[
                ["Owner Name", "owner_name"],
                ["Phone", "phone"],
                ["Whatsapp", "whatsapp"],
                ["Email", "email"],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className='text-xs text-gray-500'>{label}</label>
                  {editMode ? (
                    <input
                      name={key}
                      value={form[key] || ""}
                      onChange={handleChange}
                      className='w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500'
                    />
                  ) : (
                    <div className='mt-1 px-3 py-2 bg-gray-50 rounded-lg font-medium'>
                      {flat[key] || "-"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='flex justify-end gap-3 px-6 py-4 border-t bg-gray-50'>
          {editMode ? (
            <>
              <button
                onClick={() => {
                  setEditMode(false);
                  setForm(flat);
                }}
                className='flex items-center gap-2 px-4 py-2 border rounded-lg'>
                <FaTimes /> Cancel
              </button>

              <button
                onClick={handleUpdate}
                disabled={loading}
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50'>
                <FaSave />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'>
                <FaEdit /> Edit
              </button>

              <button onClick={onClose} className='px-4 py-2 border rounded-lg'>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlatDetailsModal;
