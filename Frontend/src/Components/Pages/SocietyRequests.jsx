import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, RefreshCw, X } from "lucide-react";
import {
  approveSocietyRegistrationRequest,
  getSocietyRegistrationRequests,
  rejectSocietyRegistrationRequest,
} from "../../api/society.api";

function SocietyRequests({ fixedStatus, title = "Society Requests" }) {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState(fixedStatus || "pending");
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getSocietyRegistrationRequests(status);
      setRequests(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [status]);

  useEffect(() => {
    if (fixedStatus) {
      setStatus(fixedStatus);
    }
  }, [fixedStatus]);

  const approveRequest = async (id) => {
    try {
      const res = await approveSocietyRegistrationRequest(id);
      if (res.data.emailSent === false) {
        toast.error(res.data.message, { duration: 6000 });
      } else {
        toast.success(res.data.message);
      }
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Approval failed");
    }
  };

  const rejectRequest = async (id) => {
    try {
      const reason = window.prompt("Reason for rejection") || "";
      const res = await rejectSocietyRegistrationRequest(id, reason);
      toast.success(res.data.message);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Reject failed");
    }
  };

  const tableColumnCount = status === "rejected" ? 8 : 7;

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-900'>
            {title}
          </h2>
          <p className='text-sm text-slate-500'>
            Review new society registration requests.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          {!fixedStatus && (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className='h-10 rounded border border-slate-300 px-3'>
              <option value='pending'>Pending</option>
              <option value='approved'>Approved</option>
              <option value='rejected'>Rejected</option>
            </select>
          )}
          <button
            onClick={fetchRequests}
            className='h-10 w-10 inline-flex items-center justify-center rounded bg-slate-900 text-white'
            title='Refresh requests'>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className='overflow-x-auto border border-slate-200 rounded-lg bg-white'>
        <table className='min-w-full text-sm'>
          <thead className='bg-slate-100 text-slate-700'>
            <tr>
              <th className='text-left p-3'>Society</th>
              <th className='text-left p-3'>Registration</th>
              <th className='text-left p-3'>Flats</th>
              <th className='text-left p-3'>Admin</th>
              <th className='text-left p-3'>Contact</th>
              <th className='text-left p-3'>Status</th>
              {status === "rejected" && (
                <th className='text-left p-3'>Reason</th>
              )}
              <th className='text-right p-3'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  className='p-4 text-center text-slate-500'
                  colSpan={tableColumnCount}>
                  Loading requests...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td
                  className='p-4 text-center text-slate-500'
                  colSpan={tableColumnCount}>
                  No requests found
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className='border-t border-slate-100'>
                  <td className='p-3'>
                    <div className='font-medium text-slate-900'>
                      {request.society_name}
                    </div>
                    <div className='text-slate-500'>
                      {[request.city, request.state, request.pincode]
                        .filter(Boolean)
                        .join(", ") || request.address}
                    </div>
                  </td>
                  <td className='p-3'>{request.registration_number}</td>
                  <td className='p-3'>{request.total_flats}</td>
                  <td className='p-3'>{request.admin_name}</td>
                  <td className='p-3'>
                    <div>{request.admin_email}</div>
                    <div className='text-slate-500'>{request.admin_phone}</div>
                  </td>
                  <td className='p-3 capitalize'>{request.status}</td>
                  {status === "rejected" && (
                    <td className='p-3'>{request.rejection_reason || "-"}</td>
                  )}
                  <td className='p-3'>
                    {request.status === "pending" && (
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => approveRequest(request.id)}
                          className='h-9 w-9 inline-flex items-center justify-center rounded bg-emerald-600 text-white'
                          title='Approve request'>
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => rejectRequest(request.id)}
                          className='h-9 w-9 inline-flex items-center justify-center rounded bg-rose-600 text-white'
                          title='Reject request'>
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SocietyRequests;
