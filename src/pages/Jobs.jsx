import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 12;

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
    month: "2-digit",
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

function daysSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getProfit(job) {
  const price = numberValue(job.price);
  const labour = numberValue(job.labour_cost);
  const parts = numberValue(job.parts_cost);
  return price - labour - parts;
}

function getProfitTone(profit) {
  if (profit > 0) return "text-emerald-300";
  if (profit < 0) return "text-rose-300";
  return "text-slate-300";
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

function StatCard({ label, value, onClick, active = false, subvalue }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left shadow-xl transition ${
        active
          ? "border-blue-500 bg-slate-800"
          : "border-slate-800 bg-slate-900 hover:bg-slate-800/60"
      }`}
    >
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {subvalue ? <div className="mt-1 text-xs text-slate-500">{subvalue}</div> : null}
    </button>
  );
}

function getEngineerTone(key) {
  if (!key) {
    return {
      card: "border-slate-800 bg-slate-950",
      tableRow: "hover:bg-slate-800/40",
      pill: "bg-slate-700/40 text-slate-200",
      accent: "text-slate-400",
    };
  }

  const tones = [
    {
      card: "border-blue-500/30 bg-blue-500/5",
      tableRow: "bg-blue-500/[0.04] hover:bg-blue-500/[0.10]",
      pill: "bg-blue-500/20 text-blue-300",
      accent: "text-blue-300",
    },
    {
      card: "border-emerald-500/30 bg-emerald-500/5",
      tableRow: "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.10]",
      pill: "bg-emerald-500/20 text-emerald-300",
      accent: "text-emerald-300",
    },
    {
      card: "border-amber-500/30 bg-amber-500/5",
      tableRow: "bg-amber-500/[0.04] hover:bg-amber-500/[0.10]",
      pill: "bg-amber-500/20 text-amber-300",
      accent: "text-amber-300",
    },
    {
      card: "border-violet-500/30 bg-violet-500/5",
      tableRow: "bg-violet-500/[0.04] hover:bg-violet-500/[0.10]",
      pill: "bg-violet-500/20 text-violet-300",
      accent: "text-violet-300",
    },
    {
      card: "border-cyan-500/30 bg-cyan-500/5",
      tableRow: "bg-cyan-500/[0.04] hover:bg-cyan-500/[0.10]",
      pill: "bg-cyan-500/20 text-cyan-300",
      accent: "text-cyan-300",
    },
    {
      card: "border-pink-500/30 bg-pink-500/5",
      tableRow: "bg-pink-500/[0.04] hover:bg-pink-500/[0.10]",
      pill: "bg-pink-500/20 text-pink-300",
      accent: "text-pink-300",
    },
    {
      card: "border-lime-500/30 bg-lime-500/5",
      tableRow: "bg-lime-500/[0.04] hover:bg-lime-500/[0.10]",
      pill: "bg-lime-500/20 text-lime-300",
      accent: "text-lime-300",
    },
    {
      card: "border-orange-500/30 bg-orange-500/5",
      tableRow: "bg-orange-500/[0.04] hover:bg-orange-500/[0.10]",
      pill: "bg-orange-500/20 text-orange-300",
      accent: "text-orange-300",
    },
    {
      card: "border-indigo-500/30 bg-indigo-500/5",
      tableRow: "bg-indigo-500/[0.04] hover:bg-indigo-500/[0.10]",
      pill: "bg-indigo-500/20 text-indigo-300",
      accent: "text-indigo-300",
    },
  ];

  const str = String(key);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 2147483647;
  }

  return tones[Math.abs(hash) % tones.length];
}

export default function Jobs() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [archivingJobId, setArchivingJobId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadJobs();
    loadUsers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, assignedFilter, paymentFilter]);

  async function loadJobs() {
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
        service_type,
        status,
        assigned_to,
        assigned_to_name,
        price,
        labour_cost,
        parts_cost,
        paid,
        donated,
        collected,
        created_at,
        updated_at,
        job_type,
        archived
      `)
      .or("job_type.is.null,job_type.eq.standard")
      .eq("archived", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading jobs:", error);
      setLoadError(error.message || "Unknown error");
      setJobs([]);
      setLoading(false);
      return;
    }

    setJobs(data || []);
    setLoading(false);
  }

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

  async function archiveJob(job) {
    const confirmed = window.confirm(
      `Archive job ${job.job_number || ""}? It will move to Archived Jobs but remain retrievable.`
    );
    if (!confirmed) return;

    setArchivingJobId(job.id);

    const { error } = await supabase
      .from("jobs")
      .update({ archived: true })
      .eq("id", job.id);

    setArchivingJobId("");

    if (error) {
      console.error("Archive job error:", error);
      alert(`Could not archive job: ${error.message}`);
      return;
    }

    setJobs((prev) => prev.filter((item) => item.id !== job.id));
  }

  function handlePrintJob(jobId) {
    const printWindow = window.open(`/jobs/${jobId}`, "_blank");

    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups and try again.");
      return;
    }

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (err) {
        console.error("Print launch error:", err);
      }
    }, 1500);
  }

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !term ||
        (job.job_number || "").toLowerCase().includes(term) ||
        (job.customer || "").toLowerCase().includes(term) ||
        (job.contact || "").toLowerCase().includes(term) ||
        (job.email || "").toLowerCase().includes(term) ||
        (job.phone || "").toLowerCase().includes(term) ||
        (job.device || "").toLowerCase().includes(term) ||
        (job.make || "").toLowerCase().includes(term) ||
        (job.model || "").toLowerCase().includes(term) ||
        (job.serial_number || "").toLowerCase().includes(term) ||
        (job.assigned_to_name || "").toLowerCase().includes(term);

      const matchesStatus = statusFilter === "All" || job.status === statusFilter;

      const matchesAssigned =
        assignedFilter === "All" ||
        (assignedFilter === "Unassigned" && !job.assigned_to) ||
        job.assigned_to === assignedFilter;

      const matchesPayment =
        paymentFilter === "All" ||
        (paymentFilter === "Paid" && job.paid && !job.donated) ||
        (paymentFilter === "Unpaid" && !job.paid && !job.donated) ||
        (paymentFilter === "Donated" && job.donated) ||
        (paymentFilter === "Collected" && job.collected) ||
        (paymentFilter === "Not Collected" && !job.collected);

      return matchesSearch && matchesStatus && matchesAssigned && matchesPayment;
    });
  }, [jobs, search, statusFilter, assignedFilter, paymentFilter]);

  const totals = useMemo(() => {
    const totalQuoted = jobs.reduce((sum, job) => sum + numberValue(job.price), 0);
    const totalProfit = jobs.reduce((sum, job) => sum + getProfit(job), 0);
    const unassigned = jobs.filter((j) => !j.assigned_to).length;
    const unpaid = jobs.filter((j) => !j.paid && !j.donated).length;

    return {
      total: jobs.length,
      open: jobs.filter((j) => j.status === "Open").length,
      inProgress: jobs.filter((j) => j.status === "In Progress").length,
      waitingParts: jobs.filter((j) => j.status === "Waiting Parts").length,
      ready: jobs.filter((j) => j.status === "Ready for Collection").length,
      completed: jobs.filter((j) => j.status === "Completed").length,
      totalQuoted,
      totalProfit,
      unassigned,
      unpaid,
    };
  }, [jobs]);

  const oldestActiveJobs = useMemo(() => {
    return jobs
      .filter((job) => job.status !== "Completed" && job.status !== "Ready for Collection")
      .map((job) => ({
        ...job,
        ageDays: daysSince(job.created_at) ?? 0,
      }))
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, 5);
  }, [jobs]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));

  const paginatedJobs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredJobs.slice(start, start + PAGE_SIZE);
  }, [filteredJobs, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function toggleStatusFilter(status) {
    setStatusFilter((prev) => (prev === status ? "All" : status));
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Loading jobs...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-slate-900 p-6 text-rose-200">
        Could not load jobs: {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
              Workshop
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">Jobs</h1>
            <p className="mt-2 text-slate-400">
              Search, filter, and manage all active workshop jobs.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/jobs/new")}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 sm:w-auto"
            >
              + Create Job
            </button>

            <button
              type="button"
              onClick={() => navigate("/media/new")}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 sm:w-auto"
            >
              + Media Conversion
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <StatCard
          label="Total Jobs"
          value={totals.total}
          subvalue={`Quoted ${money(totals.totalQuoted)}`}
          onClick={() => setStatusFilter("All")}
          active={statusFilter === "All"}
        />
        <StatCard
          label="Open"
          value={totals.open}
          onClick={() => toggleStatusFilter("Open")}
          active={statusFilter === "Open"}
        />
        <StatCard
          label="In Progress"
          value={totals.inProgress}
          onClick={() => toggleStatusFilter("In Progress")}
          active={statusFilter === "In Progress"}
        />
        <StatCard
          label="Waiting Parts"
          value={totals.waitingParts}
          onClick={() => toggleStatusFilter("Waiting Parts")}
          active={statusFilter === "Waiting Parts"}
        />
        <StatCard
          label="Ready"
          value={totals.ready}
          onClick={() => toggleStatusFilter("Ready for Collection")}
          active={statusFilter === "Ready for Collection"}
        />
        <StatCard
          label="Completed"
          value={totals.completed}
          onClick={() => toggleStatusFilter("Completed")}
          active={statusFilter === "Completed"}
        />
        <StatCard
          label="Unassigned"
          value={totals.unassigned}
          onClick={() => setAssignedFilter("Unassigned")}
          active={assignedFilter === "Unassigned"}
        />
        <StatCard
          label="Estimated Profit"
          value={money(totals.totalProfit)}
          subvalue={totals.unpaid ? `${totals.unpaid} unpaid job(s)` : "All caught up"}
          onClick={() => setPaymentFilter("Unpaid")}
          active={paymentFilter === "Unpaid"}
        />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex flex-wrap gap-3">
          {["Open", "In Progress", "Waiting Parts", "Ready for Collection", "Completed"].map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatusFilter(status)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  statusFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-slate-950 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {status}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => setStatusFilter("All")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              statusFilter === "All"
                ? "bg-violet-600 text-white"
                : "bg-slate-950 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Clear Status
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-slate-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Job number, customer, device, serial, assigned user..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Assigned</label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              <option value="All">All</option>
              <option value="Unassigned">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Payment / Collection</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              <option>All</option>
              <option>Paid</option>
              <option>Unpaid</option>
              <option>Donated</option>
              <option>Collected</option>
              <option>Not Collected</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
              setAssignedFilter("All");
              setPaymentFilter("All");
            }}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800 sm:w-auto"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Oldest Active Jobs</h2>
            <p className="mt-1 text-sm text-slate-400">
              Jobs that have been open the longest and may need attention.
            </p>
          </div>
        </div>

        {oldestActiveJobs.length === 0 ? (
          <div className="mt-4 text-slate-400">No active jobs to show.</div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {oldestActiveJobs.map((job) => {
              const profit = getProfit(job);
              const tone = getEngineerTone(job.assigned_to || job.assigned_to_name);

              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className={`rounded-2xl border p-4 text-left transition hover:bg-slate-800 ${tone.card}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-blue-400">{job.job_number || "—"}</div>
                    {job.assigned_to_name ? (
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${tone.pill}`}>
                        {job.assigned_to_name}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 font-medium text-white">
                    {job.customer || "No customer"}
                  </div>

                  <div className="mt-1 text-sm text-slate-400">
                    {job.device || "No device"}
                    {job.make ? ` • ${job.make}` : ""}
                    {job.model ? ` • ${job.model}` : ""}
                  </div>

                  <div className={`mt-1 text-sm ${job.assigned_to_name ? tone.accent : "text-slate-500"}`}>
                    {job.assigned_to_name || "Unassigned"}
                  </div>

                  <div className="mt-2 text-sm">
                    <span className="text-slate-500">Profit:</span>{" "}
                    <span className={getProfitTone(profit)}>{money(profit)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <StatusBadge status={job.status} />
                    <span className="text-xs text-amber-300">
                      {job.ageDays} day{job.ageDays === 1 ? "" : "s"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="border-b border-slate-800 px-6 py-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-slate-400">
              Showing <span className="font-medium text-white">{paginatedJobs.length}</span> on
              this page of <span className="font-medium text-white">{filteredJobs.length}</span>{" "}
              filtered active jobs
            </div>

            <div className="text-sm text-slate-400">
              Page <span className="font-medium text-white">{page}</span> of{" "}
              <span className="font-medium text-white">{totalPages}</span>
            </div>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="p-6 text-slate-400">No jobs matched your filters.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left">
                <thead className="bg-slate-950 text-sm text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Job</th>
                    <th className="px-6 py-4 font-medium">Customer / Device</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Assigned</th>
                    <th className="px-6 py-4 font-medium">Dates</th>
                    <th className="px-6 py-4 font-medium">Financial</th>
                    <th className="px-6 py-4 font-medium">Profit</th>
                    <th className="px-6 py-4 font-medium">Flags</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedJobs.map((job) => {
                    const age = daysSince(job.created_at);
                    const profit = getProfit(job);
                    const tone = getEngineerTone(job.assigned_to || job.assigned_to_name);
                    const isArchiving = archivingJobId === job.id;

                    return (
                      <tr
                        key={job.id}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className={`cursor-pointer border-t border-slate-800 transition ${tone.tableRow}`}
                      >
                        <td className="px-6 py-4 align-top">
                          <div className="font-medium text-white">{job.job_number || "—"}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {job.service_type || "—"}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="font-medium text-white">
                            {job.customer || "No customer"}
                          </div>
                          <div className="mt-1 text-sm text-slate-400">
                            {job.device || "No device"}
                            {job.make ? ` • ${job.make}` : ""}
                            {job.model ? ` • ${job.model}` : ""}
                          </div>
                          {job.serial_number ? (
                            <div className="mt-1 text-xs text-slate-500">
                              S/N: {job.serial_number}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="space-y-2">
                            <StatusBadge status={job.status} />
                            {age !== null && job.status !== "Completed" ? (
                              <div className="text-xs text-slate-500">
                                Open for {age} day{age === 1 ? "" : "s"}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="text-white">
                            {job.assigned_to_name || "Unassigned"}
                          </div>
                          <div className={`mt-1 text-xs ${job.assigned_to_name ? tone.accent : "text-slate-500"}`}>
                            {job.assigned_to ? "Assigned engineer" : "Awaiting assignment"}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="text-sm text-white">
                            Created: {formatDate(job.created_at)}
                          </div>
                          <div className="mt-1 text-sm text-slate-400">
                            Updated: {formatDateTime(job.updated_at || job.created_at)}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="text-sm text-white">Quoted: {money(job.price)}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            Labour: {money(job.labour_cost)}
                          </div>
                          <div className="mt-1 text-sm text-slate-400">
                            Parts: {money(job.parts_cost)}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className={`font-medium ${getProfitTone(profit)}`}>
                            {money(profit)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">Price − labour − parts</div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
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
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/jobs/${job.id}`);
                              }}
                              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-800"
                            >
                              Open
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintJob(job.id);
                              }}
                              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-800"
                            >
                              Print
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveJob(job);
                              }}
                              disabled={isArchiving}
                              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-white hover:bg-amber-500/20 disabled:opacity-50"
                            >
                              {isArchiving ? "Archiving..." : "Archive"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 p-4 md:hidden">
              {paginatedJobs.map((job) => {
                const age = daysSince(job.created_at);
                const profit = getProfit(job);
                const tone = getEngineerTone(job.assigned_to || job.assigned_to_name);
                const isArchiving = archivingJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className={`w-full rounded-2xl border p-4 ${tone.card}`}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-blue-400">
                            {job.job_number || "—"}
                          </div>
                          <div className="mt-1 font-medium text-white">
                            {job.customer || "No customer"}
                          </div>
                          <div className="mt-1 text-sm text-slate-400">
                            {job.device || "No device"}
                            {job.make ? ` • ${job.make}` : ""}
                            {job.model ? ` • ${job.model}` : ""}
                          </div>
                          {job.assigned_to_name ? (
                            <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone.pill}`}>
                              {job.assigned_to_name}
                            </div>
                          ) : null}
                        </div>

                        <div className="shrink-0">
                          <StatusBadge status={job.status} />
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-300">
                        <div>
                          <span className="text-slate-500">Assigned:</span>{" "}
                          {job.assigned_to_name || "Unassigned"}
                        </div>

                        <div>
                          <span className="text-slate-500">Service:</span>{" "}
                          {job.service_type || "—"}
                        </div>

                        <div>
                          <span className="text-slate-500">Price:</span>{" "}
                          {money(job.price)}
                        </div>

                        <div>
                          <span className="text-slate-500">Labour:</span>{" "}
                          {money(job.labour_cost)}
                        </div>

                        <div>
                          <span className="text-slate-500">Parts:</span>{" "}
                          {money(job.parts_cost)}
                        </div>

                        <div>
                          <span className="text-slate-500">Profit:</span>{" "}
                          <span className={getProfitTone(profit)}>{money(profit)}</span>
                        </div>

                        {job.serial_number ? (
                          <div>
                            <span className="text-slate-500">Serial:</span>{" "}
                            {job.serial_number}
                          </div>
                        ) : null}

                        <div>
                          <span className="text-slate-500">Created:</span>{" "}
                          {formatDate(job.created_at)}
                        </div>

                        <div>
                          <span className="text-slate-500">Updated:</span>{" "}
                          {formatDateTime(job.updated_at || job.created_at)}
                        </div>

                        {age !== null && job.status !== "Completed" ? (
                          <div>
                            <span className="text-slate-500">Open for:</span>{" "}
                            {age} day{age === 1 ? "" : "s"}
                          </div>
                        ) : null}
                      </div>
                    </button>

                    <div className="mt-3 flex flex-wrap gap-2">
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

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white hover:bg-slate-800"
                      >
                        Open
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintJob(job.id)}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white hover:bg-slate-800"
                      >
                        Print
                      </button>

                      <button
                        type="button"
                        onClick={() => archiveJob(job)}
                        disabled={isArchiving}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-white hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        {isArchiving ? "..." : "Archive"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-800 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-400">
                Showing page <span className="font-medium text-white">{page}</span> of{" "}
                <span className="font-medium text-white">{totalPages}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  First
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}