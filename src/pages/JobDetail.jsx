import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";

const statusOptions = [
  "Open",
  "In Progress",
  "Waiting Parts",
  "Ready for Collection",
  "Completed",
];

function emptyPart() {
  return { name: "", cost: "" };
}

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);

  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState(false);
  const [donated, setDonated] = useState(false);
  const [collected, setCollected] = useState(false);

  const [editForm, setEditForm] = useState({
    customer: "",
    contact: "",
    device: "",
    model: "",
    serial_number: "",
    asset_tag: "",
    issue: "",
    labour_cost: "",
  });

  const [parts, setParts] = useState([emptyPart()]);

  useEffect(() => {
    fetchJob();
  }, [id]);

  async function fetchJob() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching job:", error);
      return;
    }

    const isDonated = Boolean(data.donated) || data.service_type === "Donated Item";

    let parsedParts = [];
    try {
      parsedParts = data.parts_json ? JSON.parse(data.parts_json) : [];
    } catch {
      parsedParts = [];
    }

    if (!Array.isArray(parsedParts) || parsedParts.length === 0) {
      parsedParts = [emptyPart()];
    }

    setJob(data);
    setStatus(data.status || "Open");
    setPaid(Boolean(data.paid));
    setDonated(isDonated);
    setCollected(Boolean(data.collected));

    setEditForm({
      customer: data.customer || "",
      contact: data.contact || "",
      device: data.device || "",
      model: data.model || "",
      serial_number: data.serial_number || "",
      asset_tag: data.asset_tag || "",
      issue: data.issue || "",
      labour_cost:
        data.labour_cost === null || data.labour_cost === undefined || data.labour_cost === ""
          ? ""
          : String(data.labour_cost),
    });

    setParts(
      parsedParts.map((part) => ({
        name: part?.name || "",
        cost:
          part?.cost === null || part?.cost === undefined || part?.cost === ""
            ? ""
            : String(part.cost),
      }))
    );
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handlePartChange(index, field, value) {
    setParts((prev) =>
      prev.map((part, i) =>
        i === index ? { ...part, [field]: value } : part
      )
    );
  }

  function addPartRow() {
    setParts((prev) => [...prev, emptyPart()]);
  }

  function removePartRow(index) {
    setParts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [emptyPart()];
    });
  }

  const isDonated = donated || job?.service_type === "Donated Item";

  const cleanedParts = useMemo(() => {
    return parts.filter(
      (part) =>
        String(part.name || "").trim() !== "" ||
        String(part.cost || "").trim() !== ""
    );
  }, [parts]);

  const partsTotal = useMemo(() => {
    if (isDonated) return 0;
    return cleanedParts.reduce((sum, part) => sum + Number(part.cost || 0), 0);
  }, [cleanedParts, isDonated]);

  const labourTotal = useMemo(() => {
    if (isDonated) return 0;
    return Number(editForm.labour_cost || 0);
  }, [editForm.labour_cost, isDonated]);

  const calculatedTotal = useMemo(() => {
    if (isDonated) return 0;
    return partsTotal + labourTotal;
  }, [partsTotal, labourTotal, isDonated]);

  async function saveJobDetails() {
    const partsUsedText = cleanedParts.length
      ? cleanedParts
          .map((part) => `• ${part.name || "Unnamed part"} - £${Number(part.cost || 0).toFixed(2)}`)
          .join("\n")
      : null;

    const { error } = await supabase
      .from("jobs")
      .update({
        customer: editForm.customer || null,
        contact: editForm.contact || null,
        device: editForm.device || null,
        model: editForm.model || null,
        serial_number: editForm.serial_number || null,
        asset_tag: editForm.asset_tag || null,
        issue: editForm.issue || null,
        status,
        paid: isDonated ? false : paid,
        donated: isDonated,
        collected,
        parts_json: JSON.stringify(cleanedParts),
        parts_used: partsUsedText,
        parts_cost: isDonated ? 0 : partsTotal,
        labour_cost: isDonated ? 0 : labourTotal,
        price: isDonated ? 0 : calculatedTotal,
      })
      .eq("id", id);

    if (error) {
      alert(`Error updating job: ${error.message}`);
      return;
    }

    await fetchJob();
    alert("Job updated");
  }

  async function addNote() {
    if (!note.trim()) return;

    const updatedNotes = job.notes
      ? job.notes + "\n• " + note
      : "• " + note;

    const { error } = await supabase
      .from("jobs")
      .update({ notes: updatedNotes })
      .eq("id", id);

    if (error) {
      alert(`Error saving note: ${error.message}`);
      return;
    }

    setNote("");
    await fetchJob();
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") return "£0.00";
    return `£${Number(value).toFixed(2)}`;
  }

  function printJobSheet() {
    if (!job) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margin = 15;
    const contentWidth = 180;
    let y = 20;

    const colors = {
      navy: [15, 23, 42],
      blue: [37, 99, 235],
      violet: [124, 58, 237],
      text: [24, 24, 27],
      muted: [100, 116, 139],
      border: [203, 213, 225],
      panel: [248, 250, 252],
      white: [255, 255, 255],
    };

    function sectionTitle(title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...colors.text);
      doc.text(title, margin, y);
      y += 5;
    }

    function detailRow(label, value) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...colors.text);
      doc.text(`${label}:`, margin, y);

      doc.setFont("helvetica", "normal");
      const safeValue = value ? String(value) : "-";
      doc.text(safeValue, margin + 34, y);

      y += 7;
    }

    function boxedText(title, text, minHeight = 24) {
      sectionTitle(title);

      const content = text || "—";
      const lines = doc.splitTextToSize(content, contentWidth - 8);
      const boxHeight = Math.max(minHeight, lines.length * 5 + 10);

      doc.setDrawColor(...colors.border);
      doc.setFillColor(...colors.panel);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...colors.text);
      doc.text(lines, margin + 4, y + 7);

      y += boxHeight + 10;
    }

    const printedDonated = Boolean(job.donated) || job.service_type === "Donated Item";

    doc.setFillColor(...colors.white);
    doc.rect(0, 0, 210, 297, "F");

    doc.setFillColor(...colors.navy);
    doc.rect(0, 0, 210, 26, "F");

    doc.setFillColor(...colors.blue);
    doc.rect(0, 26, 105, 2.5, "F");
    doc.setFillColor(...colors.violet);
    doc.rect(105, 26, 105, 2.5, "F");

    doc.setTextColor(...colors.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("THE NERD HERD", margin, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Workshop Job Sheet", margin, 19);

    y = 40;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...colors.text);
    doc.text(job.job_number || "Job Record", margin, y);

    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...colors.muted);
    doc.text(`Status: ${job.status || "Open"}`, margin, y);

    y += 12;

    detailRow("Customer", job.customer || "—");
    detailRow("Contact", job.contact || "—");
    detailRow("Device", job.device || "—");
    detailRow("Model", job.model || "—");
    detailRow("Serial No.", job.serial_number || "—");
    detailRow("Asset Tag", job.asset_tag || "—");
    detailRow("Type", job.Type || job.service_type || "—");
    detailRow("Price", formatPrice(printedDonated ? 0 : job.price));
    detailRow(
      printedDonated ? "Donation" : "Payment",
      printedDonated ? "Donated" : job.paid ? "Paid" : "Unpaid"
    );
    detailRow("Collected", job.collected ? "Yes" : "No");
    detailRow("Parts Cost", formatPrice(printedDonated ? 0 : job.parts_cost));
    detailRow("Labour Cost", formatPrice(printedDonated ? 0 : job.labour_cost));
    detailRow(
      "Created",
      job.created_at ? new Date(job.created_at).toLocaleString() : "-"
    );

    y += 4;

    boxedText("Parts Used", job.parts_used || "No parts recorded.", 20);
    boxedText("Issue Description", job.issue || "No issue description added.", 24);
    boxedText("Work Log / Notes", job.notes || "No notes yet.", 34);

    const signatureTop = Math.min(y + 4, 250);

    doc.setDrawColor(...colors.border);
    doc.line(margin, signatureTop, 195, signatureTop);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);

    doc.text("Technician Sign:", margin, signatureTop + 12);
    doc.line(margin + 38, signatureTop + 12, 100, signatureTop + 12);

    doc.text("Customer Sign:", 112, signatureTop + 12);
    doc.line(148, signatureTop + 12, 195, signatureTop + 12);

    doc.setFillColor(...colors.navy);
    doc.rect(0, 284, 210, 13, "F");

    doc.setTextColor(...colors.white);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Generated from TNH Workshop Hub", margin, 292);

    doc.save(`${job.job_number || "job-sheet"}.pdf`);
  }

  if (!job) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Loading job...
      </div>
    );
  }

  const statusBadgeStyles = {
    Open: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    "In Progress": "bg-amber-500/15 text-amber-300 border-amber-500/30",
    "Waiting Parts": "bg-orange-500/15 text-orange-300 border-orange-500/30",
    "Ready for Collection": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    Completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };

  const paymentBadge = isDonated
    ? "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30"
    : job.paid
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-rose-500/15 text-rose-300 border-rose-500/30";

  const collectedBadge =
    collected || job.collected
      ? "bg-cyan-500/15 text-cyan-200 border-cyan-500/30"
      : "bg-slate-700/40 text-slate-200 border-slate-600";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
              Job Record
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">
              {job.job_number}
            </h1>
            <p className="mt-2 text-slate-400">
              Full workshop job details and live status.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm ${
                  statusBadgeStyles[job.status] ||
                  "bg-slate-700/40 text-slate-200 border-slate-600"
                }`}
              >
                {job.status || "Open"}
              </span>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm ${paymentBadge}`}
              >
                {isDonated ? "Donated" : job.paid ? "Paid" : "Unpaid"}
              </span>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm ${collectedBadge}`}
              >
                {collected || job.collected ? "Collected" : "Not Collected"}
              </span>
            </div>

            <button
              onClick={printJobSheet}
              className="mt-5 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90"
            >
              Print Job Sheet
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <QRCodeSVG value={`${window.location.origin}/jobs/${job.id}`} size={170} />
            <div className="mt-3 text-center text-xs text-slate-400">
              Scan to open this job
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-semibold text-white">Editable Job Details</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Customer">
                <input
                  name="customer"
                  value={editForm.customer}
                  onChange={handleEditChange}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Contact">
                <input
                  name="contact"
                  value={editForm.contact}
                  onChange={handleEditChange}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Device">
                <input
                  name="device"
                  value={editForm.device}
                  onChange={handleEditChange}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Model">
                <input
                  name="model"
                  value={editForm.model}
                  onChange={handleEditChange}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Serial Number">
                <input
                  name="serial_number"
                  value={editForm.serial_number}
                  onChange={handleEditChange}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Asset Tag / Reference">
                <input
                  name="asset_tag"
                  value={editForm.asset_tag}
                  onChange={handleEditChange}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field label="Issue Description">
                <textarea
                  name="issue"
                  value={editForm.issue}
                  onChange={handleEditChange}
                  rows="5"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-semibold text-white">Parts & Costs</h2>

            <div className="space-y-4">
              {parts.map((part, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-[1fr_160px_120px]"
                >
                  <input
                    type="text"
                    value={part.name}
                    onChange={(e) => handlePartChange(index, "name", e.target.value)}
                    placeholder="Part name or number"
                    disabled={isDonated}
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
                  />

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={part.cost}
                    onChange={(e) => handlePartChange(index, "cost", e.target.value)}
                    placeholder="Cost"
                    disabled={isDonated}
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => removePartRow(index)}
                    disabled={isDonated}
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addPartRow}
                disabled={isDonated}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-60"
              >
                + Add Part
              </button>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <Field label="Parts Total (£)">
                <input
                  type="text"
                  value={formatPrice(partsTotal)}
                  readOnly
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Labour Cost (£)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="labour_cost"
                  value={isDonated ? "" : editForm.labour_cost}
                  onChange={handleEditChange}
                  placeholder={isDonated ? "Donated" : "Enter labour cost"}
                  disabled={isDonated}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-60"
                />
              </Field>

              <Field label="Total Price (£)">
                <input
                  type="text"
                  value={formatPrice(calculatedTotal)}
                  readOnly
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>
            </div>

            {isDonated ? (
              <div className="mt-4 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-3 text-fuchsia-200">
                Donated items automatically stay at £0.00
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-semibold text-white">Update Job</h2>

            <label className="mb-2 block text-sm text-slate-400">Job Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>

            {isDonated ? (
              <div className="mt-4 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-3 text-fuchsia-200">
                Donated item
              </div>
            ) : (
              <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
                <input
                  type="checkbox"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  className="h-5 w-5"
                />
                <span>{paid ? "Paid" : "Unpaid"}</span>
              </label>
            )}

            <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
              <input
                type="checkbox"
                checked={collected}
                onChange={(e) => setCollected(e.target.checked)}
                className="h-5 w-5"
              />
              <span>{collected ? "Collected" : "Not Collected"}</span>
            </label>

            <button
              onClick={saveJobDetails}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 font-medium text-white shadow-lg hover:opacity-90"
            >
              Save Job Update
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-semibold text-white">Quick View</h2>

            <div className="grid gap-4">
              <Detail label="Customer" value={job.customer} />
              <Detail label="Device" value={job.device} />
              <Detail label="Model" value={job.model} />
              <Detail label="Serial Number" value={job.serial_number} />
              <Detail label="Type" value={job.Type || job.service_type} />
              <Detail label="Parts Cost" value={formatPrice(isDonated ? 0 : job.parts_cost)} />
              <Detail label="Labour Cost" value={formatPrice(isDonated ? 0 : job.labour_cost)} />
              <Detail label="Total Price" value={formatPrice(isDonated ? 0 : job.price)} />
              <Detail label="Collected" value={job.collected ? "Yes" : "No"} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-semibold text-white">Work Log</h2>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (e.g. diagnostics started, parts ordered...)"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              rows="4"
            />

            <button
              onClick={addNote}
              className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-2 text-white hover:opacity-90"
            >
              Add Note
            </button>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {job.notes || "No notes yet"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-slate-400">{label}</div>
      {children}
    </label>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-1 text-base font-medium text-white">
        {value || "—"}
      </div>
    </div>
  );
}