import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { printViaBridge } from "../lib/printerBridge";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `£${num.toFixed(2)}`;
}

function compact(value) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function printable(value) {
  const text = String(value ?? "").trim();
  return text || "-";
}

export default function JobReceipt57mm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [bridgeStatus, setBridgeStatus] = useState("");

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
        device,
        make,
        model,
        serial_number,
        asset_tag,
        service_type,
        fault,
        issue,
        status,
        assigned_to_name,
        notes,
        price,
        labour_cost,
        parts_cost,
        paid,
        donated,
        collected,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Receipt load error:", error);
      setLoadError(error.message || "Could not load job");
      setJob(null);
      setLoading(false);
      return;
    }

    setJob(data);
    setLoading(false);
  }

  const summary = useMemo(() => {
    if (!job) return null;

    return {
      makeModel: [job.make, job.model].filter(Boolean).join(" "),
      paidLabel: job.donated ? "DONATED" : job.paid ? "PAID" : "UNPAID",
      collectedLabel: job.collected ? "COLLECTED" : "NOT COLLECTED",
    };
  }, [job]);

  function buildBridgeReceipt(currentJob, currentSummary) {
    if (!currentJob || !currentSummary) return "";

    const lines = [
      "THE NERD HERD",
      "WORKSHOP HUB",
      "JOB RECEIPT",
      "------------------------------",
      `JOB NO: ${printable(currentJob.job_number)}`,
      `CREATED: ${printable(formatDateTime(currentJob.created_at))}`,
      `UPDATED: ${printable(formatDateTime(currentJob.updated_at))}`,
      "------------------------------",
      `CUSTOMER: ${printable(currentJob.customer)}`,
      `CONTACT: ${printable(currentJob.contact || currentJob.phone || currentJob.email)}`,
      "------------------------------",
      `DEVICE: ${printable(currentJob.device)}`,
      `MAKE/MODEL: ${printable(currentSummary.makeModel)}`,
      `SERIAL: ${printable(currentJob.serial_number)}`,
      `ASSET TAG: ${printable(currentJob.asset_tag)}`,
      `SERVICE: ${printable(currentJob.service_type)}`,
      "------------------------------",
      `FAULT: ${printable(currentJob.fault)}`,
      `ISSUE: ${printable(currentJob.issue)}`,
      "------------------------------",
      `STATUS: ${printable(currentJob.status)}`,
      `ENGINEER: ${printable(currentJob.assigned_to_name)}`,
      `PAYMENT: ${printable(currentSummary.paidLabel)}`,
      `COLLECTION: ${printable(currentSummary.collectedLabel)}`,
      "------------------------------",
      `PRICE: ${printable(money(currentJob.price))}`,
      `LABOUR: ${printable(money(currentJob.labour_cost))}`,
      `PARTS: ${printable(money(currentJob.parts_cost))}`,
    ];

    if (currentJob.notes && String(currentJob.notes).trim()) {
      lines.push(
        "------------------------------",
        "NOTES:",
        String(currentJob.notes).trim()
      );
    }

    lines.push(
      "------------------------------",
      "Please keep this receipt",
      "for your records.",
      "Thank you.",
      "",
      ""
    );

    return lines.join("\n");
  }

  function handleBrowserPrint() {
    window.print();
  }

  function handleBridgePrint() {
    if (!job || !summary) return;

    try {
      const text = buildBridgeReceipt(job, summary);
      printViaBridge(text);
      setBridgeStatus("Opening TNH Printer Bridge...");
    } catch (err) {
      setBridgeStatus(
        `Could not open TNH Printer Bridge: ${err?.message || "Unknown error"}`
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        Loading receipt...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-rose-300">
        Could not load receipt: {loadError}
      </div>
    );
  }

  if (!job || !summary) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        Job not found.
      </div>
    );
  }

  return (
    <>
      <style>{`
        @page {
          size: 57mm auto;
          margin: 3mm;
        }

        @media print {
          html, body {
            width: 57mm;
            background: #fff !important;
            margin: 0;
            padding: 0;
          }

          .no-print {
            display: none !important;
          }

          .receipt-wrap {
            width: 51mm;
            max-width: 51mm;
            margin: 0 auto;
            color: #000 !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-slate-950 p-4 text-white">
        <div className="no-print mx-auto mb-4 flex w-full max-w-md flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(`/jobs/${id}`)}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
          >
            Back to Job
          </button>

          <button
            type="button"
            onClick={handleBridgePrint}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-white hover:opacity-90"
          >
            Print via POS
          </button>

          <button
            type="button"
            onClick={handleBrowserPrint}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
          >
            Print via Browser
          </button>
        </div>

        {bridgeStatus ? (
          <div className="no-print mx-auto mb-4 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {bridgeStatus}
          </div>
        ) : null}

        <div className="receipt-wrap mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-white p-4 text-black shadow-xl">
          <div className="text-center">
            <div className="text-[15px] font-bold">WORKSHOP HUB</div>
            <div className="mt-1 text-[11px]">JOB RECEIPT</div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1 text-[11px] leading-tight">
            <div className="flex justify-between gap-3">
              <span className="font-semibold">Job No:</span>
              <span className="text-right">{compact(job.job_number)}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-semibold">Created:</span>
              <span className="text-right">{formatDateTime(job.created_at)}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-semibold">Updated:</span>
              <span className="text-right">{formatDateTime(job.updated_at)}</span>
            </div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1 text-[11px] leading-tight">
            <div>
              <div className="font-semibold">Customer</div>
              <div>{compact(job.customer)}</div>
            </div>

            <div>
              <div className="font-semibold">Contact</div>
              <div>{compact(job.contact || job.phone || job.email)}</div>
            </div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1 text-[11px] leading-tight">
            <div>
              <div className="font-semibold">Device</div>
              <div>{compact(job.device)}</div>
            </div>

            <div>
              <div className="font-semibold">Make / Model</div>
              <div>{compact(summary.makeModel)}</div>
            </div>

            <div>
              <div className="font-semibold">Serial Number</div>
              <div>{compact(job.serial_number)}</div>
            </div>

            <div>
              <div className="font-semibold">Asset Tag</div>
              <div>{compact(job.asset_tag)}</div>
            </div>

            <div>
              <div className="font-semibold">Service Type</div>
              <div>{compact(job.service_type)}</div>
            </div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1 text-[11px] leading-tight">
            <div>
              <div className="font-semibold">Fault</div>
              <div>{compact(job.fault)}</div>
            </div>

            <div>
              <div className="font-semibold">Issue</div>
              <div>{compact(job.issue)}</div>
            </div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1 text-[11px] leading-tight">
            <div className="flex justify-between gap-3">
              <span className="font-semibold">Status:</span>
              <span className="text-right">{compact(job.status)}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-semibold">Engineer:</span>
              <span className="text-right">{compact(job.assigned_to_name)}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-semibold">Payment:</span>
              <span className="text-right">{summary.paidLabel}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-semibold">Collection:</span>
              <span className="text-right">{summary.collectedLabel}</span>
            </div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1 text-[11px] leading-tight">
            <div className="flex justify-between gap-3">
              <span className="font-semibold">Price:</span>
              <span>{money(job.price)}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-semibold">Labour:</span>
              <span>{money(job.labour_cost)}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-semibold">Parts:</span>
              <span>{money(job.parts_cost)}</span>
            </div>
          </div>

          {job.notes ? (
            <>
              <div className="my-3 border-t border-dashed border-black" />
              <div className="text-[11px] leading-tight">
                <div className="font-semibold">Notes</div>
                <div className="mt-1 whitespace-pre-wrap break-words">
                  {job.notes}
                </div>
              </div>
            </>
          ) : null}

          <div className="my-3 border-t border-dashed border-black" />

          <div className="text-center text-[10px] leading-tight">
            <div>Please keep this receipt for your records.</div>
            <div className="mt-1">Thank you.</div>
          </div>
        </div>
      </div>
    </>
  );
}