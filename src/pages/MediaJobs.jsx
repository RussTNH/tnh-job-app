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

function getEngineerTone(key) {
  if (!key) {
    return {
      card: "border-slate-700 bg-slate-900",
      tableRow: "hover:bg-slate-800/70",
      pill: "bg-slate-700/50 text-slate-300",
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

export default function MediaJobs() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [archivingJobId, setArchivingJobId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, assignedFilter]);

  async function loadPageData() {
    setLoading(true);
    setLoadError("");

    try {
      const [{ data: jobsData, error: jobsError }, { data: usersData, error: usersError }] =
        await Promise.all([
          supabase
            .from("jobs")
            .select("*")
            .eq("job_type", "media_conversion")
            .eq("archived", false)
            .order("created_at", { ascending: false }),
          supabase
            .from("profiles")
            .select("id, full_name, role")
            .in("role", ["admin", "staff"])
            .order("full_name", { ascending: true }),
        ]);

      if (jobsError) throw jobsError;
      if (usersError) throw usersError;

      setJobs(jobsData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error("Error loading media jobs:", error);
      setLoadError(error.message || "Failed to load media conversion jobs.");
      setJobs([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function archiveJob(job) {
    const confirmed = window.confirm(
      `Archive media job ${job.job_number || ""}? It will move out of the active media list but remain retrievable.`
    );
    if (!confirmed) return;

    setArchivingJobId(job.id);

    const { error } = await supabase
      .from("jobs")
      .update({ archived: true })
      .eq("id", job.id);

    setArchivingJobId("");

    if (error) {
      console.error("Archive media job error:", error);
      alert(`Could not archive media job: ${error.message}`);
      return;
    }

    setJobs((prev) => prev.filter((item) => item.id !== job.id));
  }

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !query ||
        [
          job.job_number,
          job.customer,
          job.contact,
          job.email,
          job.phone,
          job.device,
          job.make,
          job.model,
          job.serial_number,
          job.service_type,
          job.project_name,
          job.output_media_type,
          job.issue,
          job.fault,
          job.notes,
          job.assigned_to_name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "All" ? true : (job.status || "Open") === statusFilter;

      const assignedName = job.assigned_to_name || "";
      const matchesAssigned =
        assignedFilter === "All"
          ? true
          : assignedFilter === "Unassigned"
          ? !assignedName
          : assignedName === assignedFilter;

      return matchesSearch && matchesStatus && matchesAssigned;
    });
  }, [jobs, search, statusFilter, assignedFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));

  const paginatedJobs = useMemo(() => {
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredJobs.slice(start, start + PAGE_SIZE);
  }, [filteredJobs, page, totalPages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(["All"]);
    jobs.forEach((job) => statuses.add(job.status || "Open"));
    return Array.from(statuses);
  }, [jobs]);

  const assignedOptions = useMemo(() => {
    const names = new Set(["All", "Unassigned"]);
    users.forEach((user) => {
      if (user.full_name) names.add(user.full_name);
    });
    jobs.forEach((job) => {
      if (job.assigned_to_name) names.add(job.assigned_to_name);
    });
    return Array.from(names);
  }, [users, jobs]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Workshop Hub
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">Media Conversion Jobs</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              View and manage active media conversion bookings separately from standard workshop jobs.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/jobs")}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
            >
              View Standard Jobs
            </button>

            <button
              type="button"
              onClick={() => navigate("/media/new")}
              className="rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90"
            >
              New Media Booking
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Search</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search media jobs"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Assigned</span>
            <select
              value={assignedFilter}
              onChange={(event) => setAssignedFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
            >
              {assignedOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-sm text-slate-400">Visible jobs</div>
            <div className="mt-2 text-3xl font-bold text-white">{filteredJobs.length}</div>
            <div className="mt-1 text-xs text-slate-500">
              Updated {formatDateTime(new Date().toISOString())}
            </div>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-slate-900 p-6 text-rose-200">
          {loadError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
        {loading ? (
          <div className="p-6 text-slate-300">Loading media jobs...</div>
        ) : paginatedJobs.length === 0 ? (
          <div className="p-6 text-slate-400">No active media jobs found.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-800 text-left">
                <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Job</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Output / Items</th>
                    <th className="px-6 py-4">Assigned</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4">Financial</th>
                    <th className="px-6 py-4">Profit</th>
                    <th className="px-6 py-4">Flags</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {paginatedJobs.map((job) => {
                    const age = daysSince(job.created_at);
                    const profit = getProfit(job);
                    const tone = getEngineerTone(job.assigned_to || job.assigned_to_name);
                    const mediaCount = Array.isArray(job.media_items_json)
                      ? job.media_items_json.length
                      : 0;
                    const isArchiving = archivingJobId === job.id;

                    return (
                      <tr
                        key={job.id}
                        className={`cursor-pointer transition ${tone.tableRow}`}
                        onClick={() => navigate(`/media/${job.id}`)}
                      >
                        <td className="px-6 py-4 align-top">
                          <div className="font-semibold text-white">{job.job_number || "—"}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {job.customer || "No customer"}
                          </div>
                          {age !== null && job.status !== "Completed" ? (
                            <div className="mt-1 text-xs text-slate-500">
                              Open for {age} day{age === 1 ? "" : "s"}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="text-white">{job.project_name || "—"}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {job.device || "Media conversion"}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <StatusBadge status={job.status} />
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="text-white">{job.output_media_type || "—"}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {mediaCount} item{mediaCount === 1 ? "" : "s"}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          {job.assigned_to_name ? (
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${tone.pill}`}
                            >
                              {job.assigned_to_name}
                            </span>
                          ) : (
                            <span className="text-slate-500">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="text-white">{formatDate(job.created_at)}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {formatDateTime(job.created_at)}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="text-white">{money(job.price)}</div>
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
                          <div className="mt-1 text-xs text-slate-500">
                            Price - labour - parts
                          </div>
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
                              <FlagBadge tone="slate">Not Collected</FlagBadge>
                            )}

                            <FlagBadge tone="cyan">Media</FlagBadge>
                          </div>
                        </td>

                        <td
                          className="px-6 py-4 align-top"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/media/${job.id}`)}
                              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white transition hover:bg-slate-800"
                            >
                              Open
                            </button>

                            <button
                              type="button"
                              onClick={() => archiveJob(job)}
                              disabled={isArchiving}
                              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-white transition hover:bg-amber-500/20 disabled:opacity-50"
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

            <div className="grid gap-4 p-4 md:hidden">
              {paginatedJobs.map((job) => {
                const age = daysSince(job.created_at);
                const profit = getProfit(job);
                const tone = getEngineerTone(job.assigned_to || job.assigned_to_name);
                const mediaCount = Array.isArray(job.media_items_json)
                  ? job.media_items_json.length
                  : 0;
                const isArchiving = archivingJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className={`rounded-2xl border p-4 transition ${tone.card}`}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/media/${job.id}`)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white">
                            {job.job_number || "—"}
                          </div>
                          <div className="mt-1 text-sm text-slate-400">
                            {job.customer || "No customer"}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {job.project_name || "No project name"}
                          </div>
                        </div>

                        <StatusBadge status={job.status} />
                      </div>

                      <div className="mt-4 grid gap-3 text-sm">
                        <div>
                          <div className="text-slate-500">Output</div>
                          <div className="text-white">{job.output_media_type || "—"}</div>
                        </div>

                        <div>
                          <div className="text-slate-500">Items</div>
                          <div className="text-white">{mediaCount}</div>
                        </div>

                        <div>
                          <div className="text-slate-500">Assigned</div>
                          <div className="text-white">
                            {job.assigned_to_name || "Unassigned"}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-500">Created</div>
                          <div className="text-white">{formatDate(job.created_at)}</div>
                        </div>

                        <div>
                          <div className="text-slate-500">Price / Profit</div>
                          <div className="text-white">
                            {money(job.price)}{" "}
                            <span className={`${getProfitTone(profit)}`}>
                              ({money(profit)})
                            </span>
                          </div>
                        </div>

                        {age !== null && job.status !== "Completed" ? (
                          <div className="text-xs text-slate-500">
                            Open for {age} day{age === 1 ? "" : "s"}
                          </div>
                        ) : null}
                      </div>
                    </button>

                    <div className="mt-4 flex flex-wrap gap-2">
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
                        <FlagBadge tone="slate">Not Collected</FlagBadge>
                      )}

                      <FlagBadge tone="cyan">Media</FlagBadge>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/media/${job.id}`)}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white transition hover:bg-slate-800"
                      >
                        Open
                      </button>

                      <button
                        type="button"
                        onClick={() => archiveJob(job)}
                        disabled={isArchiving}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-white transition hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        {isArchiving ? "Archiving..." : "Archive"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-400">
                Showing {paginatedJobs.length} of {filteredJobs.length} media jobs
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="text-sm text-slate-300">
                  Page {Math.min(page, totalPages)} of {totalPages}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}