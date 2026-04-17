import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

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

function daysBetween(start, end) {
  if (!start || !end) return null;
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function numberValue(value) {
  const num = Number(value || 0);
  return Number.isNaN(num) ? 0 : num;
}

function money(value) {
  const num = numberValue(value);
  return `£${num.toFixed(2)}`;
}

function getProfit(job) {
  return (
    numberValue(job.price) -
    numberValue(job.labour_cost) -
    numberValue(job.parts_cost)
  );
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

function SummaryCard({ title, value, onClick, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-left shadow-xl transition hover:bg-slate-800/60"
    >
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
    </button>
  );
}

function MoneyCard({ title, value, subtitle, valueClassName = "text-white" }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
      <div className="text-sm text-slate-400">{title}</div>
      <div className={`mt-2 break-words text-3xl font-bold ${valueClassName}`}>
        {money(value)}
      </div>
      {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

function TinyStatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
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

function RangeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-950 text-slate-300 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      <div className="mt-4 h-80">{children}</div>
    </div>
  );
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function isInSelectedRange(dateValue, range) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  if (range === "all") return true;
  if (range === "today") return date >= startOfToday();

  if (range === "7d") {
    const since = new Date(now);
    since.setDate(now.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    return date >= since;
  }

  if (range === "30d") {
    const since = new Date(now);
    since.setDate(now.getDate() - 29);
    since.setHours(0, 0, 0, 0);
    return date >= since;
  }

  if (range === "month") {
    return date >= startOfMonth();
  }

  return true;
}

function getRangeLabel(range) {
  switch (range) {
    case "today":
      return "Today";
    case "7d":
      return "Last 7 Days";
    case "30d":
      return "Last 30 Days";
    case "month":
      return "This Month";
    default:
      return "All Time";
  }
}

function buildDailyCreatedSeries(jobs, days = 7) {
  const today = new Date();
  const buckets = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const key = d.toISOString().slice(0, 10);
    buckets.push({
      key,
      label: d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      bookings: 0,
      completed: 0,
    });
  }

  const lookup = new Map(buckets.map((item) => [item.key, item]));

  jobs.forEach((job) => {
    if (job.created_at) {
      const created = new Date(job.created_at);
      if (!Number.isNaN(created.getTime())) {
        const bucketDate = new Date(
          created.getFullYear(),
          created.getMonth(),
          created.getDate()
        );
        const key = bucketDate.toISOString().slice(0, 10);
        const bucket = lookup.get(key);
        if (bucket) bucket.bookings += 1;
      }
    }

    if (job.completed_at) {
      const completed = new Date(job.completed_at);
      if (!Number.isNaN(completed.getTime())) {
        const bucketDate = new Date(
          completed.getFullYear(),
          completed.getMonth(),
          completed.getDate()
        );
        const key = bucketDate.toISOString().slice(0, 10);
        const bucket = lookup.get(key);
        if (bucket) bucket.completed += 1;
      }
    }
  });

  return buckets;
}

const PIE_COLOURS = ["#475569", "#2563eb", "#f59e0b", "#10b981", "#8b5cf6"];
const PAYMENT_COLOURS = ["#10b981", "#f59e0b", "#8b5cf6"];

export default function Dashboard() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [timeRange, setTimeRange] = useState("7d");

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
        contact,
        email,
        phone,
        device,
        make,
        model,
        serial_number,
        asset_tag,
        service_type,
        project_name,
        output_media_type,
        media_items_json,
        job_type,
        fault,
        issue,
        status,
        assigned_to,
        assigned_to_name,
        price,
        labour_cost,
        parts_cost,
        paid,
        donated,
        collected,
        parts_used,
        parts_json,
        ready_at,
        completed_at,
        collected_at,
        paid_at,
        status_changed_at,
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
      inProgress: jobs.filter((j) => j.status === "In Progress").length,
      waitingParts: jobs.filter((j) => j.status === "Waiting Parts").length,
      ready: jobs.filter((j) => j.status === "Ready for Collection").length,
      completed: jobs.filter((j) => j.status === "Completed").length,
      unpaid: jobs.filter((j) => !j.paid && !j.donated).length,
      uncollected: jobs.filter((j) => !j.collected).length,
      unassigned: jobs.filter((j) => !j.assigned_to).length,
    };
  }, [jobs]);


  const mediaJobs = useMemo(() => {
    return jobs.filter((job) => job.job_type === "media_conversion");
  }, [jobs]);

  const mediaStats = useMemo(() => {
    return {
      total: mediaJobs.length,
      open: mediaJobs.filter((j) => j.status === "Open").length,
      inProgress: mediaJobs.filter((j) => j.status === "In Progress").length,
      waitingParts: mediaJobs.filter((j) => j.status === "Waiting Parts").length,
      ready: mediaJobs.filter((j) => j.status === "Ready for Collection").length,
      completed: mediaJobs.filter((j) => j.status === "Completed").length,
      unpaid: mediaJobs.filter((j) => !j.paid && !j.donated).length,
      uncollected: mediaJobs.filter((j) => !j.collected).length,
    };
  }, [mediaJobs]);

  const recentMediaJobs = useMemo(() => {
    return mediaJobs.slice(0, 5);
  }, [mediaJobs]);

  const financials = useMemo(() => {
    const totalQuoted = jobs.reduce((sum, job) => sum + numberValue(job.price), 0);
    const totalLabour = jobs.reduce((sum, job) => sum + numberValue(job.labour_cost), 0);
    const totalParts = jobs.reduce((sum, job) => sum + numberValue(job.parts_cost), 0);
    const totalProfit = jobs.reduce((sum, job) => sum + getProfit(job), 0);

    const unpaidValue = jobs.reduce((sum, job) => {
      if (job.donated) return sum;
      if (job.paid) return sum;
      return sum + numberValue(job.price);
    }, 0);

    const paidValue = jobs.reduce((sum, job) => {
      if (job.donated || !job.paid) return sum;
      return sum + numberValue(job.price);
    }, 0);

    const collectedValue = jobs.reduce((sum, job) => {
      if (!job.collected || job.donated) return sum;
      return sum + numberValue(job.price);
    }, 0);

    const donatedCount = jobs.filter((job) => job.donated).length;

    return {
      totalQuoted,
      totalLabour,
      totalParts,
      totalProfit,
      unpaidValue,
      paidValue,
      collectedValue,
      donatedCount,
    };
  }, [jobs]);

  const timeStats = useMemo(() => {
    const createdInRange = jobs.filter((job) =>
      isInSelectedRange(job.created_at, timeRange)
    );

    const completedInRange = jobs.filter((job) =>
      isInSelectedRange(job.completed_at, timeRange)
    );

    const readyInRange = jobs.filter((job) =>
      isInSelectedRange(job.ready_at, timeRange)
    );

    const paidInRange = jobs.filter((job) =>
      isInSelectedRange(job.paid_at, timeRange)
    );

    const collectedInRange = jobs.filter((job) =>
      isInSelectedRange(job.collected_at, timeRange)
    );

    const statusChangedInRange = jobs.filter((job) =>
      isInSelectedRange(
        job.status_changed_at || job.updated_at || job.created_at,
        timeRange
      )
    );

    const quotedValue = createdInRange.reduce(
      (sum, job) => sum + numberValue(job.price),
      0
    );

    const labourValue = createdInRange.reduce(
      (sum, job) => sum + numberValue(job.labour_cost),
      0
    );

    const partsValue = createdInRange.reduce(
      (sum, job) => sum + numberValue(job.parts_cost),
      0
    );

    const profitValue = createdInRange.reduce(
      (sum, job) => sum + getProfit(job),
      0
    );

    const paidValue = paidInRange.reduce((sum, job) => {
      if (job.donated) return sum;
      return sum + numberValue(job.price);
    }, 0);

    const unpaidValue = jobs.reduce((sum, job) => {
      if (job.donated || job.paid) return sum;
      if (!isInSelectedRange(job.created_at, timeRange)) return sum;
      return sum + numberValue(job.price);
    }, 0);

    return {
      createdCount: createdInRange.length,
      completedCount: completedInRange.length,
      readyCount: readyInRange.length,
      paidCount: paidInRange.length,
      collectedCount: collectedInRange.length,
      waitingPartsCount: statusChangedInRange.filter(
        (j) => j.status === "Waiting Parts"
      ).length,
      unassignedCount: statusChangedInRange.filter((j) => !j.assigned_to).length,
      quotedValue,
      labourValue,
      partsValue,
      profitValue,
      paidValue,
      unpaidValue,
    };
  }, [jobs, timeRange]);

  const turnaroundStats = useMemo(() => {
    const completedJobs = jobs.filter((j) => j.completed_at);

    const turnaroundTimes = completedJobs
      .map((j) => daysBetween(j.created_at, j.completed_at))
      .filter((d) => d !== null);

    const avgTurnaround =
      turnaroundTimes.length > 0
        ? turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length
        : 0;

    const longest =
      turnaroundTimes.length > 0 ? Math.max(...turnaroundTimes) : 0;

    const shortest =
      turnaroundTimes.length > 0 ? Math.min(...turnaroundTimes) : 0;

    const collectionTimes = jobs
      .filter((j) => j.completed_at && j.collected_at)
      .map((j) => daysBetween(j.completed_at, j.collected_at))
      .filter((d) => d !== null);

    const avgCollectionDelay =
      collectionTimes.length > 0
        ? collectionTimes.reduce((a, b) => a + b, 0) / collectionTimes.length
        : 0;

    return {
      avg: avgTurnaround.toFixed(1),
      longest,
      shortest,
      totalMeasured: turnaroundTimes.length,
      avgCollectionDelay: avgCollectionDelay.toFixed(1),
    };
  }, [jobs]);

  const engineerStats = useMemo(() => {
    const map = {};

    jobs.forEach((job) => {
      if (!job.assigned_to_name) return;

      if (!map[job.assigned_to_name]) {
        map[job.assigned_to_name] = {
          jobs: 0,
          completed: 0,
          profit: 0,
          turnaround: [],
          paidValue: 0,
        };
      }

      const eng = map[job.assigned_to_name];

      eng.jobs++;

      if (job.status === "Completed") {
        eng.completed++;
        eng.profit += getProfit(job);

        const t = daysBetween(job.created_at, job.completed_at);
        if (t !== null) eng.turnaround.push(t);
      }

      if (job.paid && !job.donated) {
        eng.paidValue += numberValue(job.price);
      }
    });

    return Object.entries(map)
      .map(([name, data]) => {
        const avgTurnaround =
          data.turnaround.length > 0
            ? (
                data.turnaround.reduce((a, b) => a + b, 0) /
                data.turnaround.length
              ).toFixed(1)
            : "—";

        return {
          name,
          ...data,
          avgTurnaround,
        };
      })
      .sort((a, b) => b.completed - a.completed || b.profit - a.profit);
  }, [jobs]);

  const statusChartData = useMemo(() => {
    return [
      { name: "Open", value: stats.open },
      { name: "In Progress", value: stats.inProgress },
      { name: "Waiting Parts", value: stats.waitingParts },
      { name: "Ready", value: stats.ready },
      { name: "Completed", value: stats.completed },
    ];
  }, [stats]);

  const paymentChartData = useMemo(() => {
    return [
      { name: "Paid", value: jobs.filter((j) => j.paid && !j.donated).length },
      { name: "Unpaid", value: jobs.filter((j) => !j.paid && !j.donated).length },
      { name: "Donated", value: jobs.filter((j) => j.donated).length },
    ];
  }, [jobs]);

  const engineerBarData = useMemo(() => {
    return engineerStats.slice(0, 8).map((eng) => ({
      name: eng.name,
      jobs: eng.jobs,
      completed: eng.completed,
      profit: Number(eng.profit.toFixed(2)),
    }));
  }, [engineerStats]);

  const rangeStatusBreakdown = useMemo(() => {
    const base = {
      Open: 0,
      "In Progress": 0,
      "Waiting Parts": 0,
      "Ready for Collection": 0,
      Completed: 0,
    };

    jobs.forEach((job) => {
      const relevantDate =
        job.status === "Completed"
          ? job.completed_at
          : job.status === "Ready for Collection"
          ? job.ready_at
          : job.status_changed_at || job.updated_at || job.created_at;

      if (base[job.status] !== undefined && isInSelectedRange(relevantDate, timeRange)) {
        base[job.status] += 1;
      }
    });

    return Object.entries(base);
  }, [jobs, timeRange]);

  const bookingsTrendData = useMemo(() => {
    const sourceJobs =
      timeRange === "all"
        ? jobs
        : jobs.filter(
            (job) =>
              isInSelectedRange(job.created_at, timeRange) ||
              isInSelectedRange(job.completed_at, timeRange)
          );

    const days =
      timeRange === "today"
        ? 1
        : timeRange === "7d"
        ? 7
        : timeRange === "30d"
        ? 30
        : timeRange === "month"
        ? 31
        : 45;

    return buildDailyCreatedSeries(sourceJobs, days);
  }, [jobs, timeRange]);

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
              Live overview of workshop activity, priorities, performance, and trends.
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

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Time-Based Analytics</h2>
            <p className="mt-1 text-sm text-slate-400">
              Filter insights by period using the milestone timestamps.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <RangeButton active={timeRange === "today"} onClick={() => setTimeRange("today")}>
              Today
            </RangeButton>
            <RangeButton active={timeRange === "7d"} onClick={() => setTimeRange("7d")}>
              Last 7 Days
            </RangeButton>
            <RangeButton active={timeRange === "30d"} onClick={() => setTimeRange("30d")}>
              Last 30 Days
            </RangeButton>
            <RangeButton active={timeRange === "month"} onClick={() => setTimeRange("month")}>
              This Month
            </RangeButton>
            <RangeButton active={timeRange === "all"} onClick={() => setTimeRange("all")}>
              All Time
            </RangeButton>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <TinyStatCard
            title={`Jobs Created (${getRangeLabel(timeRange)})`}
            value={timeStats.createdCount}
          />
          <TinyStatCard
            title={`Completed (${getRangeLabel(timeRange)})`}
            value={timeStats.completedCount}
          />
          <TinyStatCard
            title={`Ready (${getRangeLabel(timeRange)})`}
            value={timeStats.readyCount}
          />
          <TinyStatCard
            title={`Paid (${getRangeLabel(timeRange)})`}
            value={timeStats.paidCount}
          />
          <TinyStatCard
            title={`Collected (${getRangeLabel(timeRange)})`}
            value={timeStats.collectedCount}
          />
          <TinyStatCard
            title={`Unassigned (${getRangeLabel(timeRange)})`}
            value={timeStats.unassignedCount}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MoneyCard title={`Quoted (${getRangeLabel(timeRange)})`} value={timeStats.quotedValue} />
          <MoneyCard title={`Labour (${getRangeLabel(timeRange)})`} value={timeStats.labourValue} />
          <MoneyCard title={`Parts (${getRangeLabel(timeRange)})`} value={timeStats.partsValue} />
          <MoneyCard
            title={`Profit (${getRangeLabel(timeRange)})`}
            value={timeStats.profitValue}
            valueClassName={
              timeStats.profitValue > 0
                ? "text-emerald-300"
                : timeStats.profitValue < 0
                ? "text-rose-300"
                : "text-white"
            }
          />
          <MoneyCard title={`Paid (${getRangeLabel(timeRange)})`} value={timeStats.paidValue} />
          <MoneyCard title={`Unpaid (${getRangeLabel(timeRange)})`} value={timeStats.unpaidValue} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Job Bookings Trend"
          subtitle="Shows rises and falls in bookings, with completions alongside them."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bookingsTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="bookings" stroke="#2563eb" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Status Mix"
          subtitle="Quick visual split of current job statuses."
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusChartData}
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                label
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLOURS[index % PIE_COLOURS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Engineer Workload"
          subtitle="Assigned jobs and completed jobs by engineer."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={engineerBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
              <Legend />
              <Bar dataKey="jobs" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Payment Mix"
          subtitle="Paid, unpaid, and donated jobs at a glance."
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentChartData}
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                label
              >
                {paymentChartData.map((entry, index) => (
                  <Cell key={entry.name} fill={PAYMENT_COLOURS[index % PAYMENT_COLOURS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Turnaround Analytics</h2>
        <p className="mt-1 text-sm text-slate-400">
          Based on jobs with milestone timestamps.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <TinyStatCard title="Average Days to Complete" value={turnaroundStats.avg} />
          <TinyStatCard title="Fastest Job (days)" value={turnaroundStats.shortest} />
          <TinyStatCard title="Slowest Job (days)" value={turnaroundStats.longest} />
          <TinyStatCard title="Jobs Measured" value={turnaroundStats.totalMeasured} />
          <TinyStatCard title="Avg Days to Collect" value={turnaroundStats.avgCollectionDelay} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Engineer Performance</h2>
        <p className="mt-1 text-sm text-slate-400">
          Completed jobs, profit contribution, paid value, and average turnaround.
        </p>

        {engineerStats.length === 0 ? (
          <div className="mt-4 text-slate-400">No engineer data yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {engineerStats.map((eng) => (
              <div
                key={eng.name}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium text-white">{eng.name}</div>
                  <div className="text-sm text-slate-400">
                    {eng.completed} completed
                  </div>
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-5 text-sm">
                  <div>
                    <div className="text-slate-500">Assigned Jobs</div>
                    <div className="text-white">{eng.jobs}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Completed</div>
                    <div className="text-white">{eng.completed}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Profit</div>
                    <div className="text-white">{money(eng.profit)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Paid Value</div>
                    <div className="text-white">{money(eng.paidValue)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Avg Days</div>
                    <div className="text-white">{eng.avgTurnaround}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <SummaryCard title="Total Jobs" value={stats.total} onClick={() => navigate("/jobs")} />
        <SummaryCard title="Open" value={stats.open} onClick={() => navigate("/jobs")} />
        <SummaryCard
          title="In Progress"
          value={stats.inProgress}
          onClick={() => navigate("/jobs")}
        />
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
        <SummaryCard
          title="Completed"
          value={stats.completed}
          onClick={() => navigate("/jobs")}
        />
        <SummaryCard title="Unpaid" value={stats.unpaid} onClick={() => navigate("/jobs")} />
        <SummaryCard
          title="Unassigned"
          value={stats.unassigned}
          subtitle={stats.uncollected ? `${stats.uncollected} not collected` : undefined}
          onClick={() => navigate("/jobs")}
        />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Financial Overview</h2>
        <p className="mt-1 text-sm text-slate-400">
          Live totals across quoted, labour, parts, unpaid value, and estimated profit.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MoneyCard title="Total Quoted Value" value={financials.totalQuoted} />
          <MoneyCard title="Total Labour Value" value={financials.totalLabour} />
          <MoneyCard title="Total Parts Value" value={financials.totalParts} />
          <MoneyCard
            title="Estimated Profit"
            value={financials.totalProfit}
            subtitle="Quoted - labour - parts"
            valueClassName={
              financials.totalProfit > 0
                ? "text-emerald-300"
                : financials.totalProfit < 0
                ? "text-rose-300"
                : "text-white"
            }
          />
          <MoneyCard title="Outstanding Unpaid" value={financials.unpaidValue} />
          <MoneyCard title="Paid Value" value={financials.paidValue} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MoneyCard title="Collected Value" value={financials.collectedValue} />
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
            <div className="text-sm text-slate-400">Donated Jobs</div>
            <div className="mt-2 text-3xl font-bold text-white">
              {financials.donatedCount}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Excluded from unpaid total
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
            <div className="text-sm text-slate-400">Uncollected Jobs</div>
            <div className="mt-2 text-3xl font-bold text-white">
              {stats.uncollected}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Jobs still awaiting collection
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

      <div className="rounded-3xl border border-cyan-500/20 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Media Conversion
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Media Overview</h2>
            <p className="mt-2 text-sm text-slate-400">
              Separate headline figures for media conversion projects.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/media/new")}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90 sm:w-auto"
            >
              + New Media Conversion
            </button>

            <button
              type="button"
              onClick={() => navigate("/media")}
              className="w-full rounded-2xl border border-cyan-500/30 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800 sm:w-auto"
            >
              View Media Jobs
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Media Projects"
            value={mediaStats.total}
            subtitle={`${mediaStats.unpaid} unpaid • ${mediaStats.uncollected} not collected`}
            onClick={() => navigate("/media")}
          />
          <SummaryCard
            title="Open Media"
            value={mediaStats.open}
            onClick={() => navigate("/media")}
          />
          <SummaryCard
            title="Ready for Collection"
            value={mediaStats.ready}
            onClick={() => navigate("/media")}
          />
          <SummaryCard
            title="Completed Media"
            value={mediaStats.completed}
            onClick={() => navigate("/media")}
          />
        </div>

        <div className="mt-6 grid gap-3">
          {recentMediaJobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              No media conversion jobs yet.
            </div>
          ) : (
            recentMediaJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition hover:bg-slate-800"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm text-cyan-400">{job.job_number || "—"}</div>
                    <div className="mt-1 break-words font-medium text-white">
                      {job.project_name || job.customer || "Media project"}
                    </div>
                    <div className="mt-1 break-words text-sm text-slate-400">
                      {job.output_media_type || "Output not set"}
                      {Array.isArray(job.media_items_json)
                        ? ` • ${job.media_items_json.length} item${job.media_items_json.length === 1 ? "" : "s"}`
                        : ""}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <StatusBadge status={job.status} />
                    <div className="text-xs text-slate-500">
                      Updated {formatDateTime(job.updated_at || job.created_at)}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
        <p className="mt-1 text-sm text-slate-400">
          Fast access to the most common workflow actions.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
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

          <button
            type="button"
            onClick={() => navigate("/media/new")}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-left hover:bg-slate-800"
          >
            <div className="font-medium text-white">Create Media Booking</div>
            <div className="mt-1 text-sm text-slate-400">
              Book in tapes, discs, film, audio, or digital transfer work.
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/media")}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-left hover:bg-slate-800"
          >
            <div className="font-medium text-white">View Media Jobs</div>
            <div className="mt-1 text-sm text-slate-400">
              Open the dedicated media conversion jobs page.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}