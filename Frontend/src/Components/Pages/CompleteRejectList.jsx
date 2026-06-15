import React, { useState } from "react";
import SocietyRequests from "./SocietyRequests";

function CompleteRejectList() {
  const [status, setStatus] = useState("approved");

  return (
    <div className='space-y-4'>
      <div className='inline-flex rounded border border-slate-200 bg-white p-1'>
        <button
          onClick={() => setStatus("approved")}
          className={`rounded px-4 py-2 text-sm ${
            status === "approved"
              ? "bg-emerald-600 text-white"
              : "text-slate-700"
          }`}>
          Complete List
        </button>
        <button
          onClick={() => setStatus("rejected")}
          className={`rounded px-4 py-2 text-sm ${
            status === "rejected" ? "bg-rose-600 text-white" : "text-slate-700"
          }`}>
          Reject List
        </button>
      </div>

      <SocietyRequests
        fixedStatus={status}
        title={status === "approved" ? "Complete List" : "Reject List"}
      />
    </div>
  );
}

export default CompleteRejectList;
