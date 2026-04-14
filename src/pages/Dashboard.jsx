import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function money(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "£0.00";
  return `£${num.toFixed(2)}`;
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

function SummaryCard({ title, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-left shadow-xl transition hover:bg-slate-800/60"
    >
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </button>
  );
}

function MoneyCard({ title, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 break-words text-3xl font-bold text-white">
        {money(value)}
      </div>
      {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

function JobListCard({
  title,
  subtitle,
  jobs,
  onOpenJob,
  emptyText = "No jobs to show.",
  showAge = false,
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}

      {jobs.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
          {emptyText}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {jobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => onOpenJob(job.id)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition hover:bg-slate-800"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm text-blue-400">{job.job_number || "—"}</div>
                  <div className="mt-1 break-words font-medium text-white">
                    {job.customer || "No customer"}
                  </div>
                  <div className="mt-1 break-words text-sm text-slate-400">
                    {job.device || "No device"}
                    {job.assigned_to_name ? ` • ${job.assigned_to_name}` : " • Unassigned"}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <StatusBadge status={job.status} />
                  <div className="text-xs text-slate-500">
                    Updated {formatDateTime(job.updated_at || job.created_at)}
                  </div>
                  {showAge && typeof job.ageDays === "number" ? (
                    <div className="text-xs text-amber-300">
                      Open for {job.ageDays} day{job.ageDays === 1 ? "" : "s"}
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        customer,
        device,
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
        updated_at
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading dashboard:", error);
      setLoadError(error.message || "Unknown error");
      setJobs([]);
      setLoading(false);
      return;
    }

    setJobs(data || []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      open: jobs.filter((j) => j.status === "Open").length,
      waitingParts: jobs.filter((j) => j.status === "Waiting Parts").length,
      ready: jobs.filter((j) => j.status === "Ready for Collection").length,
      unpaid: jobs.filter((j) => !j.paid && !j.donated).length,
      uncollected: jobs.filter((j) => !j.collected).length,
    };
  }, [jobs]);

  const financials = useMemo(() => {
    const totalQuoted = jobs.reduce((sum, job) => sum + (Number(job.price) || 0), 0);
    const totalLabour = jobs.reduce((sum, job) => sum + (Number(job.labour_cost) || 0), 0);
    const totalParts = jobs.reduce((sum, job) => sum + (Number(job.parts_cost) || 0), 0);

    const unpaidValue = jobs.reduce((sum, job) => {
      if (job.donated) return sum;
      if (job.paid) return sum;
      return sum + (Number(job.price) || 0);
    }, 0);

    const donatedCount = jobs.filter((job) => job.donated).length;

    return {
      totalQuoted,
      totalLabour,
      totalParts,
      unpaidValue,
      donatedCount,
    };
  }, [jobs]);

  const oldestActiveJobs = useMemo(() => {
    return jobs
      .filter(
        (job) =>
          job.status !== "Completed" &&
          job.status !== "Ready for Collection"
      )
      .map((job) => ({
        ...job,
        ageDays: daysSince(job.created_at) ?? 0,
      }))
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, 5);
  }, [jobs]);

  const recentlyUpdatedJobs = useMemo(() => {
    return [...jobs]
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      )
      .slice(0, 5);
  }, [jobs]);

  const readyForCollectionJobs = useMemo(() => {
    return jobs
      .filter((job) => job.status === "Ready for Collection")
      .slice(0, 5);
  }, [jobs]);

  const unassignedJobs = useMemo(() => {
    return jobs
      .filter((job) => !job.assigned_to)
      .slice(0, 5);
  }, [jobs]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Loading dashboard...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-slate-900 p-6 text-rose-200">
        Could not load dashboard: {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
              Workshop Hub
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-2 text-slate-400">
              Live overview of workshop activity, priorities, and quick actions.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <button
              type="button"
              onClick={() => navigate("/jobs/new")}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 sm:w-auto"
            >
              + Create Job
            </button>

            <button
              type="button"
              onClick={() => navigate("/jobs")}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800 sm:w-auto"
            >
              View All Jobs
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <SummaryCard title="Total Jobs" value={stats.total} onClick={() => navigate("/jobs")} />
        <SummaryCard title="Open" value={stats.open} onClick={() => navigate("/jobs")} />
        <SummaryCard
          title="Waiting Parts"
          value={stats.waitingParts}
          onClick={() => navigate("/jobs")}
        />
        <SummaryCard
          title="Ready for Collection"
          value={stats.ready}
          onClick={() => navigate("/jobs")}
        />
        <SummaryCard title="Unpaid" value={stats.unpaid} onClick={() => navigate("/jobs")} />
        <SummaryCard
          title="Uncollected"
          value={stats.uncollected}
          onClick={() => navigate("/jobs")}
        />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Financial Overview</h2>
        <p className="mt-1 text-sm text-slate-400">
          Live totals across quoted, labour, parts, and unpaid workshop value.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <MoneyCard title="Total Quoted Value" value={financials.totalQuoted} />
          <MoneyCard title="Total Labour Value" value={financials.totalLabour} />
          <MoneyCard title="Total Parts Value" value={financials.totalParts} />
          <MoneyCard title="Outstanding Unpaid" value={financials.unpaidValue} />
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
            <div className="text-sm text-slate-400">Donated Jobs</div>
            <div className="mt-2 text-3xl font-bold text-white">
              {financials.donatedCount}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Excluded from unpaid total
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <JobListCard
          title="Oldest Active Jobs"
          subtitle="Jobs open the longest and most likely to need attention."
          jobs={oldestActiveJobs}
          onOpenJob={(jobId) => navigate(`/jobs/${jobId}`)}
          emptyText="No active jobs to show."
          showAge
        />

        <JobListCard
          title="Recently Updated"
          subtitle="The latest activity across the workshop."
          jobs={recentlyUpdatedJobs}
          onOpenJob={(jobId) => navigate(`/jobs/${jobId}`)}
        />

        <JobListCard
          title="Ready for Collection"
          subtitle="Jobs ready to be handed back to customers."
          jobs={readyForCollectionJobs}
          onOpenJob={(jobId) => navigate(`/jobs/${jobId}`)}
          emptyText="No jobs are ready for collection."
        />

        <JobListCard
          title="Unassigned Jobs"
          subtitle="Jobs that still need assigning to an engineer or user."
          jobs={unassignedJobs}
          onOpenJob={(jobId) => navigate(`/jobs/${jobId}`)}
          emptyText="No unassigned jobs."
        />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
        <p className="mt-1 text-sm text-slate-400">
          Fast access to the most common workflow actions.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => navigate("/jobs/new")}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-left hover:bg-slate-800"
          >
            <div className="font-medium text-white">Create New Job</div>
            <div className="mt-1 text-sm text-slate-400">
              Add a new repair, drop-in, or donated item.
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/jobs")}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-left hover:bg-slate-800"
          >
            <div className="font-medium text-white">View Jobs List</div>
            <div className="mt-1 text-sm text-slate-400">
              Search and manage all workshop jobs.
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/jobs")}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-left hover:bg-slate-800"
          >
            <div className="font-medium text-white">Review Ready Jobs</div>
            <div className="mt-1 text-sm text-slate-400">
              Check items that are ready for collection.
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/jobs")}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-left hover:bg-slate-800"
          >
            <div className="font-medium text-white">Check Unassigned</div>
            <div className="mt-1 text-sm text-slate-400">
              Find jobs that still need allocating.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}