import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import JobFilesPanel from "../components/JobFilesPanel";

const JOB_SELECT = `
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
  status_changed_at,
  job_type,
  project_name,
  output_media_type,
  media_items_json,
  archived
`;

const MEDIA_PROGRESS_OPTIONS = [
  "Booked In",
  "Queued",
  "Cleaning",
  "Ready to Capture",
  "Capturing",
  "Captured",
  "QC In Progress",
  "QC Passed",
  "QC Failed",
  "Delivered",
];

function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  return Number.isNaN(num) ? "—" : `£${num.toFixed(2)}`;
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
    cyan: "bg-cyan-500/20 text-cyan-300",
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
    cyan: "bg-cyan-400",
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

function normaliseMediaItems(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const numericItem = Number(item?.item_number || index + 1);
    const safeNumber = Number.isNaN(numericItem) ? index + 1 : numericItem;
    const safeCode = item?.item_code || String(safeNumber).padStart(3, "0");

    return {
      item_number: safeNumber,
      item_code: safeCode,
      item_label: item?.item_label || safeCode,
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

function buildDetailsPayload(jobForm) {
  return {
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
    project_name: jobForm.project_name || null,
    output_media_type: jobForm.output_media_type || null,
  };
}

function buildFinancialPayload(financialForm, parts) {
  return {
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
    project_name: "",
    output_media_type: "",
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
  const [mediaItemsForm, setMediaItemsForm] = useState([]);
  const [newNote, setNewNote] = useState("");

  const [savingDetails, setSavingDetails] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingFinancials, setSavingFinancials] = useState(false);
  const [savingMediaItems, setSavingMediaItems] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);
  const [archivingJob, setArchivingJob] = useState(false);
  const [unarchivingJob, setUnarchivingJob] = useState(false);

  const isHydratedRef = useRef(false);
  const detailsTimerRef = useRef(null);
  const statusTimerRef = useRef(null);
  const financialsTimerRef = useRef(null);
  const mediaItemsTimerRef = useRef(null);

  const lastSavedDetailsRef = useRef("");
  const lastSavedStatusRef = useRef("");
  const lastSavedFinancialsRef = useRef("");
  const lastSavedMediaItemsRef = useRef("");

  useEffect(() => {
    loadJob();
    loadUsers();

    return () => {
      if (detailsTimerRef.current) clearTimeout(detailsTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (financialsTimerRef.current) clearTimeout(financialsTimerRef.current);
      if (mediaItemsTimerRef.current) clearTimeout(mediaItemsTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`job-detail-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${id}`,
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            navigate("/jobs");
            return;
          }

          await loadJob(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  useEffect(() => {
    if (!job || !isHydratedRef.current) return;

    const payloadKey = JSON.stringify(buildDetailsPayload(jobForm));
    if (payloadKey === lastSavedDetailsRef.current) return;

    if (detailsTimerRef.current) clearTimeout(detailsTimerRef.current);

    detailsTimerRef.current = setTimeout(() => {
      saveJobDetails(true);
    }, 700);

    return () => {
      if (detailsTimerRef.current) clearTimeout(detailsTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobForm, job?.id]);

  useEffect(() => {
    if (!job || !isHydratedRef.current) return;

    const payloadKey = JSON.stringify({ status: statusValue || "Open" });
    if (payloadKey === lastSavedStatusRef.current) return;

    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);

    statusTimerRef.current = setTimeout(() => {
      saveStatus(true);
    }, 500);

    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusValue, job?.id]);

  useEffect(() => {
    if (!job || !isHydratedRef.current) return;

    const payloadKey = JSON.stringify(buildFinancialPayload(financialForm, parts));
    if (payloadKey === lastSavedFinancialsRef.current) return;

    if (financialsTimerRef.current) clearTimeout(financialsTimerRef.current);

    financialsTimerRef.current = setTimeout(() => {
      saveFinancials(true);
    }, 700);

    return () => {
      if (financialsTimerRef.current) clearTimeout(financialsTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialForm, parts, job?.id]);

  useEffect(() => {
    if (!job || !isHydratedRef.current || job.job_type !== "media_conversion") return;

    const payloadKey = JSON.stringify(mediaItemsForm);
    if (payloadKey === lastSavedMediaItemsRef.current) return;

    if (mediaItemsTimerRef.current) clearTimeout(mediaItemsTimerRef.current);

    mediaItemsTimerRef.current = setTimeout(() => {
      saveMediaItems(true);
    }, 700);

    return () => {
      if (mediaItemsTimerRef.current) clearTimeout(mediaItemsTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaItemsForm, job?.id, job?.job_type]);

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

  function applyJobData(data) {
    setJob(data);

    const nextJobForm = {
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
      project_name: data.project_name || "",
      output_media_type: data.output_media_type || "",
    };

    const nextStatusValue = data.status || "Open";

    const nextFinancialForm = {
      price: data.price ?? "",
      labour_cost: data.labour_cost ?? "",
      parts_cost: data.parts_cost ?? "",
      paid: !!data.paid,
      donated: !!data.donated,
      collected: !!data.collected,
    };

    const nextParts = Array.isArray(data.parts_json) ? data.parts_json : [];
    const nextMediaItems = normaliseMediaItems(data.media_items_json);

    setJobForm(nextJobForm);
    setStatusValue(nextStatusValue);
    setFinancialForm(nextFinancialForm);
    setParts(nextParts);
    setMediaItemsForm(nextMediaItems);

    lastSavedDetailsRef.current = JSON.stringify(buildDetailsPayload(nextJobForm));
    lastSavedStatusRef.current = JSON.stringify({ status: nextStatusValue });
    lastSavedFinancialsRef.current = JSON.stringify(
      buildFinancialPayload(nextFinancialForm, nextParts)
    );
    lastSavedMediaItemsRef.current = JSON.stringify(nextMediaItems);

    isHydratedRef.current = true;
  }

  async function loadJob(showSpinner = true) {
    if (showSpinner) {
      setLoading(true);
    }

    setLoadError("");

    const { data, error } = await supabase
      .from("jobs")
      .select(JOB_SELECT)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error loading job:", error);
      setLoadError(error.message || "Unknown error");
      setJob(null);
      setLoading(false);
      return;
    }

    applyJobData(data);
    setLoading(false);
  }

  const isMediaJob = job?.job_type === "media_conversion";
  const isArchivedJob = !!job?.archived;
  const canArchiveAnyJob = !!job;

  const mediaItems = useMemo(() => normaliseMediaItems(job?.media_items_json), [job]);

  const mediaTypeSummary = useMemo(() => {
    if (!mediaItemsForm.length) return [];

    const grouped = mediaItemsForm.reduce((acc, item) => {
      const key = item.source_type || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([type, count]) => ({
      type,
      count,
    }));
  }, [mediaItemsForm]);

  const mediaWorkflowSummary = useMemo(() => {
    const total = mediaItemsForm.length;
    const cleaned = mediaItemsForm.filter((item) => item.cleaned).length;
    const captured = mediaItemsForm.filter((item) => item.captured).length;
    const qcChecked = mediaItemsForm.filter((item) => item.qc_checked).length;
    const delivered = mediaItemsForm.filter((item) => item.delivered).length;
    const qcPassed = mediaItemsForm.filter((item) => item.progress_status === "QC Passed").length;

    return {
      total,
      cleaned,
      captured,
      qcChecked,
      qcPassed,
      delivered,
    };
  }, [mediaItemsForm]);

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

  function handleViewJobHistory() {
    if (!job?.id) return;
    navigate(`/admin/audit-log?table=jobs&record=${encodeURIComponent(job.id)}`);
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

  function handleMediaItemChange(index, field, value) {
    setMediaItemsForm((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
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

  async function saveJobDetails(isAutoSave = false) {
    if (!job) return;

    const payload = buildDetailsPayload(jobForm);
    const payloadKey = JSON.stringify(payload);

    if (payloadKey === lastSavedDetailsRef.current && isAutoSave) return;

    setSavingDetails(true);

    const { data, error } = await supabase
      .from("jobs")
      .update(payload)
      .eq("id", job.id)
      .select(JOB_SELECT)
      .single();

    setSavingDetails(false);

    if (error) {
      console.error("Save job details error:", error);
      if (!isAutoSave) alert(`Could not save job details: ${error.message}`);
      return;
    }

    applyJobData(data);
  }

  async function saveStatus(isAutoSave = false) {
    if (!job) return;

    const payload = { status: statusValue || "Open" };
    const payloadKey = JSON.stringify(payload);

    if (payloadKey === lastSavedStatusRef.current && isAutoSave) return;

    setSavingStatus(true);

    const { data, error } = await supabase
      .from("jobs")
      .update(payload)
      .eq("id", job.id)
      .select(JOB_SELECT)
      .single();

    setSavingStatus(false);

    if (error) {
      console.error("Save status error:", error);
      if (!isAutoSave) alert(`Could not save status: ${error.message}`);
      return;
    }

    applyJobData(data);
  }

  async function saveFinancials(isAutoSave = false) {
    if (!job) return;

    const payload = buildFinancialPayload(financialForm, parts);
    const payloadKey = JSON.stringify(payload);

    if (payloadKey === lastSavedFinancialsRef.current && isAutoSave) return;

    setSavingFinancials(true);

    const { data, error } = await supabase
      .from("jobs")
      .update(payload)
      .eq("id", job.id)
      .select(JOB_SELECT)
      .single();

    setSavingFinancials(false);

    if (error) {
      console.error("Save financials error:", error);
      if (!isAutoSave) alert(`Could not save financial details: ${error.message}`);
      return;
    }

    applyJobData(data);
  }

  async function saveMediaItems(isAutoSave = false) {
    if (!job || !isMediaJob) return;

    const payloadKey = JSON.stringify(mediaItemsForm);
    if (payloadKey === lastSavedMediaItemsRef.current && isAutoSave) return;

    setSavingMediaItems(true);

    const { data, error } = await supabase
      .from("jobs")
      .update({ media_items_json: mediaItemsForm })
      .eq("id", job.id)
      .select(JOB_SELECT)
      .single();

    setSavingMediaItems(false);

    if (error) {
      console.error("Save media items error:", error);
      if (!isAutoSave) alert(`Could not save media items: ${error.message}`);
      return;
    }

    applyJobData(data);
  }

  async function addWorkLogNote() {
    if (!job) return;

    const trimmed = newNote.trim();
    if (!trimmed) return;

    setSavingNote(true);

    const existingNotes = job.notes ? String(job.notes).trim() : "";
    const stampedNote = `• ${trimmed}`;
    const updatedNotes = existingNotes ? `${existingNotes}\n${stampedNote}` : stampedNote;

    const { data, error } = await supabase
      .from("jobs")
      .update({ notes: updatedNotes })
      .eq("id", job.id)
      .select(JOB_SELECT)
      .single();

    setSavingNote(false);

    if (error) {
      console.error("Add note error:", error);
      alert(`Could not add note: ${error.message}`);
      return;
    }

    setNewNote("");
    applyJobData(data);
  }

  async function archiveJob() {
    if (!job || !canArchiveAnyJob || isArchivedJob) return;

    const confirmed = window.confirm(
      `Archive job ${job.job_number || ""}? It will move out of the active list but remain retrievable.`
    );
    if (!confirmed) return;

    setArchivingJob(true);

    const { error } = await supabase
      .from("jobs")
      .update({ archived: true })
      .eq("id", job.id);

    setArchivingJob(false);

    if (error) {
      console.error("Archive job error:", error);
      alert(`Could not archive job: ${error.message}`);
      return;
    }

    navigate(isMediaJob ? "/media/archived" : "/jobs/archived");
  }

  async function unarchiveJob() {
    if (!job || !canArchiveAnyJob || !isArchivedJob) return;

    const confirmed = window.confirm(
      `Unarchive job ${job.job_number || ""}? It will return to the active list.`
    );
    if (!confirmed) return;

    setUnarchivingJob(true);

    const { error } = await supabase
      .from("jobs")
      .update({ archived: false })
      .eq("id", job.id);

    setUnarchivingJob(false);

    if (error) {
      console.error("Unarchive job error:", error);
      alert(`Could not unarchive job: ${error.message}`);
      return;
    }

    navigate(isMediaJob ? "/media" : "/jobs");
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

    if (isMediaJob) {
      navigate(isArchivedJob ? "/media/archived" : "/media");
      return;
    }

    navigate(isArchivedJob ? "/jobs/archived" : "/jobs");
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
            <div
              className={`text-sm uppercase tracking-[0.25em] ${
                isMediaJob ? "text-cyan-400" : "text-blue-400"
              }`}
            >
              {isMediaJob ? "Media Conversion Job" : "Workshop Job"}
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">
              {job.job_number || "Job Details"}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={job.status} />
              {isMediaJob ? <FlagBadge tone="cyan">Media</FlagBadge> : null}
              {isArchivedJob ? <FlagBadge tone="amber">Archived</FlagBadge> : null}
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
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>{savingDetails ? "Saving details..." : "Details auto-save enabled"}</span>
              <span>{savingFinancials ? "Saving financials..." : "Financials auto-save enabled"}</span>
              <span>{savingStatus ? "Saving status..." : "Status auto-save enabled"}</span>
              {isMediaJob ? (
                <span>{savingMediaItems ? "Saving media items..." : "Media item auto-save enabled"}</span>
              ) : null}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto print:hidden">
            <button
              type="button"
              onClick={() =>
                navigate(
                  isMediaJob
                    ? isArchivedJob
                      ? "/media/archived"
                      : "/media"
                    : isArchivedJob
                    ? "/jobs/archived"
                    : "/jobs"
                )
              }
              className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              {isMediaJob
                ? isArchivedJob
                  ? "Back to Archived Media"
                  : "Back to Media Jobs"
                : isArchivedJob
                ? "Back to Archived Jobs"
                : "Back to Jobs"}
            </button>
            <button
              type="button"
              onClick={handleViewJobHistory}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              View Job History
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
              className={`rounded-2xl px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 ${
                isMediaJob
                  ? "bg-gradient-to-r from-emerald-600 to-cyan-600"
                  : "bg-gradient-to-r from-blue-600 to-violet-600"
              }`}
            >
              Print 57mm Receipt
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {isMediaJob ? (
            <>
              <div className="rounded-3xl border border-cyan-500/20 bg-slate-900 p-6 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white">Media Conversion Details</h2>
                  <button
                    type="button"
                    onClick={() => saveJobDetails(false)}
                    disabled={savingDetails}
                    className="rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {savingDetails ? "Saving..." : "Save Media Details"}
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
                    <label className="mb-2 block text-sm text-slate-400">Project Name</label>
                    <input
                      value={jobForm.project_name}
                      onChange={(e) => handleJobFormChange("project_name", e.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Output Media Type</label>
                    <input
                      value={jobForm.output_media_type}
                      onChange={(e) => handleJobFormChange("output_media_type", e.target.value)}
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
                    <label className="mb-2 block text-sm text-slate-400">Media Summary</label>
                    <textarea
                      value={jobForm.fault}
                      onChange={(e) => handleJobFormChange("fault", e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm text-slate-400">Project Notes / Issue</label>
                    <textarea
                      value={jobForm.issue}
                      onChange={(e) => handleJobFormChange("issue", e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-cyan-500/20 bg-slate-900 p-6 shadow-xl">
                <h2 className="text-xl font-semibold text-white">Media Item Summary</h2>
                <p className="mt-1 text-sm text-slate-400">
                  All individual items booked into this project with per-project numbering and workflow tracking.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoCard label="Project Name" value={job.project_name} />
                  <InfoCard label="Output Media" value={job.output_media_type} />
                  <InfoCard label="Total Individual Items" value={String(mediaItemsForm.length)} />
                  <InfoCard
                    label="Item Range"
                    value={
                      mediaItemsForm.length
                        ? `001 - ${String(mediaItemsForm.length).padStart(3, "0")}`
                        : "—"
                    }
                  />
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="text-sm font-semibold text-white">Media Types Received</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {mediaTypeSummary.length ? (
                        mediaTypeSummary.map((entry) => (
                          <FlagBadge key={entry.type} tone="cyan">
                            {entry.type} x{entry.count}
                          </FlagBadge>
                        ))
                      ) : (
                        <div className="text-sm text-slate-400">No media items listed.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="text-sm font-semibold text-white">Stored Summary</div>
                    <div className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                      {job.fault || "No summary saved."}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <InfoCard label="Cleaned" value={`${mediaWorkflowSummary.cleaned} / ${mediaWorkflowSummary.total}`} />
                  <InfoCard label="Captured" value={`${mediaWorkflowSummary.captured} / ${mediaWorkflowSummary.total}`} />
                  <InfoCard label="QC Checked" value={`${mediaWorkflowSummary.qcChecked} / ${mediaWorkflowSummary.total}`} />
                  <InfoCard label="QC Passed" value={`${mediaWorkflowSummary.qcPassed} / ${mediaWorkflowSummary.total}`} />
                  <InfoCard label="Delivered" value={`${mediaWorkflowSummary.delivered} / ${mediaWorkflowSummary.total}`} />
                </div>
              </div>

              <div className="rounded-3xl border border-cyan-500/20 bg-slate-900 p-6 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Per-Item Workflow</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Track progress, labels, QC and delivery for each individual media item.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => saveMediaItems(false)}
                    disabled={savingMediaItems}
                    className="rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {savingMediaItems ? "Saving..." : "Save Media Items"}
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  {mediaItemsForm.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                      No media items stored for this booking.
                    </div>
                  ) : (
                    mediaItemsForm.map((item, index) => (
                      <div
                        key={`${item.item_code}-${item.item_number}-${index}`}
                        className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-cyan-400">
                              Item {item.item_code}
                            </div>
                            <div className="mt-1 text-lg font-semibold text-white">
                              {item.source_type}
                            </div>
                            <div className="mt-1 text-sm text-slate-400">
                              Project item #{item.item_number}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <FlagBadge tone="cyan">{item.progress_status || "Booked In"}</FlagBadge>
                            {item.cleaned ? <FlagBadge tone="blue">Cleaned</FlagBadge> : null}
                            {item.captured ? <FlagBadge tone="green">Captured</FlagBadge> : null}
                            {item.qc_checked ? <FlagBadge tone="violet">QC</FlagBadge> : null}
                            {item.delivered ? <FlagBadge tone="amber">Delivered</FlagBadge> : null}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <label className="mb-2 block text-sm text-slate-400">Item Label</label>
                            <input
                              value={item.item_label || ""}
                              onChange={(e) =>
                                handleMediaItemChange(index, "item_label", e.target.value)
                              }
                              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-slate-400">Status</label>
                            <select
                              value={item.progress_status || "Booked In"}
                              onChange={(e) =>
                                handleMediaItemChange(index, "progress_status", e.target.value)
                              }
                              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                            >
                              {MEDIA_PROGRESS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2 xl:col-span-2">
                            <label className="mb-2 block text-sm text-slate-400">Item Notes</label>
                            <input
                              value={item.item_notes || ""}
                              onChange={(e) =>
                                handleMediaItemChange(index, "item_notes", e.target.value)
                              }
                              placeholder="Condition, tape issues, capture notes, filename, etc."
                              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-6 text-sm text-white">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!item.cleaned}
                              onChange={(e) =>
                                handleMediaItemChange(index, "cleaned", e.target.checked)
                              }
                            />
                            Cleaned
                          </label>

                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!item.captured}
                              onChange={(e) =>
                                handleMediaItemChange(index, "captured", e.target.checked)
                              }
                            />
                            Captured
                          </label>

                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!item.qc_checked}
                              onChange={(e) =>
                                handleMediaItemChange(index, "qc_checked", e.target.checked)
                              }
                            />
                            QC Checked
                          </label>

                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!item.delivered}
                              onChange={(e) =>
                                handleMediaItemChange(index, "delivered", e.target.checked)
                              }
                            />
                            Delivered
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white">Edit Job Details</h2>
                <button
                  type="button"
                  onClick={() => saveJobDetails(false)}
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
          )}

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
                onClick={() => handleFinancialChange("price", suggestedTotal.toFixed(2))}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
              >
                Use Suggested Total
              </button>

              <button
                type="button"
                onClick={() => saveFinancials(false)}
                disabled={savingFinancials}
                className={`rounded-2xl px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50 ${
                  isMediaJob
                    ? "bg-gradient-to-r from-emerald-600 to-cyan-600"
                    : "bg-gradient-to-r from-blue-600 to-violet-600"
                }`}
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
                placeholder={
                  isMediaJob
                    ? "Add a media conversion note (e.g. tape cleaned, capture started, QC completed...)"
                    : "Add a note (e.g. diagnostics started, parts ordered...)"
                }
                rows={3}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={addWorkLogNote}
                disabled={savingNote}
                className={`rounded-2xl px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50 ${
                  isMediaJob
                    ? "bg-gradient-to-r from-emerald-600 to-cyan-600"
                    : "bg-gradient-to-r from-blue-600 to-violet-600"
                }`}
              >
                {savingNote ? "Adding..." : "Add Note"}
              </button>
            </div>

            <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
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
                onClick={() => saveStatus(false)}
                disabled={savingStatus}
                className={`w-full rounded-2xl px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50 ${
                  isMediaJob
                    ? "bg-gradient-to-r from-emerald-600 to-cyan-600"
                    : "bg-gradient-to-r from-blue-600 to-violet-600"
                }`}
              >
                {savingStatus ? "Saving..." : "Save Status"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Job Timeline</h2>
            <p className="mt-1 text-sm text-slate-400">
              {isMediaJob
                ? "Key workflow moments for this media conversion project."
                : "Key workflow moments for this repair."}
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
              <TimelineRow title="Paid" value={formatDateTime(job.paid_at)} tone="green" />
              <TimelineRow
                title="Collected"
                value={formatDateTime(job.collected_at)}
                tone="blue"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">
              {isMediaJob ? "Media Snapshot" : "Current Snapshot"}
            </h2>

            <div className="mt-4 grid gap-3">
              <InfoCard label="Status" value={job.status} />
              <InfoCard label="Assigned To" value={job.assigned_to_name || "Unassigned"} />
              <InfoCard label="Customer" value={job.customer} />

              {isMediaJob ? (
                <>
                  <InfoCard label="Project Name" value={job.project_name} />
                  <InfoCard label="Output Media" value={job.output_media_type} />
                  <InfoCard label="Media Items" value={String(mediaItemsForm.length)} />
                  <InfoCard
                    label="Media Types"
                    value={
                      mediaTypeSummary.length
                        ? mediaTypeSummary.map((entry) => `${entry.type} x${entry.count}`).join(", ")
                        : "—"
                    }
                  />
                  <InfoCard
                    label="Workflow Progress"
                    value={`${mediaWorkflowSummary.captured}/${mediaWorkflowSummary.total} captured • ${mediaWorkflowSummary.qcChecked}/${mediaWorkflowSummary.total} QC`}
                  />
                </>
              ) : (
                <>
                  <InfoCard label="Device" value={job.device} />
                  <InfoCard
                    label="Make / Model"
                    value={[job.make, job.model].filter(Boolean).join(" / ")}
                  />
                  <InfoCard label="Serial Number" value={job.serial_number} />
                </>
              )}

              <InfoCard label="Archive State" value={isArchivedJob ? "Archived" : "Active"} />
              <InfoCard label="Price" value={money(job.price)} />
              <InfoCard label="Labour" value={money(job.labour_cost)} />
              <InfoCard label="Parts" value={money(job.parts_cost)} />
              <InfoCard
                label="Estimated Profit"
                value={money(
                  numberValue(job.price) -
                    numberValue(job.labour_cost) -
                    numberValue(job.parts_cost)
                )}
              />
              <InfoCard label="Created" value={formatDate(job.created_at)} />
              <InfoCard label="Last Updated" value={formatDateTime(job.updated_at)} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={job.status} />
              {isMediaJob ? <FlagBadge tone="cyan">Media</FlagBadge> : null}
              {isArchivedJob ? <FlagBadge tone="amber">Archived</FlagBadge> : null}
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

          <div className="rounded-3xl border border-amber-500/20 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Archive Controls</h2>
            <p className="mt-1 text-sm text-slate-400">
              {isArchivedJob
                ? "This job is archived. You can restore it to the active list."
                : "Archive this job to remove it from the active list while keeping it fully retrievable."}
            </p>

            <div className="mt-4">
              {isArchivedJob ? (
                <button
                  type="button"
                  onClick={unarchiveJob}
                  disabled={unarchivingJob}
                  className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 font-medium text-white hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {unarchivingJob ? "Restoring..." : "Unarchive Job"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={archiveJob}
                  disabled={archivingJob}
                  className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 font-medium text-white hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {archivingJob ? "Archiving..." : "Archive Job"}
                </button>
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