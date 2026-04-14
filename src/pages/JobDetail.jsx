import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";

function safeParseParts(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `£${num.toFixed(2)}`;
}

function normaliseNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [status, setStatus] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [note, setNote] = useState("");

  const [customer, setCustomer] = useState("");
  const [contact, setContact] = useState("");
  const [device, setDevice] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [issue, setIssue] = useState("");

  const [price, setPrice] = useState("");
  const [labourCost, setLabourCost] = useState("");
  const [paid, setPaid] = useState(false);
  const [donated, setDonated] = useState(false);
  const [collected, setCollected] = useState(false);

  const [parts, setParts] = useState([]);

  useEffect(() => {
    loadUsers();
    fetchJob();
  }, [id]);

  useEffect(() => {
    if (serviceType === "Donated Item") {
      setDonated(true);
      setPaid(false);
      setPrice("");
      setLabourCost("");
      setParts([]);
    }
  }, [serviceType]);

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, is_active")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error loading users:", error);
      return;
    }

    setUsers(data || []);
  }

  async function fetchJob() {
    setLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching job:", error);
      setLoadError(error.message || "Unknown error");
      setJob(null);
      setLoading(false);
      return;
    }

    setJob(data);

    setStatus(data.status || "Open");
    setAssignedTo(data.assigned_to || "");

    setCustomer(data.customer || "");
    setContact(data.contact || "");
    setDevice(data.device || "");
    setModel(data.model || "");
    setSerialNumber(data.serial_number || "");
    setAssetTag(data.asset_tag || "");
    setServiceType(data.service_type || "Hardware Repair");
    setIssue(data.issue || "");

    setPrice(data.price ?? "");
    setLabourCost(data.labour_cost ?? "");
    setPaid(Boolean(data.paid));
    setDonated(Boolean(data.donated) || data.service_type === "Donated Item");
    setCollected(Boolean(data.collected));

    setParts(
      safeParseParts(data.parts_json).map((part) => ({
        name: part.name || "",
        qty: part.qty ?? 1,
        cost: part.cost ?? "",
      }))
    );

    setLoading(false);
  }

  const donatedMode = donated || serviceType === "Donated Item";

  const partsTotal = useMemo(() => {
    if (donatedMode) return 0;

    return parts.reduce((sum, part) => {
      const qty = Math.max(1, Number(part.qty) || 1);
      const cost = Number(part.cost) || 0;
      return sum + qty * cost;
    }, 0);
  }, [parts, donatedMode]);

  const suggestedTotal = useMemo(() => {
    if (donatedMode) return 0;
    const labour = Number(labourCost) || 0;
    return labour + partsTotal;
  }, [labourCost, partsTotal, donatedMode]);

  function handleDonatedToggle(checked) {
    setDonated(checked);

    if (checked) {
      setServiceType("Donated Item");
      setPaid(false);
      setPrice("");
      setLabourCost("");
      setParts([]);
    } else if (serviceType === "Donated Item") {
      setServiceType("Hardware Repair");
    }
  }

  async function downloadJobPdf() {
    if (!job) return;

    try {
      setDownloadingPdf(true);

      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      let y = 14;

      const safeJobNumber = (job.job_number || `job-${job.id || "record"}`)
        .replace(/[^a-z0-9-_]/gi, "_");

      function ensureSpace(heightNeeded = 12) {
        if (y + heightNeeded > pageHeight - 15) {
          doc.addPage();
          y = 14;
        }
      }

      function drawHeader() {
        doc.setFillColor(20, 27, 45);
        doc.roundedRect(margin, y, contentWidth, 24, 3, 3, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("The Nerd Herd", margin + 6, y + 9);

        doc.setFontSize(13);
        doc.text("Workshop Job Sheet", margin + 6, y + 17);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Job: ${job.job_number || "—"}`, pageWidth - margin - 50, y + 9);
        doc.text(
          `Generated: ${new Date().toLocaleString("en-GB")}`,
          pageWidth - margin - 50,
          y + 17
        );

        y += 30;
        doc.setTextColor(0, 0, 0);
      }

      function sectionTitle(title) {
        ensureSpace(14);
        doc.setFillColor(240, 244, 248);
        doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(title, margin + 4, y + 5.5);
        y += 11;
      }

      function drawFieldRow(leftLabel, leftValue, rightLabel, rightValue) {
        ensureSpace(14);

        const rowHeight = 10;
        const gutter = 4;
        const boxWidth = (contentWidth - gutter) / 2;

        doc.setDrawColor(210, 214, 220);
        doc.roundedRect(margin, y, boxWidth, rowHeight, 2, 2);
        doc.roundedRect(margin + boxWidth + gutter, y, boxWidth, rowHeight, 2, 2);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`${leftLabel}:`, margin + 3, y + 4);
        doc.text(`${rightLabel}:`, margin + boxWidth + gutter + 3, y + 4);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const leftText = String(leftValue || "—");
        const rightText = String(rightValue || "—");
        doc.text(doc.splitTextToSize(leftText, boxWidth - 6), margin + 3, y + 8);
        doc.text(
          doc.splitTextToSize(rightText, boxWidth - 6),
          margin + boxWidth + gutter + 3,
          y + 8
        );

        y += rowHeight + 4;
      }

      function drawFullWidthField(label, value, minHeight = 14) {
        ensureSpace(minHeight + 4);

        const text = String(value || "—");
        const textLines = doc.splitTextToSize(text, contentWidth - 6);
        const boxHeight = Math.max(minHeight, 6 + textLines.length * 4.5);

        doc.setDrawColor(210, 214, 220);
        doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`${label}:`, margin + 3, y + 4.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(textLines, margin + 3, y + 9);

        y += boxHeight + 4;
      }

      function drawPartsTable() {
        const rows =
          parts.length > 0
            ? parts.map((part) => ({
                name: part.name || "Unnamed part",
                qty: String(part.qty || 1),
                cost: donatedMode ? "Donated" : money(part.cost),
                total: donatedMode
                  ? "Donated"
                  : money((Number(part.qty || 1) || 1) * (Number(part.cost || 0) || 0)),
              }))
            : [{ name: "No parts added", qty: "—", cost: "—", total: "—" }];

        ensureSpace(18);

        const col1 = margin;
        const col2 = margin + 95;
        const col3 = margin + 122;
        const col4 = margin + 152;
        const col5 = pageWidth - margin;

        doc.setFillColor(240, 244, 248);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setDrawColor(210, 214, 220);
        doc.rect(margin, y, contentWidth, 8);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Part", col1 + 2, y + 5);
        doc.text("Qty", col2 + 2, y + 5);
        doc.text("Unit", col3 + 2, y + 5);
        doc.text("Total", col4 + 2, y + 5);

        y += 8;

        rows.forEach((row) => {
          ensureSpace(10);
          doc.rect(margin, y, contentWidth, 8);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);

          doc.text(doc.splitTextToSize(row.name, 90), col1 + 2, y + 5);
          doc.text(row.qty, col2 + 2, y + 5);
          doc.text(row.cost, col3 + 2, y + 5);
          doc.text(row.total, col4 + 2, y + 5);

          y += 8;
        });

        y += 4;
      }

      function drawTotalsBox() {
        ensureSpace(28);

        const boxWidth = 72;
        const x = pageWidth - margin - boxWidth;

        doc.setDrawColor(210, 214, 220);
        doc.roundedRect(x, y, boxWidth, 24, 2, 2);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Labour", x + 4, y + 6);
        doc.text("Parts", x + 4, y + 12);
        doc.text("Total", x + 4, y + 18);

        doc.setFont("helvetica", "normal");
        doc.text(donatedMode ? "Donated" : money(job.labour_cost), x + 32, y + 6);
        doc.text(donatedMode ? "Donated" : money(job.parts_cost), x + 32, y + 12);

        doc.setFont("helvetica", "bold");
        doc.text(donatedMode ? "Donated" : money(job.price), x + 32, y + 18);

        y += 28;
      }

      drawHeader();

      sectionTitle("Customer & Device");
      drawFieldRow("Customer", job.customer, "Contact", job.contact);
      drawFieldRow("Device", job.device, "Model", job.model);
      drawFieldRow("Serial Number", job.serial_number, "Asset Tag", job.asset_tag);
      drawFieldRow("Service Type", job.service_type, "Assigned To", job.assigned_to_name || "Unassigned");

      sectionTitle("Status");
      drawFieldRow("Status", job.status, "Collected", job.collected ? "Yes" : "No");
      drawFieldRow("Paid", job.donated ? "Donated" : job.paid ? "Yes" : "No", "Record ID", job.id);

      sectionTitle("Issue Description");
      drawFullWidthField("Reported Issue", job.issue || "—", 24);

      sectionTitle("Financial Summary");
      drawFieldRow("Quoted Price", donatedMode ? "Donated Item" : money(job.price), "Labour Cost", donatedMode ? "Donated Item" : money(job.labour_cost));
      drawFieldRow("Parts Cost", donatedMode ? "Donated Item" : money(job.parts_cost), "Suggested Total", donatedMode ? "Donated Item" : money(suggestedTotal));
      drawTotalsBox();

      sectionTitle("Parts Used");
      drawPartsTable();

      sectionTitle("Notes / Work Log");
      drawFullWidthField("Notes", job.notes || "No notes yet", 28);

      sectionTitle("Sign-off");
      drawFullWidthField(
        "Customer Signature",
        "_______________________________________________",
        14
      );
      drawFieldRow(
        "Date",
        "________________________",
        "Staff Signature",
        "________________________"
      );

      pdfFooter(doc, pageWidth, pageHeight, safeJobNumber);

      doc.save(`${safeJobNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Could not generate the PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function updateStatus() {
    const { error } = await supabase.from("jobs").update({ status }).eq("id", id);

    if (error) {
      alert(`Error updating status: ${error.message}`);
      return;
    }

    await fetchJob();
    alert("Status updated");
  }

  async function updateAssignment() {
    const assignedUser = users.find((u) => u.id === assignedTo);

    const { error } = await supabase
      .from("jobs")
      .update({
        assigned_to: assignedTo || null,
        assigned_to_name: assignedUser
          ? assignedUser.full_name || assignedUser.email
          : null,
      })
      .eq("id", id);

    if (error) {
      alert(`Error updating assignment: ${error.message}`);
      return;
    }

    await fetchJob();
    alert("Assignment updated");
  }

  async function updateJobDetails() {
    const isDonated = donated || serviceType === "Donated Item";

    const payload = {
      customer: customer || null,
      contact: contact || null,
      device: device || null,
      model: model || null,
      serial_number: serialNumber || null,
      asset_tag: assetTag || null,
      service_type: isDonated ? "Donated Item" : serviceType || null,
      issue: issue || null,
      donated: isDonated,
      paid: isDonated ? false : Boolean(paid),
    };

    if (isDonated) {
      payload.price = 0;
      payload.labour_cost = 0;
      payload.parts_cost = 0;
      payload.parts_json = JSON.stringify([]);
    }

    const { error } = await supabase.from("jobs").update(payload).eq("id", id);

    if (error) {
      alert(`Error updating job details: ${error.message}`);
      return;
    }

    await fetchJob();
    alert("Job details updated");
  }

  function addPartRow() {
    setParts((prev) => [...prev, { name: "", qty: 1, cost: "" }]);
  }

  function updatePartRow(index, field, value) {
    setParts((prev) =>
      prev.map((part, i) => (i === index ? { ...part, [field]: value } : part))
    );
  }

  function removePartRow(index) {
    setParts((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveFinancials() {
    const cleanedParts = donatedMode
      ? []
      : parts
          .map((part) => ({
            name: String(part.name || "").trim(),
            qty: Math.max(1, Number(part.qty) || 1),
            cost: Number(part.cost) || 0,
          }))
          .filter((part) => part.name || part.cost > 0);

    const payload = {
      donated: donatedMode,
      service_type: donatedMode ? "Donated Item" : serviceType || null,
      paid: donatedMode ? false : Boolean(paid),
      collected: Boolean(collected),
      labour_cost: donatedMode ? 0 : normaliseNumberOrNull(labourCost),
      parts_cost: donatedMode ? 0 : Number(partsTotal.toFixed(2)),
      price: donatedMode ? 0 : normaliseNumberOrNull(price),
      parts_json: JSON.stringify(cleanedParts),
    };

    const { error } = await supabase.from("jobs").update(payload).eq("id", id);

    if (error) {
      alert(`Error updating financials: ${error.message}`);
      return;
    }

    await fetchJob();
    alert("Financials updated");
  }

  async function addNote() {
    if (!note.trim()) return;

    const updatedNotes = job?.notes ? `${job.notes}\n• ${note.trim()}` : `• ${note.trim()}`;

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

  async function deleteJob() {
    const confirmed = window.confirm(
      `Delete job ${job?.job_number || id}? This cannot be undone.`
    );
    if (!confirmed) return;

    const { error } = await supabase.from("jobs").delete().eq("id", id);

    if (error) {
      alert(`Could not delete job: ${error.message}`);
      return;
    }

    navigate("/jobs");
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Loading job...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-slate-900 p-6 text-rose-200">
        Could not load job: {loadError}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Job not found.
      </div>
    );
  }

  const qrValue = `${window.location.origin}/jobs/${job.id}`;

  return (
    <div className="space-y-6 print-shell">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl print-break-avoid">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
              Job Record
            </div>
            <h1 className="mt-2 break-words text-3xl font-bold text-white">
              {job.job_number}
            </h1>
            <p className="mt-2 text-slate-400">
              Full workshop job details and live status.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:w-auto xl:min-w-[280px] xl:grid-cols-1">
            <button
              type="button"
              onClick={downloadJobPdf}
              disabled={downloadingPdf}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {downloadingPdf ? "Generating PDF..." : "Download Job PDF"}
            </button>

            <div className="flex items-center justify-center rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-center">
                <QRCodeSVG value={qrValue} size={160} />
                <div className="mt-3 text-xs text-slate-400">
                  Scan to open this job
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-3">
        <div className="space-y-6 2xl:col-span-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl print-break-avoid">
            <h2 className="mb-5 text-xl font-semibold text-white">Edit Job Details</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Customer">
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Contact">
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Device">
                <input
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Model">
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Serial Number">
                <input
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Asset Tag">
                <input
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>

              <Field label="Service Type">
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                >
                  <option>Virus Removal</option>
                  <option>Data Recovery</option>
                  <option>Hardware Repair</option>
                  <option>Networking</option>
                  <option>Software Support</option>
                  <option>General Drop-in</option>
                  <option>Donated Item</option>
                </select>
              </Field>

              <Field label="Assigned To">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={updateAssignment}
                    className="w-full rounded-2xl bg-slate-800 px-4 py-3 text-white hover:bg-slate-700 sm:w-auto"
                  >
                    Save
                  </button>
                </div>
              </Field>
            </div>

            <div className="mt-5">
              <Field label="Issue Description">
                <textarea
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  rows="4"
                  className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={updateJobDetails}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 sm:w-auto"
            >
              Save Job Details
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl print-break-avoid">
            <h2 className="mb-5 text-xl font-semibold text-white">Financials & Parts</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Price (£)">
                <input
                  type="number"
                  step="0.01"
                  value={donatedMode ? "" : price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={donatedMode}
                  className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-60"
                />
              </Field>

              <Field label="Labour Cost (£)">
                <input
                  type="number"
                  step="0.01"
                  value={donatedMode ? "" : labourCost}
                  onChange={(e) => setLabourCost(e.target.value)}
                  disabled={donatedMode}
                  className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-60"
                />
              </Field>
            </div>

            <div className="mt-5">
              <div className="mb-3 text-sm text-slate-400">Parts Used</div>

              <div className="space-y-3">
                {parts.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
                    No parts added yet.
                  </div>
                ) : null}

                {parts.map((part, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-2 xl:grid-cols-[2fr,1fr,1fr,auto]"
                  >
                    <input
                      value={part.name}
                      onChange={(e) => updatePartRow(index, "name", e.target.value)}
                      placeholder="Part name"
                      className="input w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                      disabled={donatedMode}
                    />

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={part.qty}
                      onChange={(e) => updatePartRow(index, "qty", e.target.value)}
                      placeholder="Qty"
                      className="input w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                      disabled={donatedMode}
                    />

                    <input
                      type="number"
                      step="0.01"
                      value={part.cost}
                      onChange={(e) => updatePartRow(index, "cost", e.target.value)}
                      placeholder="Unit cost"
                      className="input w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                      disabled={donatedMode}
                    />

                    <button
                      type="button"
                      onClick={() => removePartRow(index)}
                      disabled={donatedMode}
                      className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200 hover:bg-rose-500/20 disabled:opacity-60 xl:w-auto"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addPartRow}
                disabled={donatedMode}
                className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
              >
                + Add Part
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Detail label="Calculated Parts Total" value={money(partsTotal)} />
              <Detail label="Suggested Total (Labour + Parts)" value={money(suggestedTotal)} />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  disabled={donatedMode}
                />
                Paid
              </label>

              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={donated}
                  onChange={(e) => handleDonatedToggle(e.target.checked)}
                />
                Donated
              </label>

              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={collected}
                  onChange={(e) => setCollected(e.target.checked)}
                />
                Collected
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => setPrice(suggestedTotal.toFixed(2))}
                disabled={donatedMode}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
              >
                Use Suggested Total
              </button>

              <button
                type="button"
                onClick={saveFinancials}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 sm:w-auto"
              >
                Save Financial Details
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl print-break-avoid">
            <h2 className="mb-5 text-xl font-semibold text-white">Work Log</h2>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (e.g. diagnostics started, parts ordered...)"
              className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />

            <button
              type="button"
              onClick={addNote}
              className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-3 text-white hover:opacity-90"
            >
              Add Note
            </button>

            <div className="mt-6 whitespace-pre-line rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              {job.notes || "No notes yet"}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl print-break-avoid">
            <h2 className="mb-5 text-xl font-semibold text-white">Update Status</h2>

            <label className="mb-2 block text-sm text-slate-400">Job Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              <option>Open</option>
              <option>In Progress</option>
              <option>Waiting Parts</option>
              <option>Ready for Collection</option>
              <option>Completed</option>
            </select>

            <button
              type="button"
              onClick={updateStatus}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 font-medium text-white shadow-lg hover:opacity-90"
            >
              Save Status
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl print-break-avoid">
            <h2 className="mb-5 text-xl font-semibold text-white">Current Snapshot</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Detail label="Status" value={job.status} />
              <Detail label="Assigned To" value={job.assigned_to_name || "Unassigned"} />
              <Detail label="Price" value={money(job.price)} />
              <Detail label="Labour" value={money(job.labour_cost)} />
              <Detail label="Parts" value={money(job.parts_cost)} />
              <Detail
                label="Paid"
                value={job.donated ? "Donated" : job.paid ? "Yes" : "No"}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-rose-500/20 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-3 text-xl font-semibold text-white">Danger Zone</h2>
            <p className="text-sm text-slate-400">
              Deleting a job permanently removes it from the system.
            </p>

            <button
              type="button"
              onClick={deleteJob}
              className="mt-4 w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-medium text-rose-200 hover:bg-rose-500/20"
            >
              Delete Job
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function pdfFooter(doc, pageWidth, pageHeight, jobNumber) {
  const pages = doc.getNumberOfPages();

  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `The Nerd Herd Workshop Hub • ${jobNumber} • Page ${i} of ${pages}`,
      12,
      pageHeight - 8
    );
  }
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
      <div className="mt-1 break-words text-base font-medium text-white">
        {value || "—"}
      </div>
    </div>
  );
}