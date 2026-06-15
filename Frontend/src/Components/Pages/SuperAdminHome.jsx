import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  CheckCircle2,
  Clock3,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  getSocieties,
  getSocietyRegistrationRequests,
} from "../../api/society.api";

const statCards = [
  {
    key: "societies",
    label: "Total Societies",
    hint: "Societies registered in the system",
    icon: Building2,
    style: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
  {
    key: "complete",
    label: "Complete Societies",
    hint: "Approved society requests",
    icon: CheckCircle2,
    style: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    key: "pending",
    label: "Pending Societies",
    hint: "Waiting for review",
    icon: Clock3,
    style: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    key: "rejected",
    label: "Rejected Societies",
    hint: "Requests not approved",
    icon: XCircle,
    style: "bg-rose-50 text-rose-700 border-rose-100",
  },
];

function SuperAdminHome({ onOpenRequests, onOpenSocieties }) {
  const [stats, setStats] = useState({
    societies: 0,
    complete: 0,
    pending: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [societiesRes, approvedRes, pendingRes, rejectedRes] =
        await Promise.all([
          getSocieties(1, 1),
          getSocietyRegistrationRequests("approved"),
          getSocietyRegistrationRequests("pending"),
          getSocietyRegistrationRequests("rejected"),
        ]);

      setStats({
        societies: societiesRes.data.pagination?.total || 0,
        complete: approvedRes.data.data?.length || 0,
        pending: pendingRes.data.data?.length || 0,
        rejected: rejectedRes.data.data?.length || 0,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className='space-y-6'>
      <div className='rounded-lg border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <p className='text-sm font-medium uppercase text-cyan-700'>
              Super Admin Dashboard
            </p>
            <h1 className='mt-2 text-3xl font-semibold text-slate-950'>
              Society Overview
            </h1>
            <p className='mt-2 max-w-2xl text-sm text-slate-500'>
              Track society registration activity, review pending requests, and
              manage active societies from one place.
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <button
              onClick={onOpenRequests}
              className='rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white'>
              Review Requests
            </button>
            <button
              onClick={onOpenSocieties}
              className='rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800'>
              View Societies
            </button>
            <button
              onClick={fetchStats}
              className='h-10 w-10 inline-flex items-center justify-center rounded border border-slate-300 text-slate-700'
              title='Refresh dashboard'>
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-sm font-medium text-slate-500'>
                    {card.label}
                  </p>
                  <p className='mt-3 text-4xl font-semibold text-slate-950'>
                    {loading ? "..." : stats[card.key]}
                  </p>
                </div>
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-lg border ${card.style}`}>
                  <Icon size={24} />
                </div>
              </div>
              <p className='mt-4 text-sm text-slate-500'>{card.hint}</p>
            </div>
          );
        })}
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <button
          onClick={onOpenRequests}
          className='rounded-lg border border-amber-100 bg-amber-50 p-5 text-left transition hover:border-amber-200 hover:bg-amber-100'>
          <div className='flex items-center gap-3 text-amber-800'>
            <Clock3 size={22} />
            <span className='font-semibold'>Pending review queue</span>
          </div>
          <p className='mt-2 text-sm text-amber-800/80'>
            Open pending society requests and approve or reject them quickly.
          </p>
        </button>

        <button
          onClick={onOpenSocieties}
          className='rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-left transition hover:border-cyan-200 hover:bg-cyan-100'>
          <div className='flex items-center gap-3 text-cyan-800'>
            <Building2 size={22} />
            <span className='font-semibold'>Society management</span>
          </div>
          <p className='mt-2 text-sm text-cyan-800/80'>
            View society details and deactivate societies when needed.
          </p>
        </button>
      </div>
    </div>
  );
}

export default SuperAdminHome;
