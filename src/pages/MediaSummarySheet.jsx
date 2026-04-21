import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  return Number.isNaN(num) ? "—" : `£${num.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function numberValue(value) {
  const num = Number(value || 0);
  return Number.isNaN(num) ? 0 : num;
}

function normaliseMediaItems(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const numericItem = Number(item?.item_number || index + 1);
    const safeNumber = Number.isNaN(numericItem) ? index + 1 : numericItem;

    return {
      item_number: safeNumber,
      item_code: item?.item_code || String(safeNumber).padStart(3, "0"),
      item_label: item?.item_label || String(safeNumber).padStart(3, "0"),
      source_type: item?.source_type || "Unknown",
      progress_status: item?.progress_status || "Booked In",
      cleaned: !!item?.cleaned,
      captured: !!item?.captured,
      qc_checked: !!item?.qc_checked,
      delivered: !!item?.delivered,
      item_notes: item?.item_notes || "",
    };
  });
}

export default function MediaSummarySheet() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadJob() {
    setLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        customer,
        contact,
        email,
        phone,
        project_name,
        output_media_type,
        created_at,
        updated_at,
        status,
        assigned_to_name,
        job_type,
        media_items_json,
        notes,
        fault,
        issue,
        price,
        labour_cost,
        parts_cost,
        paid,
        donated,
        collected
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error loading media summary sheet job:", error);
      setLoadError(error.message || "Unknown error");
      setJob(null);
      setLoading(false);
      return;
    }

    setJob(data);
    setLoading(false);

    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error("Print error:", err);
      }
    }, 500);
  }

  const mediaItems = useMemo(() => normaliseMediaItems(job?.media_items_json), [job]);

  const mediaTypeSummary = useMemo(() => {
    if (!mediaItems.length) return [];

    const grouped = mediaItems.reduce((acc, item) => {
      const key = item.source_type || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [mediaItems]);

  const workflowSummary = useMemo(() => {
    return {
      total: mediaItems.length,
      cleaned: mediaItems.filter((item) => item.cleaned).length,
      captured: mediaItems.filter((item) => item.captured).length,
      qcChecked: mediaItems.filter((item) => item.qc_checked).length,
      delivered: mediaItems.filter((item) => item.delivered).length,
    };
  }, [mediaItems]);

  const estimatedProfit = useMemo(() => {
    return (
      numberValue(job?.price) -
      numberValue(job?.labour_cost) -
      numberValue(job?.parts_cost)
    );
  }, [job]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 text-black">
        Loading media summary sheet...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-white p-6 text-red-700">
        Could not load media summary sheet: {loadError}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-white p-6 text-black">
        Job not found.
      </div>
    );
  }

  if (job.job_type !== "media_conversion") {
    return (
      <div className="min-h-screen bg-white p-6 text-black">
        This print layout is only available for media conversion jobs.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 text-black">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print mb-4">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded border border-slate-400 px-4 py-2"
        >
          Print
        </button>
      </div>

      <div className="border-2 border-black p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <img
              src="/logo-colour.png"
              alt="The Nerd Herd"
              className="h-20 w-20 object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold">The Nerd Herd</h1>
              <div className="mt-1 text-sm text-slate-700">
                Media Conversion Summary Sheet
              </div>
            </div>
          </div>

          <div className="border-2 border-black px-4 py-3 text-center text-base font-bold">
            {job.job_number || "Media Job"}
          </div>
        </div>
      </div>

      <div className="mt-4 border border-black">
        <div className="border-b border-black bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide">
          Customer & Project
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-4">
          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Customer</div>
            <div className="mt-1 text-sm font-semibold">{job.customer || "—"}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Contact</div>
            <div className="mt-1 text-sm font-semibold">{job.contact || "—"}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Email</div>
            <div className="mt-1 text-sm font-semibold break-words">{job.email || "—"}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Phone</div>
            <div className="mt-1 text-sm font-semibold">{job.phone || "—"}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Project Name</div>
            <div className="mt-1 text-sm font-semibold">{job.project_name || "—"}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Output Media</div>
            <div className="mt-1 text-sm font-semibold">{job.output_media_type || "—"}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Created</div>
            <div className="mt-1 text-sm font-semibold">{formatDate(job.created_at)}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Last Updated</div>
            <div className="mt-1 text-sm font-semibold">{formatDateTime(job.updated_at)}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 border border-black">
        <div className="border-b border-black bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide">
          Current Job Status
        </div>

        <div className="flex flex-wrap gap-2 p-3 text-sm">
          <div className="border border-black px-3 py-2 font-semibold">
            Status: {job.status || "—"}
          </div>
          <div className="border border-black px-3 py-2 font-semibold">
            Assigned: {job.assigned_to_name || "Unassigned"}
          </div>
          <div className="border border-black px-3 py-2 font-semibold">
            Paid: {job.paid ? "Yes" : "No"}
          </div>
          <div className="border border-black px-3 py-2 font-semibold">
            Donated: {job.donated ? "Yes" : "No"}
          </div>
          <div className="border border-black px-3 py-2 font-semibold">
            Collected: {job.collected ? "Yes" : "No"}
          </div>
        </div>
      </div>

      <div className="mt-4 border border-black">
        <div className="border-b border-black bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide">
          Media Overview
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-4">
          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Total Items</div>
            <div className="mt-1 text-sm font-semibold">{workflowSummary.total}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Cleaned</div>
            <div className="mt-1 text-sm font-semibold">{workflowSummary.cleaned}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Captured</div>
            <div className="mt-1 text-sm font-semibold">{workflowSummary.captured}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">QC Checked</div>
            <div className="mt-1 text-sm font-semibold">{workflowSummary.qcChecked}</div>
          </div>
        </div>

        <div className="px-3 pb-3">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-black bg-slate-100 px-3 py-2 text-left text-xs uppercase">
                  Media Type
                </th>
                <th className="border border-black bg-slate-100 px-3 py-2 text-left text-xs uppercase">
                  Quantity
                </th>
              </tr>
            </thead>
            <tbody>
              {mediaTypeSummary.length ? (
                mediaTypeSummary.map((entry) => (
                  <tr key={entry.type}>
                    <td className="border border-black px-3 py-2">{entry.type}</td>
                    <td className="border border-black px-3 py-2">{entry.count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="border border-black px-3 py-2">
                    No media items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 border border-black">
        <div className="border-b border-black bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide">
          Financial Summary
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-4">
          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Price</div>
            <div className="mt-1 text-sm font-semibold">{money(job.price)}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Labour Cost</div>
            <div className="mt-1 text-sm font-semibold">{money(job.labour_cost)}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Parts Cost</div>
            <div className="mt-1 text-sm font-semibold">{money(job.parts_cost)}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Estimated Profit</div>
            <div className="mt-1 text-sm font-semibold">{money(estimatedProfit)}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 border border-black">
        <div className="border-b border-black bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide">
          Summary Notes
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Media Summary</div>
            <div className="mt-2 whitespace-pre-wrap text-sm">{job.fault || "—"}</div>
          </div>

          <div className="border border-black p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-600">Project Notes / Issue</div>
            <div className="mt-2 whitespace-pre-wrap text-sm">{job.issue || "—"}</div>
          </div>
        </div>

        {job.notes ? (
          <div className="px-3 pb-3">
            <div className="border border-black p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-600">Work Log / Notes</div>
              <div className="mt-2 whitespace-pre-wrap text-sm">{job.notes}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}