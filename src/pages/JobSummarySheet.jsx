import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const JOB_SELECT = `
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
  notes,
  status,
  assigned_to_name,
  price,
  labour_cost,
  parts_cost,
  parts_used,
  parts_json,
  paid,
  donated,
  collected,
  created_at,
  updated_at,
  ready_at,
  completed_at,
  collected_at,
  paid_at,
  status_changed_at,
  job_type
`;

function numberValue(value) {
  const num = Number(value || 0);
  return Number.isNaN(num) ? 0 : num;
}

function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `£${num.toFixed(2)}`;
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

function parseParts(partsJson, partsUsed) {
  if (Array.isArray(partsJson)) return partsJson;

  if (typeof partsJson === "string" && partsJson.trim()) {
    try {
      const parsed = JSON.parse(partsJson);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore malformed stored JSON and fall through to parts_used
    }
  }

  if (partsUsed) {
    return String(partsUsed)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name, qty: 1, cost: "" }));
  }

  return [];
}

function PrintInfoRow({ label, value, wide = false }) {
  return (
    <div className={wide ? "print-card print-card--wide" : "print-card"}>
      <div className="print-label">{label}</div>
      <div className="print-value">{value || "—"}</div>
    </div>
  );
}

export default function JobSummarySheet() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadJob() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT)
        .eq("id", id)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error("Job summary load error:", error);
        setError(error.message || "Could not load job summary.");
        setJob(null);
        setLoading(false);
        return;
      }

      setJob(data || null);
      setLoading(false);
    }

    loadJob();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const parts = useMemo(
    () => parseParts(job?.parts_json, job?.parts_used),
    [job?.parts_json, job?.parts_used]
  );

  const financialSummary = useMemo(() => {
    const price = numberValue(job?.price);
    const labour = numberValue(job?.labour_cost);
    const partsCost = numberValue(job?.parts_cost);
    const profit = price - labour - partsCost;

    return { price, labour, partsCost, profit };
  }, [job?.price, job?.labour_cost, job?.parts_cost]);

  useEffect(() => {
    if (!loading && job && job.job_type !== "media_conversion") {
      const timer = window.setTimeout(() => {
        window.print();
      }, 350);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [loading, job]);

  if (loading) {
    return (
      <div className="print-shell">
        <div className="print-loading">Loading summary sheet...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="print-shell">
        <div className="print-error">{error || "Job not found."}</div>
      </div>
    );
  }

  if (job.job_type === "media_conversion") {
    return (
      <div className="print-shell">
        <div className="print-error">
          This summary sheet is for standard workshop jobs only.
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #eef2f7;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .print-shell {
          min-height: 100vh;
          padding: 24px;
          background: #eef2f7;
        }

        .sheet {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
        }

        .sheet-header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          padding: 28px 32px;
          background: linear-gradient(135deg, #1d4ed8, #4f46e5);
          color: #ffffff;
        }

        .sheet-title {
          font-size: 30px;
          font-weight: 700;
          margin: 6px 0 0;
        }

        .sheet-kicker {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          opacity: 0.85;
        }

        .sheet-job-number {
          text-align: right;
          min-width: 180px;
        }

        .sheet-job-number strong {
          display: block;
          font-size: 28px;
          margin-top: 8px;
        }

        .sheet-body {
          padding: 28px 32px 32px;
          display: grid;
          gap: 22px;
        }

        .section {
          border: 1px solid #dbe4f0;
          border-radius: 18px;
          padding: 18px;
          background: #f8fafc;
        }

        .section-title {
          margin: 0 0 14px;
          font-size: 18px;
          color: #0f172a;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .print-card {
          border: 1px solid #dbe4f0;
          border-radius: 14px;
          background: #ffffff;
          padding: 12px 14px;
          min-height: 76px;
        }

        .print-card--wide {
          grid-column: span 2;
        }

        .print-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 8px;
        }

        .print-value {
          font-size: 14px;
          line-height: 1.45;
          color: #0f172a;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .status-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid #dbe4f0;
          background: #ffffff;
          color: #0f172a;
        }

        .status-pill--green {
          background: #dcfce7;
          border-color: #86efac;
          color: #166534;
        }

        .status-pill--amber {
          background: #fef3c7;
          border-color: #fcd34d;
          color: #92400e;
        }

        .status-pill--blue {
          background: #dbeafe;
          border-color: #93c5fd;
          color: #1d4ed8;
        }

        .notes-box {
          min-height: 120px;
        }

        .parts-table {
          width: 100%;
          border-collapse: collapse;
          overflow: hidden;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #dbe4f0;
        }

        .parts-table th,
        .parts-table td {
          padding: 12px 14px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
        }

        .parts-table th {
          background: #eff6ff;
          color: #1e3a8a;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .parts-table tr:last-child td {
          border-bottom: none;
        }

        .timeline-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .print-loading,
        .print-error {
          max-width: 780px;
          margin: 80px auto;
          border-radius: 20px;
          border: 1px solid #dbe4f0;
          background: #ffffff;
          padding: 32px;
          text-align: center;
          font-size: 18px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.1);
        }

        .sheet-footer {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 0 32px 28px;
          color: #64748b;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .info-grid,
          .timeline-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sheet-header {
            flex-direction: column;
          }

          .sheet-job-number {
            text-align: left;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body {
            background: #ffffff;
          }

          .print-shell {
            padding: 0;
            background: #ffffff;
          }

          .sheet {
            max-width: none;
            border: none;
            border-radius: 0;
            box-shadow: none;
          }
        }
      `}</style>

      <div className="print-shell">
        <div className="sheet">
          <div className="sheet-header">
            <div>
              <div className="sheet-kicker">The Nerd Herd • Workshop Hub</div>
              <h1 className="sheet-title">Workshop Job Summary Sheet</h1>
            </div>

            <div className="sheet-job-number">
              <div>Job Number</div>
              <strong>{job.job_number || "—"}</strong>
            </div>
          </div>

          <div className="sheet-body">
            <section className="section">
              <h2 className="section-title">Customer & Device</h2>
              <div className="info-grid">
                <PrintInfoRow label="Customer" value={job.customer} />
                <PrintInfoRow label="Contact" value={job.contact} />
                <PrintInfoRow label="Email" value={job.email} />
                <PrintInfoRow label="Phone" value={job.phone} />
                <PrintInfoRow label="Device" value={job.device} />
                <PrintInfoRow label="Make" value={job.make} />
                <PrintInfoRow label="Model" value={job.model} />
                <PrintInfoRow label="Serial Number" value={job.serial_number} />
                <PrintInfoRow label="Asset Tag" value={job.asset_tag} />
                <PrintInfoRow label="Service Type" value={job.service_type} />
                <PrintInfoRow label="Current Status" value={job.status} />
                <PrintInfoRow label="Assigned Engineer" value={job.assigned_to_name} />
              </div>
            </section>

            <section className="section">
              <h2 className="section-title">Job Summary</h2>
              <div className="info-grid">
                <PrintInfoRow label="Fault Reported" value={job.fault} wide />
                <PrintInfoRow label="Issue / Diagnosis" value={job.issue} wide />
                <PrintInfoRow label="Job Notes" value={job.notes} wide />
                <PrintInfoRow label="Last Updated" value={formatDateTime(job.updated_at)} />
              </div>
            </section>

            <section className="section">
              <h2 className="section-title">Financial Snapshot</h2>
              <div className="info-grid">
                <PrintInfoRow label="Quoted / Total Price" value={money(job.price)} />
                <PrintInfoRow label="Labour Cost" value={money(job.labour_cost)} />
                <PrintInfoRow label="Parts Cost" value={money(job.parts_cost)} />
                <PrintInfoRow label="Profit" value={money(financialSummary.profit)} />
              </div>

              <div className="status-row" style={{ marginTop: 14 }}>
                <span className={`status-pill ${job.paid ? "status-pill--green" : "status-pill--amber"}`}>
                  {job.paid ? "Paid" : "Unpaid"}
                </span>
                <span className={`status-pill ${job.donated ? "status-pill--blue" : ""}`}>
                  {job.donated ? "Donated" : "Standard Job"}
                </span>
                <span className={`status-pill ${job.collected ? "status-pill--green" : "status-pill--amber"}`}>
                  {job.collected ? "Collected" : "Awaiting Collection"}
                </span>
              </div>
            </section>

            <section className="section">
              <h2 className="section-title">Parts Used</h2>
              {parts.length ? (
                <table className="parts-table">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Qty</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((part, index) => (
                      <tr key={`${part.name || "part"}-${index}`}>
                        <td>{part.name || "—"}</td>
                        <td>{part.qty || 1}</td>
                        <td>{money(part.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="print-card notes-box">
                  <div className="print-value">No parts recorded for this job.</div>
                </div>
              )}
            </section>

            <section className="section">
              <h2 className="section-title">Timeline</h2>
              <div className="timeline-grid">
                <PrintInfoRow label="Created" value={formatDateTime(job.created_at)} />
                <PrintInfoRow label="Status Changed" value={formatDateTime(job.status_changed_at)} />
                <PrintInfoRow label="Ready At" value={formatDateTime(job.ready_at)} />
                <PrintInfoRow label="Completed At" value={formatDateTime(job.completed_at)} />
                <PrintInfoRow label="Collected At" value={formatDateTime(job.collected_at)} />
                <PrintInfoRow label="Paid At" value={formatDateTime(job.paid_at)} />
              </div>
            </section>
          </div>

          <div className="sheet-footer">
            <div>Generated {formatDateTime(new Date().toISOString())}</div>
            <div>The Nerd Herd Workshop Hub</div>
          </div>
        </div>
      </div>
    </>
  );
}
