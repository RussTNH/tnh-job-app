import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import JobFilesPanel from "../components/JobFilesPanel";

function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `£${num.toFixed(2)}`;
}

function numberValue(value) {
  const num = Number(value || 0);
  return Number.isNaN(num) ? 0 : num;
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

function StatusBadge({ status }) {
  const map = {
    Open: "bg-slate-700 text-slate-100",
    "In Progress": "bg-blue-600/20 text-blue-300",
    "Waiting Parts": "bg-amber-500/20 text-amber-300",
    "Ready for Collection": "bg-emerald-500/20 text-emerald-300",
    Completed: "bg-violet-500/20 text-violet-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        map[status] || "bg-slate-700 text-slate-100"
      }`}
    >
      {status || "—"}
    </span>
  );
}

function FlagBadge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-700/40 text-slate-200",
    green: "bg-emerald-500/20 text-emerald-300",
    amber: "bg-amber-500/20 text-amber-300",
    rose: "bg-rose-500/20 text-rose-300",
    blue: "bg-blue-500/20 text-blue-300",
    violet: "bg-violet-500/20 text-violet-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        tones[tone] || tones.slate
      }`}
    >
      {children}
    </span>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm text-white">{value || "—"}</div>
    </div>
  );
}

function TimelineRow({ title, value, tone = "slate" }) {
  const dotMap = {
    slate: "bg-slate-500",
    blue: "bg-blue-400",
    amber: "bg-amber-400",
    green: "bg-emerald-400",
    violet: "bg-violet-400",
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`mt-1 h-3 w-3 rounded-full ${dotMap[tone] || dotMap.slate}`} />
        <div className="mt-2 h-full w-px bg-slate-800" />
      </div>
      <div className="pb-5">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="mt-1 text-sm text-slate-400">{value}</div>
      </div>
    </div>
  );
}

