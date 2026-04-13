import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching dashboard jobs:", error);
      alert(`Error loading dashboard: ${error.message}`);
      setLoading(false);
      return;
    }

    setJobs(data || []);
    setLoading(false);
  }

  function isDonated(job) {
    return Boolean(job.donated) || job.service_type === "Donated Item";
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") return "£0.00";
    return `£${Number(value).toFixed(2)}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString();
  }

  function statusBadgeClass(status) {
    const map = {
      Open: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      "In Progress": "bg-amber-500/15 text-amber-300 border-amber-500/30",
      "Waiting Parts": "bg-orange-500/15 text-orange-300 border-orange-500/30",
      "Ready for Collection": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      Completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    };

    return map[status] || "bg-slate-700/40 text-slate-200 border-slate-600";
  }

  function financeBadge(job) {
    if (isDonated(job)) {
      return {
        text: "Donated",
        cls: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30",
      };
    }

    return job.paid
      ? {
          text: "Paid",
          cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        }
      : {
          text: "Unpaid",
          cls: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        };
  }

  const metrics = useMemo(() => {
    const total = jobs.length;
    const open = jobs.filter((j) => j.status === "Open").length;
    const inProgress = jobs.filter((j) => j.status === "In Progress").length;
    const waitingParts = jobs.filter((j) => j.status === "Waiting Parts").length;
    const readyForCollection = jobs.filter(
      (j) => j.status === "Ready for Collection"
    ).length;
    const completed = jobs.filter((j) => j.status === "Completed").length;
    const collected = jobs.filter((j) => Boolean(j.collected)).length;
    const donated = jobs.filter((j) => isDonated(j)).length;
    const paidJobs = jobs.filter((j) => !isDonated(j) && Boolean(j.paid)).length;
    const unpaidJobs = jobs.filter((j) => !isDonated(j) && !Boolean(j.paid)).length;

    const paidValue = jobs
      .filter((j) => !isDonated(j) && Boolean(j.paid))
      .reduce((sum, job) => sum + Number(job.price || 0), 0);

    const unpaidValue = jobs
      .filter((j) => !isDonated(j) && !Boolean(j.paid))
      .reduce((sum, job) => sum + Number(job.price || 0), 0);

    return {
      total,
      open,
      inProgress,
      waitingParts,
      readyForCollection,
      completed,
      collected,
      donated,
      paidJobs,
      unpaidJobs,
      paidValue,
      unpaidValue,
    };
  }, [jobs]);

  const recentJobs = jobs.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
              Workshop Overview
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Live overview of workshop jobs, donation items, payment status, and what needs attention next.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/create"
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90"
            >
              + New Job
            </Link>

            <Link
              to="/jobs"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              View All Jobs
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Total Jobs" value={metrics.total} />
        <MetricCard label="Open" value={metrics.open} />
        <MetricCard label="In Progress" value={metrics.inProgress} />
        <MetricCard label="Waiting Parts" value={metrics.waitingParts} />
        <MetricCard label="Ready for Collection" value={metrics.readyForCollection} />
        <MetricCard label="Collected" value={metrics.collected} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Completed" value={metrics.completed} />
        <MetricCard label="Paid Jobs" value={metrics.paidJobs} />
        <MetricCard label="Unpaid Jobs" value={metrics.unpaidJobs} />
        <MetricCard label="Donated Items" value={metrics.donated} highlight />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Recent Jobs</h2>
              <p className="mt-1 text-sm text-slate-400">
                Most recently created or updated jobs in the system.
              </p>
            </div>

            <Link to="/jobs" className="text-sm text-blue-400 hover:underline">
              Open Jobs →
            </Link>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">
              Loading dashboard...
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">
              No jobs yet — create your first job to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job) => {
                const donated = isDonated(job);
                const finance = financeBadge(job);

                return (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className={`block rounded-2xl border p-4 transition ${
                      donated
                        ? "border-fuchsia-500/30 bg-gradient-to-br from-slate-950 to-fuchsia-950/30 hover:border-fuchsia-400"
                        : "border-slate-800 bg-slate-950 hover:border-blue-500 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          {job.job_number || "Job"}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {job.customer || "Unnamed customer"}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          {job.device || "No device listed"}
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm text-slate-300">
                          {job.issue || "No issue description"}
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          Created: {formatDate(job.created_at)}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 lg:items-end">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusBadgeClass(job.status)}`}
                        >
                          {job.status || "Open"}
                        </span>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs ${finance.cls}`}
                        >
                          {finance.text}
                        </span>

                        {donated ? (
                          <span className="inline-flex rounded-full border border-fuchsia-500/30 bg-fuchsia-500/15 px-3 py-1 text-xs text-fuchsia-200">
                            Donated Item
                          </span>
                        ) : null}

                        <div className="text-sm font-medium text-white">
                          {formatPrice(donated ? 0 : job.price)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Payment Snapshot</h2>
            <p className="mt-1 text-sm text-slate-400">
              Quick view of paid and unpaid repair work value.
            </p>

            <div className="mt-5 space-y-4">
              <SnapshotCard
                label="Paid Value"
                value={formatPrice(metrics.paidValue)}
                tone="paid"
              />
              <SnapshotCard
                label="Unpaid Value"
                value={formatPrice(metrics.unpaidValue)}
                tone="unpaid"
              />
              <SnapshotCard
                label="Donated Items"
                value={String(metrics.donated)}
                tone="donated"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Priority Queue</h2>
            <p className="mt-1 text-sm text-slate-400">
              Jobs most likely to need action soon.
            </p>

            <div className="mt-5 space-y-3">
              <PriorityRow label="Ready for Collection" value={metrics.readyForCollection} tone="cyan" />
              <PriorityRow label="Waiting Parts" value={metrics.waitingParts} tone="orange" />
              <PriorityRow label="In Progress" value={metrics.inProgress} tone="amber" />
              <PriorityRow label="Unpaid Jobs" value={metrics.unpaidJobs} tone="rose" />
              <PriorityRow label="Donated Items" value={metrics.donated} tone="fuchsia" />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
            <div className="mt-5 grid gap-3">
              <Link
                to="/create"
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
              >
                Create New Job
              </Link>
              <Link
                to="/jobs"
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
              >
                Open Jobs List
              </Link>
              <Link
                to="/admin/settings"
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
              >
                Open Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, highlight = false }) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-xl ${
        highlight
          ? "border-fuchsia-500/30 bg-gradient-to-br from-slate-900 to-fuchsia-950/30"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className={`text-sm ${highlight ? "text-fuchsia-300" : "text-slate-400"}`}>
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function SnapshotCard({ label, value, tone }) {
  const toneClass =
    tone === "paid"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : tone === "unpaid"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
      : "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-sm">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function PriorityRow({ label, value, tone }) {
  const tones = {
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
  };

  return (
    <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <span className="text-sm">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}