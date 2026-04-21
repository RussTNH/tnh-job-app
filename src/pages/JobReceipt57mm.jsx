import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  buildWorkshopReceiptText,
  formatDateTime,
  money,
  printTextViaPos,
} from "../lib/posPrinter";

function normaliseParts(parts) {
  if (!parts) return [];

  if (Array.isArray(parts)) return parts;

  if (typeof parts === "string") {
    try {
      const parsed = JSON.parse(parts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function field(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function JobReceipt57mm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printingPos, setPrintingPos] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadJob() {
      setLoading(true);
      setError("");

      const { data, error: loadError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (!isMounted) return;

      if (loadError) {
        setError(loadError.message || "Failed to load job.");
        setJob(null);
      } else {
        setJob(data);
      }

      setLoading(false);
    }

    if (id) {
      loadJob();
    } else {
      setError("Missing job ID.");
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const parts = useMemo(() => normaliseParts(job?.parts_json), [job?.parts_json]);

  const totalPrice = useMemo(() => {
    if (!job) return 0;

    if (job.price !== null && job.price !== undefined && job.price !== "") {
      const num = Number(job.price);
      return Number.isFinite(num) ? num : 0;
    }

    const labour = Number(job.labour_cost || 0);
    const partsTotal = Number(job.parts_cost || 0);

    return (Number.isFinite(labour) ? labour : 0) + (Number.isFinite(partsTotal) ? partsTotal : 0);
  }, [job]);

  const receiptText = useMemo(() => {
    if (!job) return "";
    return buildWorkshopReceiptText(job);
  }, [job]);

  async function handlePosPrint() {
    if (!receiptText) return;

    try {
      setPrintingPos(true);
      printTextViaPos(receiptText);
    } catch (err) {
      alert(err?.message || "POS print failed.");
    } finally {
      setTimeout(() => setPrintingPos(false), 1200);
    }
  }

  function handleBrowserPrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white px-4 py-6">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
            <p className="text-sm text-neutral-300">Loading receipt…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white px-4 py-6">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-red-900/40 bg-neutral-900 p-6 shadow-xl">
            <h1 className="text-lg font-semibold text-white">Receipt unavailable</h1>
            <p className="mt-2 text-sm text-red-300">{error || "Job not found."}</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-4 inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @media print {
            body {
              background: #ffffff !important;
            }

            .no-print {
              display: none !important;
            }

            .receipt-print-shell {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: auto !important;
            }

            .receipt-paper {
              width: 57mm !important;
              max-width: 57mm !important;
              min-width: 57mm !important;
              border: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              margin: 0 auto !important;
              padding: 3mm !important;
              background: #ffffff !important;
              color: #000000 !important;
            }

            .receipt-paper * {
              color: #000000 !important;
            }

            @page {
              size: 57mm auto;
              margin: 2mm;
            }
          }
        `}
      </style>

      <div className="receipt-print-shell min-h-screen bg-neutral-950 px-4 py-6 text-white">
        <div className="no-print mx-auto mb-4 flex max-w-md flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handlePosPrint}
            disabled={printingPos}
            className="inline-flex items-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {printingPos ? "Sending to POS…" : "Print via POS"}
          </button>

          <button
            type="button"
            onClick={handleBrowserPrint}
            className="inline-flex items-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Print via Browser
          </button>
        </div>

        <div className="mx-auto max-w-md">
          <div className="no-print mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-xl">
            <h1 className="text-lg font-semibold text-white">57mm Job Receipt</h1>
            <p className="mt-1 text-sm text-neutral-400">
              POS print uses the Android bridge. Browser print remains available for PDF and normal printers.
            </p>
          </div>

          <div className="receipt-paper mx-auto w-[57mm] max-w-[57mm] rounded-2xl border border-neutral-800 bg-white p-3 text-black shadow-2xl">
            <div className="text-center">
              <div className="text-[13px] font-bold tracking-[0.18em]">THE NERD HERD</div>
              <div className="text-[10px] font-semibold tracking-[0.18em]">WORKSHOP HUB</div>
              <div className="mt-1 text-[10px] font-medium">JOB RECEIPT</div>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div className="space-y-1 text-[10px] leading-tight">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">Job No</span>
                <span className="text-right">{field(job.job_number)}</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">Created</span>
                <span className="text-right">{field(formatDateTime(job.created_at))}</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">Updated</span>
                <span className="text-right">{field(formatDateTime(job.updated_at))}</span>
              </div>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide">Customer</div>
              <div className="space-y-1 text-[10px] leading-tight">
                <div><span className="font-semibold">Name:</span> {field(job.customer_name)}</div>
                <div><span className="font-semibold">Phone:</span> {field(job.customer_phone)}</div>
                <div><span className="font-semibold">Email:</span> {field(job.customer_email)}</div>
              </div>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide">Device</div>
              <div className="space-y-1 text-[10px] leading-tight">
                <div><span className="font-semibold">Type:</span> {field(job.device_type)}</div>
                <div><span className="font-semibold">Brand:</span> {field(job.brand)}</div>
                <div><span className="font-semibold">Model:</span> {field(job.model)}</div>
                <div><span className="font-semibold">Serial:</span> {field(job.serial_number)}</div>
                <div><span className="font-semibold">Status:</span> {field(job.status)}</div>
              </div>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide">Fault / Work</div>
              <div className="whitespace-pre-wrap text-[10px] leading-tight">
                {field(job.fault)}
              </div>
            </div>

            {job.notes ? (
              <>
                <div className="my-2 border-t border-dashed border-black" />
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide">Notes</div>
                  <div className="whitespace-pre-wrap text-[10px] leading-tight">
                    {job.notes}
                  </div>
                </div>
              </>
            ) : null}

            {parts.length > 0 ? (
              <>
                <div className="my-2 border-t border-dashed border-black" />
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide">Parts</div>
                  <div className="space-y-1 text-[10px] leading-tight">
                    {parts.map((part, index) => {
                      const name =
                        part?.name ||
                        part?.part_name ||
                        part?.description ||
                        `Part ${index + 1}`;

                      const qty =
                        part?.qty !== undefined && part?.qty !== null && part?.qty !== ""
                          ? `x${part.qty}`
                          : "";

                      const price =
                        part?.price !== undefined && part?.price !== null && part?.price !== ""
                          ? money(part.price)
                          : "—";

                      return (
                        <div key={`${name}-${index}`} className="flex items-start justify-between gap-2">
                          <span className="pr-2">
                            {name} {qty}
                          </span>
                          <span className="min-w-[48px] text-right">{price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}

            <div className="my-2 border-t border-dashed border-black" />

            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide">Totals</div>
              <div className="space-y-1 text-[10px] leading-tight">
                <div className="flex items-start justify-between gap-2">
                  <span>Labour</span>
                  <span className="text-right">{money(job.labour_cost)}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span>Parts</span>
                  <span className="text-right">{money(job.parts_cost)}</span>
                </div>
                <div className="flex items-start justify-between gap-2 border-t border-dashed border-black pt-1 font-bold">
                  <span>Total</span>
                  <span className="text-right">{money(totalPrice)}</span>
                </div>
              </div>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div className="pt-1 text-center text-[10px] leading-tight">
              <div>Thank you for supporting</div>
              <div className="font-semibold">The Nerd Herd</div>
            </div>
          </div>

          <div className="no-print mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-xl">
            <h2 className="text-sm font-semibold text-white">POS Preview Text</h2>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-neutral-800 bg-black/40 p-3 text-[11px] leading-5 text-neutral-300">
{receiptText}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}