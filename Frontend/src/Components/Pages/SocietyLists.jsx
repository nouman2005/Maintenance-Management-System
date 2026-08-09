import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Eye, Loader2, Power, RefreshCw, X } from "lucide-react";
import { deactivateSociety, getSocieties } from "../../api/society.api";

function SocietyLists({ onViewSociety }) {
  const [societies, setSocieties] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedSociety, setSelectedSociety] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [modalMessage, setModalMessage] = useState({ type: "", text: "" });

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

  const openDeactivateModal = (society) => {
    setSelectedSociety(society);
    setModalMessage({ type: "", text: "" });
  };

  const closeDeactivateModal = () => {
    if (deactivating) return;
    setSelectedSociety(null);
    setModalMessage({ type: "", text: "" });
  };

  const handleDeactivate = async () => {
    if (!selectedSociety || deactivating) return;

    setDeactivating(true);
    setModalMessage({ type: "", text: "" });
    try {
      const res = await deactivateSociety(selectedSociety.id);
      const message = res.data.message || "Society deactivated successfully";
      setModalMessage({ type: "success", text: message });
      toast.success(message);
      await fetchSocieties();
      window.setTimeout(() => {
        setSelectedSociety(null);
        setModalMessage({ type: "", text: "" });
      }, 900);
    } catch (error) {
      const message = error.response?.data?.message || "Unable to deactivate";
      setModalMessage({ type: "error", text: message });
      toast.error(message);
    } finally {
      setDeactivating(false);
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
                        onClick={() => openDeactivateModal(society)}
                        disabled={society.status === "inactive"}
                        className='h-9 w-9 inline-flex items-center justify-center rounded bg-rose-600 text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300'
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

      {selectedSociety && (
        <div
          className='fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm'
          role='dialog'
          aria-modal='true'
          aria-labelledby='deactivate-society-title'>
          <div className='w-full max-w-md rounded-lg border border-rose-100 bg-white shadow-2xl'>
            <div className='flex items-start gap-4 border-b border-slate-100 p-5'>
              <span className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/60'>
                <AlertTriangle size={22} />
              </span>
              <div className='min-w-0 flex-1'>
                <h3
                  id='deactivate-society-title'
                  className='text-lg font-semibold text-slate-950'>
                  Inactivate society?
                </h3>
                <p className='mt-1 text-sm leading-6 text-slate-600'>
                  This action will mark{" "}
                  <span className='font-semibold text-slate-950'>
                    {selectedSociety.society_name}
                  </span>{" "}
                  as inactive. Please confirm before proceeding.
                </p>
              </div>
              <button
                type='button'
                onClick={closeDeactivateModal}
                disabled={deactivating}
                className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50'
                aria-label='Close modal'>
                <X size={18} />
              </button>
            </div>

            <div className='space-y-4 p-5'>
              <div className='rounded-md border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800'>
                Society access and related administrative activity may be affected after inactivation.
              </div>

              {modalMessage.text && (
                <div
                  className={`rounded-md px-4 py-3 text-sm font-medium ${
                    modalMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}>
                  {modalMessage.text}
                </div>
              )}

              <div className='flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
                <button
                  type='button'
                  onClick={closeDeactivateModal}
                  disabled={deactivating}
                  className='inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'>
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleDeactivate}
                  disabled={deactivating}
                  className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-400'>
                  {deactivating ? (
                    <>
                      <Loader2 size={17} className='animate-spin' />
                      Inactivating...
                    </>
                  ) : (
                    <>
                      <Power size={17} />
                      Inactivate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SocietyLists;
