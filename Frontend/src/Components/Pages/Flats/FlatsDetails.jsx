import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Eye, Home, RefreshCw, Trash2 } from "lucide-react";
import { flatDeactivate, getFlatsPaginated } from "../../../api/flats.api";
import FlatDetailsModal from "./FlatDetailsModal";

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function FlatsDetails() {
  const [flats, setFlats] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [occupancy, setOccupancy] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFlatId, setSelectedFlatId] = useState(null);

  const fetchFlats = async () => {
    setLoading(true);
    try {
      const res = await getFlatsPaginated(page, 10, {
        occupancy: occupancy || undefined,
      });
      setFlats(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load flats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlats();
  }, [page, occupancy]);

  const totals = useMemo(
    () => ({
      flats: flats.length,
      tenant: flats.filter((flat) => flat.occupancy === "tenant").length,
      owner: flats.filter((flat) => flat.occupancy === "owner").length,
    }),
    [flats]
  );

  const handleDelete = async (flat) => {
    const confirmed = window.confirm(
      `Deactivate Flat ${flat.wing}-${flat.flat_no}?`
    );

    if (!confirmed) return;

    try {
      await flatDeactivate(flat.id);
      toast.success("Flat deactivated successfully");
      fetchFlats();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate flat");
    }
  };

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-950'>Flats List</h2>
          <p className='text-sm text-slate-500'>
            Review active flats, owners, occupancy, and maintenance amounts.
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <select
            value={occupancy}
            onChange={(e) => {
              setPage(1);
              setOccupancy(e.target.value);
            }}
            className='h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'>
            <option value=''>All occupancy</option>
            <option value='owner'>Owner</option>
            <option value='tenant'>Tenant</option>
          </select>
          <button
            onClick={fetchFlats}
            className='inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800'
            title='Refresh flats'>
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        {[
          ["Active Flats", totals.flats],
          ["Owner Occupied", totals.owner],
          ["Tenant Occupied", totals.tenant],
        ].map(([label, value]) => (
          <div
            key={label}
            className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
            <div className='text-sm text-slate-500'>{label}</div>
            <div className='mt-1 text-2xl font-semibold text-slate-950'>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='bg-slate-100 text-left text-slate-600'>
              <tr>
                <th className='px-4 py-3'>Flat</th>
                <th className='px-4 py-3'>Owner</th>
                <th className='px-4 py-3'>Phone</th>
                <th className='px-4 py-3'>Maintenance</th>
                <th className='px-4 py-3'>Occupancy</th>
                <th className='px-4 py-3 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan='6' className='px-4 py-8 text-center text-slate-500'>
                    Loading flats...
                  </td>
                </tr>
              ) : flats.length === 0 ? (
                <tr>
                  <td colSpan='6' className='px-4 py-8 text-center text-slate-500'>
                    No flats found
                  </td>
                </tr>
              ) : (
                flats.map((flat) => (
                  <tr key={flat.id} className='border-t border-slate-100'>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-3'>
                        <span className='inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700'>
                          <Home size={17} />
                        </span>
                        <div>
                          <div className='font-medium text-slate-950'>
                            {flat.wing}-{flat.flat_no}
                          </div>
                          <div className='text-xs text-slate-500'>
                            {flat.flat_code || `Floor ${flat.floor_no}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-3'>{flat.owner_name}</td>
                    <td className='px-4 py-3'>{flat.owner_phone}</td>
                    <td className='px-4 py-3 font-medium'>
                      {money(flat.maintenance_amount)}
                    </td>
                    <td className='px-4 py-3'>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          flat.occupancy === "tenant"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                        {flat.occupancy}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => setSelectedFlatId(flat.id)}
                          className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50'
                          title='View flat'>
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(flat)}
                          className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 text-rose-700 transition hover:bg-rose-50'
                          title='Deactivate flat'>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className='flex items-center justify-end gap-3'>
        <button
          disabled={page === 1}
          onClick={() => setPage((value) => value - 1)}
          className='h-10 rounded-md border border-slate-300 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50'>
          Prev
        </button>
        <span className='text-sm text-slate-500'>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((value) => value + 1)}
          className='h-10 rounded-md border border-slate-300 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50'>
          Next
        </button>
      </div>

      {selectedFlatId && (
        <FlatDetailsModal
          flatId={selectedFlatId}
          onClose={() => {
            setSelectedFlatId(null);
            fetchFlats();
          }}
        />
      )}
    </div>
  );
}

export default FlatsDetails;
