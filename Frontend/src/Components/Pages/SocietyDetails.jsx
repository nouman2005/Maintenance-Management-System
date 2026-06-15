import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getSocietyById } from "../../api/society.api";

function SocietyDetails({ societyId, onBack }) {
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSociety = async () => {
    if (!societyId) return;

    setLoading(true);
    try {
      const res = await getSocietyById(societyId);
      setSociety(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load society");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSociety();
  }, [societyId]);

  const details = [
    ["Society Name", society?.society_name],
    ["Registration Number", society?.registration_number],
    ["Total Flats", society?.total_flats],
    ["Phone", society?.society_phone],
    ["Email", society?.society_email],
    ["Address", society?.address],
    ["City", society?.city],
    ["State", society?.state],
    ["Pincode", society?.pincode],
    ["Status", society?.status],
    [
      "Created At",
      society?.created_at ? new Date(society.created_at).toLocaleString() : "",
    ],
  ];

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-900'>
            Society Details
          </h2>
          <p className='text-sm text-slate-500'>
            View registration, contact, and location information.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={onBack}
            className='h-10 inline-flex items-center gap-2 rounded bg-slate-200 px-3 text-slate-800'>
            <ArrowLeft size={18} />
            Back
          </button>
          <button
            onClick={fetchSociety}
            className='h-10 w-10 inline-flex items-center justify-center rounded bg-slate-900 text-white'
            title='Refresh society'>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className='rounded-lg border border-slate-200 bg-white p-5'>
        {loading ? (
          <div className='py-10 text-center text-slate-500'>
            Loading society...
          </div>
        ) : !society ? (
          <div className='py-10 text-center text-slate-500'>
            Select a society to view details.
          </div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {details.map(([label, value]) => (
              <div key={label} className='rounded border border-slate-100 p-4'>
                <div className='text-xs uppercase text-slate-500'>{label}</div>
                <div className='mt-1 font-medium text-slate-900'>
                  {value || "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SocietyDetails;