function emptyPart() {
  return {
    name: "",
    qty: 1,
    cost: "",
  };
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [jobForm, setJobForm] = useState({
    customer: "",
    contact: "",
    email: "",
    phone: "",
    device: "",
    make: "",
    model: "",
    serial_number: "",
    asset_tag: "",
    fault: "",
    issue: "",
    service_type: "",
    assigned_to: "",
    assigned_to_name: "",
  });

  const [statusValue, setStatusValue] = useState("Open");

  const [financialForm, setFinancialForm] = useState({
    price: "",
    labour_cost: "",
    parts_cost: "",
    paid: false,
    donated: false,
    collected: false,
  });

  const [parts, setParts] = useState([]);
  const [newNote, setNewNote] = useState("");

  const [savingDetails, setSavingDetails] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingFinancials, setSavingFinancials] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);

  useEffect(() => {
    loadJob();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  async function loadJob() {
    setLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        customer,
        email,
        phone,
        fault,
        status,
        assigned_to,
        total,
        created_at,
        contact,
        device,
        issue,
        service_type,
        notes,
        price,
        paid,
        make,
        model,
        serial_number,
        asset_tag,
        donated,
        collected,
        parts_used,
        parts_cost,
        labour_cost,
        parts_json,
        assigned_to_name,
        updated_at,
        ready_at,
        completed_at,
        collected_at,
        paid_at,
        status_changed_at
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error loading job:", error);
      setLoadError(error.message || "Unknown error");
      setJob(null);
      setLoading(false);
      return;
    }

    setJob(data);

    setJobForm({
      customer: data.customer || "",
      contact: data.contact || "",
      email: data.email || "",
      phone: data.phone || "",
      device: data.device || "",
      make: data.make || "",
      model: data.model || "",
      serial_number: data.serial_number || "",
      asset_tag: data.asset_tag || "",
      fault: data.fault || "",
      issue: data.issue || "",
      service_type: data.service_type || "",
      assigned_to: data.assigned_to || "",
      assigned_to_name: data.assigned_to_name || "",
    });

    setStatusValue(data.status || "Open");

    setFinancialForm({
      price: data.price ?? "",
      labour_cost: data.labour_cost ?? "",
      parts_cost: data.parts_cost ?? "",
      paid: !!data.paid,
      donated: !!data.donated,
      collected: !!data.collected,
    });

    setParts(Array.isArray(data.parts_json) ? data.parts_json : []);
    setLoading(false);
  }

  function handlePrint() {
    window.print();
  }

  function handleReceiptPrint57mm() {
    const receiptWindow = window.open(`/jobs/${id}/receipt`, "_blank");

    if (!receiptWindow) {
      alert("Pop-up blocked. Please allow pop-ups and try again.");
      return;
    }

    setTimeout(() => {
      try {
        receiptWindow.focus();
      } catch (err) {
        console.error("Receipt open error:", err);
      }
    }, 500);
  }

  function handleJobFormChange(field, value) {
    setJobForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleFinancialChange(field, value) {
    setFinancialForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleAssignedChange(userId) {
    const selectedUser = users.find((user) => user.id === userId);

    setJobForm((prev) => ({
      ...prev,
      assigned_to: userId,
      assigned_to_name: selectedUser ? selectedUser.full_name || selectedUser.email : "",
    }));
  }

  function addPart() {
    setParts((prev) => [...prev, emptyPart()]);
  }

  function updatePart(index, field, value) {
    setParts((prev) =>
      prev.map((part, i) =>
        i === index
          ? {
              ...part,
              [field]: field === "qty" ? Number(value || 0) : value,
            }
          : part
      )
    );
  }

  function removePart(index) {
    setParts((prev) => prev.filter((_, i) => i !== index));
  }

  const calculatedPartsTotal = useMemo(() => {
    return parts.reduce((sum, part) => {
      const qty = numberValue(part.qty || 1);
      const cost = numberValue(part.cost);
      return sum + qty * cost;
    }, 0);
  }, [parts]);

  const suggestedTotal = useMemo(() => {
    return numberValue(financialForm.labour_cost) + calculatedPartsTotal;
  }, [financialForm.labour_cost, calculatedPartsTotal]);

  const estimatedProfit = useMemo(() => {
    return (
      numberValue(financialForm.price) -
      numberValue(financialForm.labour_cost) -
      numberValue(financialForm.parts_cost)
    );
  }, [financialForm]);

  async function saveJobDetails() {
    if (!job) return;

    setSavingDetails(true);

    const payload = {
      customer: jobForm.customer || null,
      contact: jobForm.contact || null,
      email: jobForm.email || null,
      phone: jobForm.phone || null,
      device: jobForm.device || null,
      make: jobForm.make || null,
      model: jobForm.model || null,
      serial_number: jobForm.serial_number || null,
      asset_tag: jobForm.asset_tag || null,
      fault: jobForm.fault || null,
      issue: jobForm.issue || null,
      service_type: jobForm.service_type || null,
      assigned_to: jobForm.assigned_to || null,
      assigned_to_name: jobForm.assigned_to_name || null,
    };

    const { error } = await supabase.from("jobs").update(payload).eq("id", job.id);

    setSavingDetails(false);

    if (error) {
      console.error("Save job details error:", error);
      alert(`Could not save job details: ${error.message}`);
      return;
    }

    await loadJob();
  }

  async function saveStatus() {
    if (!job) return;

    setSavingStatus(true);

    const { error } = await supabase
      .from("jobs")
      .update({ status: statusValue })
      .eq("id", job.id);

    setSavingStatus(false);

    if (error) {
      console.error("Save status error:", error);
      alert(`Could not save status: ${error.message}`);
      return;
    }

    await loadJob();
  }

  async function saveFinancials() {
    if (!job) return;

    setSavingFinancials(true);

    const payload = {
      price: financialForm.price === "" ? null : numberValue(financialForm.price),
      labour_cost:
        financialForm.labour_cost === "" ? null : numberValue(financialForm.labour_cost),
      parts_cost:
        financialForm.parts_cost === "" ? null : numberValue(financialForm.parts_cost),
      paid: !!financialForm.paid,
      donated: !!financialForm.donated,
      collected: !!financialForm.collected,
      parts_json: parts,
      parts_used: parts
        .filter((part) => part.name)
        .map((part) => `${part.name}${part.qty ? ` x${part.qty}` : ""}`)
        .join(", "),
    };

    const { error } = await supabase.from("jobs").update(payload).eq("id", job.id);

    setSavingFinancials(false);

    if (error) {
      console.error("Save financials error:", error);
      alert(`Could not save financial details: ${error.message}`);
      return;
    }

    await loadJob();
  }

  async function addWorkLogNote() {
    if (!job) return;

    const trimmed = newNote.trim();
    if (!trimmed) return;

    setSavingNote(true);

    const existingNotes = job.notes ? String(job.notes).trim() : "";
    const stampedNote = `• ${trimmed}`;
    const updatedNotes = existingNotes
      ? `${existingNotes}\n${stampedNote}`
      : stampedNote;

    const { error } = await supabase
      .from("jobs")
      .update({ notes: updatedNotes })
      .eq("id", job.id);

    setSavingNote(false);

    if (error) {
      console.error("Add note error:", error);
      alert(`Could not add note: ${error.message}`);
      return;
    }

    setNewNote("");
    await loadJob();
  }

  async function deleteJob() {
    if (!job) return;

    const confirmed = window.confirm(
      `Delete job ${job.job_number || ""}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingJob(true);

    const { error } = await supabase.from("jobs").delete().eq("id", job.id);

    setDeletingJob(false);

    if (error) {
      console.error("Delete job error:", error);
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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
              Workshop Job
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">
              {job.job_number || "Job Details"}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={job.status} />
              {job.donated ? (
                <FlagBadge tone="violet">Donated</FlagBadge>
              ) : job.paid ? (
                <FlagBadge tone="green">Paid</FlagBadge>
              ) : (
                <FlagBadge tone="amber">Unpaid</FlagBadge>
              )}

              {job.collected ? (
                <FlagBadge tone="blue">Collected</FlagBadge>
              ) : (
                <FlagBadge tone="rose">Not Collected</FlagBadge>
              )}
            </div>
            <p className="mt-3 text-slate-400">
              Created {formatDateTime(job.created_at)} • Updated {formatDateTime(job.updated_at)}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto print:hidden">
            <button
              type="button"
              onClick={() => navigate("/jobs")}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              Back to Jobs
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              Print A4
            </button>
            <button
              type="button"
              onClick={handleReceiptPrint57mm}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90"
            >
              Print 57mm Receipt
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">Edit Job Details</h2>
              <button
                type="button"
                onClick={saveJobDetails}
                disabled={savingDetails}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50"
              >
                {savingDetails ? "Saving..." : "Save Job Details"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Customer</label>
                <input
                  value={jobForm.customer}
                  onChange={(e) => handleJobFormChange("customer", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Contact</label>
                <input
                  value={jobForm.contact}
                  onChange={(e) => handleJobFormChange("contact", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Email</label>
                <input
                  value={jobForm.email}
                  onChange={(e) => handleJobFormChange("email", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Phone</label>
                <input
                  value={jobForm.phone}
                  onChange={(e) => handleJobFormChange("phone", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Device</label>
                <input
                  value={jobForm.device}
                  onChange={(e) => handleJobFormChange("device", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Make</label>
                <input
                  value={jobForm.make}
                  onChange={(e) => handleJobFormChange("make", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Model</label>
                <input
                  value={jobForm.model}
                  onChange={(e) => handleJobFormChange("model", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Serial Number</label>
                <input
                  value={jobForm.serial_number}
                  onChange={(e) => handleJobFormChange("serial_number", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Asset Tag</label>
                <input
                  value={jobForm.asset_tag}
                  onChange={(e) => handleJobFormChange("asset_tag", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Service Type</label>
                <input
                  value={jobForm.service_type}
                  onChange={(e) => handleJobFormChange("service_type", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Assigned To</label>
                <select
                  value={jobForm.assigned_to}
                  onChange={(e) => handleAssignedChange(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-slate-400">Fault</label>
                <textarea
                  value={jobForm.fault}
                  onChange={(e) => handleJobFormChange("fault", e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-slate-400">Issue</label>
                <textarea
                  value={jobForm.issue}
                  onChange={(e) => handleJobFormChange("issue", e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Financials & Parts</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Price (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={financialForm.price}
                  onChange={(e) => handleFinancialChange("price", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Labour Cost (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={financialForm.labour_cost}
                  onChange={(e) => handleFinancialChange("labour_cost", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Parts Cost (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={financialForm.parts_cost}
                  onChange={(e) => handleFinancialChange("parts_cost", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-white">Parts Used</h3>
                <button
                  type="button"
                  onClick={addPart}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-white hover:bg-slate-800"
                >
                  + Add Part
                </button>
              </div>

              {parts.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                  No parts added yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {parts.map((part, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-12"
                    >
                      <div className="sm:col-span-6">
                        <label className="mb-2 block text-sm text-slate-400">Part Name</label>
                        <input
                          value={part.name || ""}
                          onChange={(e) => updatePart(index, "name", e.target.value)}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm text-slate-400">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={part.qty ?? 1}
                          onChange={(e) => updatePart(index, "qty", e.target.value)}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="mb-2 block text-sm text-slate-400">Cost (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={part.cost || ""}
                          onChange={(e) => updatePart(index, "cost", e.target.value)}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                        />
                      </div>

                      <div className="sm:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removePart(index)}
                          className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-white hover:bg-rose-500/20"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Calculated Parts Total" value={money(calculatedPartsTotal)} />
              <InfoCard label="Saved Parts Used" value={job.parts_used || "—"} />
              <InfoCard label="Suggested Total (Labour + Parts)" value={money(suggestedTotal)} />
              <InfoCard label="Estimated Profit" value={money(estimatedProfit)} />
            </div>

            <div className="mt-5 flex flex-wrap gap-6 text-sm text-white">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!financialForm.paid}
                  onChange={(e) => handleFinancialChange("paid", e.target.checked)}
                />
                Paid
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!financialForm.donated}
                  onChange={(e) => handleFinancialChange("donated", e.target.checked)}
                />
                Donated
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!financialForm.collected}
                  onChange={(e) => handleFinancialChange("collected", e.target.checked)}
                />
                Collected
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  handleFinancialChange("parts_cost", calculatedPartsTotal.toFixed(2))
                }
                className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
              >
                Use Calculated Parts Total
              </button>

              <button
                type="button"
                onClick={() =>
                  handleFinancialChange("price", suggestedTotal.toFixed(2))
                }
                className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
              >
                Use Suggested Total
              </button>

              <button
                type="button"
                onClick={saveFinancials}
                disabled={savingFinancials}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50"
              >
                {savingFinancials ? "Saving..." : "Save Financial Details"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Milestone Timestamps</h2>
            <p className="mt-1 text-sm text-slate-400">
              These are set automatically by your database logic.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <InfoCard label="Status Changed" value={formatDateTime(job.status_changed_at)} />
              <InfoCard label="Ready At" value={formatDateTime(job.ready_at)} />
              <InfoCard label="Completed At" value={formatDateTime(job.completed_at)} />
              <InfoCard label="Paid At" value={formatDateTime(job.paid_at)} />
              <InfoCard label="Collected At" value={formatDateTime(job.collected_at)} />
            </div>
          </div>

          <JobFilesPanel jobId={job.id} />

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Work Log</h2>

            <div className="mt-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note (e.g. diagnostics started, parts ordered...)"
                rows={3}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={addWorkLogNote}
                disabled={savingNote}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50"
              >
                {savingNote ? "Adding..." : "Add Note"}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300 whitespace-pre-wrap">
              {job.notes || "No notes added yet."}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Update Status</h2>

            <div className="mt-4">
              <label className="mb-2 block text-sm text-slate-400">Job Status</label>
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              >
                <option>Open</option>
                <option>In Progress</option>
                <option>Waiting Parts</option>
                <option>Ready for Collection</option>
                <option>Completed</option>
              </select>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={saveStatus}
                disabled={savingStatus}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50"
              >
                {savingStatus ? "Saving..." : "Save Status"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Job Timeline</h2>
            <p className="mt-1 text-sm text-slate-400">
              Key workflow moments for this repair.
            </p>

            <div className="mt-5">
              <TimelineRow title="Job Created" value={formatDateTime(job.created_at)} tone="blue" />
              <TimelineRow
                title="Status Last Changed"
                value={formatDateTime(job.status_changed_at)}
                tone="amber"
              />
              <TimelineRow
                title="Ready for Collection"
                value={formatDateTime(job.ready_at)}
                tone="green"
              />
              <TimelineRow
                title="Completed"
                value={formatDateTime(job.completed_at)}
                tone="violet"
              />
              <TimelineRow
                title="Paid"
                value={formatDateTime(job.paid_at)}
                tone="green"
              />
              <TimelineRow
                title="Collected"
                value={formatDateTime(job.collected_at)}
                tone="blue"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Current Snapshot</h2>

            <div className="mt-4 grid gap-3">
              <InfoCard label="Status" value={job.status} />
              <InfoCard label="Assigned To" value={job.assigned_to_name || "Unassigned"} />
              <InfoCard label="Customer" value={job.customer} />
              <InfoCard label="Device" value={job.device} />
              <InfoCard label="Make / Model" value={[job.make, job.model].filter(Boolean).join(" / ")} />
              <InfoCard label="Serial Number" value={job.serial_number} />
              <InfoCard label="Price" value={money(job.price)} />
              <InfoCard label="Labour" value={money(job.labour_cost)} />
              <InfoCard label="Parts" value={money(job.parts_cost)} />
              <InfoCard
                label="Estimated Profit"
                value={money(
                  numberValue(job.price) - numberValue(job.labour_cost) - numberValue(job.parts_cost)
                )}
              />
              <InfoCard label="Created" value={formatDate(job.created_at)} />
              <InfoCard label="Last Updated" value={formatDateTime(job.updated_at)} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={job.status} />
              {job.donated ? (
                <FlagBadge tone="violet">Donated</FlagBadge>
              ) : job.paid ? (
                <FlagBadge tone="green">Paid</FlagBadge>
              ) : (
                <FlagBadge tone="amber">Unpaid</FlagBadge>
              )}

              {job.collected ? (
                <FlagBadge tone="blue">Collected</FlagBadge>
              ) : (
                <FlagBadge tone="rose">Not Collected</FlagBadge>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-rose-500/20 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Danger Zone</h2>
            <p className="mt-1 text-sm text-slate-400">
              Deleting a job permanently removes it from the system.
            </p>

            <div className="mt-4">
              <button
                type="button"
                onClick={deleteJob}
                disabled={deletingJob}
                className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 font-medium text-white hover:bg-rose-500/20 disabled:opacity-50"
              >
                {deletingJob ? "Deleting..." : "Delete Job"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}