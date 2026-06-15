import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Eye, Power, RefreshCw } from "lucide-react";
import { deactivateSociety, getSocieties } from "../../api/society.api";

function SocietyLists({ onViewSociety }) {
  const [societies, setSocieties] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchSocieties = async () => {
    setLoading(true);
    try {
      const res = await getSocieties(page, 10);
      setSocieties(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load societies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, [page]);

  const handleDeactivate = async (society) => {
    const confirmed = window.confirm(
      `Deactivate ${society.society_name}? This society will be marked inactive.`
    );

    if (!confirmed) return;

    try {
      const res = await deactivateSociety(society.id);
      toast.success(res.data.message || "Society deactivated successfully");
      fetchSocieties();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to deactivate");
    }
  };

  return (
    <div className='space-y-5'>
      <div className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-900'>
            All Society Lists
          </h2>
          <p className='text-sm text-slate-500'>
            Browse approved societies and open their details.
          </p>
        </div>

        <button
          onClick={fetchSocieties}
          className='h-10 w-10 inline-flex items-center justify-center rounded bg-slate-900 text-white'
          title='Refresh societies'>
          <RefreshCw size={18} />
        </button>
        </div>
      </div>

      <div className='overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm'>
        <table className='min-w-full text-sm'>
          <thead className='bg-slate-100 text-slate-700'>
            <tr>
              <th className='p-3 text-left'>Society</th>
              <th className='p-3 text-left'>Registration</th>
              <th className='p-3 text-left'>Flats</th>
              <th className='p-3 text-left'>Contact</th>
              <th className='p-3 text-left'>Status</th>
              <th className='p-3 text-right'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className='p-4 text-center text-slate-500' colSpan='6'>
                  Loading societies...
                </td>
              </tr>
            ) : societies.length === 0 ? (
              <tr>
                <td className='p-4 text-center text-slate-500' colSpan='6'>
                  No societies found
                </td>
              </tr>
            ) : (
              societies.map((society) => (
                <tr key={society.id} className='border-t border-slate-100'>
                  <td className='p-3'>
                    <div className='font-medium text-slate-900'>
                      {society.society_name}
                    </div>
                    <div className='text-slate-500'>
                      {[society.city, society.state, society.pincode]
                        .filter(Boolean)
                        .join(", ") || society.address}
                    </div>
                  </td>
                  <td className='p-3'>{society.registration_number}</td>
                  <td className='p-3'>{society.total_flats}</td>
                  <td className='p-3'>
                    <div>{society.society_email || "-"}</div>
                    <div className='text-slate-500'>
                      {society.society_phone || "-"}
                    </div>
                  </td>
                  <td className='p-3'>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        society.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                      {society.status}
                    </span>
                  </td>
                  <td className='p-3'>
                    <div className='flex justify-end gap-2'>
                      <button
                        onClick={() => onViewSociety(society.id)}
                        className='h-9 w-9 inline-flex items-center justify-center rounded bg-indigo-600 text-white'
                        title='View society'>
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDeactivate(society)}
                        disabled={society.status === "inactive"}
                        className='h-9 w-9 inline-flex items-center justify-center rounded bg-rose-600 text-white disabled:cursor-not-allowed disabled:bg-slate-300'
                        title='Deactivate society'>
                        <Power size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className='flex justify-end gap-3'>
        <button
          disabled={page === 1}
          onClick={() => setPage((current) => current - 1)}
          className='rounded border px-4 py-2 disabled:opacity-50'>
          Prev
        </button>
        <button
          disabled={page === totalPages}
          onClick={() => setPage((current) => current + 1)}
          className='rounded border px-4 py-2 disabled:opacity-50'>
          Next
        </button>
      </div>
    </div>
  );
}

export default SocietyLists;
