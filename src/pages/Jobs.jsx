import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const statusOptions = [
  "All",
  "Open",
  "In Progress",
  "Waiting Parts",
  "Ready for Collection",
  "Completed",
];

const paymentOptions = ["All", "Paid", "Unpaid", "Donated"];

const serviceOptions = [
  "All",
  "Virus Removal",
  "Data Recovery",
  "Hardware Repair",
  "Networking",
  "Software Support",
  "General Drop-in",
  "Donated Item",
];

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");

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
      console.error("Error fetching jobs:", error);
      alert(`Error loading jobs: ${error.message}`);
      setLoading(false);
      return;
    }

    setJobs(data || []);
    setLoading(false);
  }

  function isDonated(job) {
    return Boolean(job.donated) || job.service_type === "Donated Item";
  }

  function formatPrice(value, donated = false) {
    if (donated) return "£0.00";
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

  function paymentBadgeClass(job) {
    if (isDonated(job)) {
      return "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30";
    }

    return job.paid
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : "bg-rose-500/15 text-rose-300 border-rose-500/30";
  }

  function paymentBadgeText(job) {
    if (isDonated(job)) return "Donated";
    return job.paid ? "Paid" : "Unpaid";
  }

  function collectedBadgeClass(collected) {
    return collected
      ? "bg-cyan-500/15 text-cyan-200 border-cyan-500/30"
      : "bg-slate-700/40 text-slate-200 border-slate-600";
  }

  function collectedBadgeText(collected) {
    return collected ? "Collected" : "Not Collected";
  }

  function serviceBadgeClass(serviceType) {
    if (serviceType === "Donated Item") {
      return "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30";
    }

    return "bg-slate-700/40 text-slate-200 border-slate-600";
  }

  function cardClass(job) {
    if (isDonated(job)) {
      return [
        "group rounded-3xl border p-5 shadow-xl transition-all",
        "border-fuchsia-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-fuchsia-950/40",
        "hover:border-fuchsia-400 hover:shadow-fuchsia-900/20",
      ].join(" ");
    }

    return [
      "group rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl transition-all",
      "hover:border-blue-500 hover:shadow-blue-900/20",
    ].join(" ");
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const search = searchTerm.trim().toLowerCase();

      const searchableText = [
        job.job_number,
        job.customer,
        job.contact,
        job.device,
        job.model,
        job.serial_number,
        job.asset_tag,
        job.issue,
        job.service_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || searchableText.includes(search);

      const matchesStatus =
        statusFilter === "All" || (job.status || "Open") === statusFilter;

      const matchesPayment =
        paymentFilter === "All" ||
        (paymentFilter === "Paid" && !isDonated(job) && Boolean(job.paid)) ||
        (paymentFilter === "Unpaid" && !isDonated(job) && !Boolean(job.paid)) ||
        (paymentFilter === "Donated" && isDonated(job));

      const matchesService =
        serviceFilter === "All" ||
        (job.service_type || "Uncategorised") === serviceFilter;

      return matchesSearch && matchesStatus && matchesPayment && matchesService;
    });
  }, [jobs, searchTerm, statusFilter, paymentFilter, serviceFilter]);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      open: jobs.filter((j) => j.status === "Open").length,
      progress: jobs.filter((j) => j.status === "In Progress").length,
      waiting: jobs.filter((j) => j.status === "Waiting Parts").length,
      ready: jobs.filter((j) => j.status === "Ready for Collection").length,
      unpaid: jobs.filter((j) => !isDonated(j) && !j.paid).length,
      donated: jobs.filter((j) => isDonated(j)).length,
      collected: jobs.filter((j) => Boolean(j.collected)).length,
    };
  }, [jobs]);

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("All");
    setPaymentFilter("All");
    setServiceFilter("All");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
              Workshop Queue
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">Jobs</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Search, filter, and manage workshop, drop-in, and donated-item jobs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/create"
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-medium text-white shadow-lg hover:opacity-90"
            >
              + New Job
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
        <StatCard label="Total Jobs" value={stats.total} />
        <StatCard label="Open" value={stats.open} />
        <StatCard label="In Progress" value={stats.progress} />
        <StatCard label="Waiting Parts" value={stats.waiting} />
        <StatCard label="Ready to Collect" value={stats.ready} />
        <StatCard label="Collected" value={stats.collected} />
        <StatCard label="Unpaid" value={stats.unpaid} />
        <StatCard label="Donated Items" value={stats.donated} highlight />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm text-slate-400">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by job no, customer, device, model, serial, issue..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Payment / Donation</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              {paymentOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Service Type</label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              {serviceOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="xl:col-span-3 flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Showing <span className="font-semibold text-white">{filteredJobs.length}</span> of{" "}
          <span className="font-semibold text-white">{jobs.length}</span> jobs
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
          Loading jobs...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
          No jobs match your current filters.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((job) => {
            const donated = isDonated(job);

            return (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className={cardClass(job)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Job Number
                    </div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {job.job_number || "—"}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusBadgeClass(job.status)}`}
                    >
                      {job.status || "Open"}
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs ${paymentBadgeClass(job)}`}
                    >
                      {paymentBadgeText(job)}
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs ${collectedBadgeClass(job.collected)}`}
                    >
                      {collectedBadgeText(job.collected)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs ${serviceBadgeClass(
                      job.service_type
                    )}`}
                  >
                    {job.service_type || "Uncategorised"}
                  </span>

                  {donated ? (
                    <span className="inline-flex rounded-full border border-fuchsia-500/30 bg-fuchsia-500/15 px-3 py-1 text-xs text-fuchsia-200">
                      Donated
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3">
                  <InfoBlock label="Customer" value={job.customer || "—"} />
                  <InfoBlock label="Device" value={job.device || "—"} />
                  <InfoBlock label="Model" value={job.model || "—"} />
                  <InfoBlock label="Serial No." value={job.serial_number || "—"} />
                  <InfoBlock label="Type" value={job.service_type || job.Type || "—"} />
                  <InfoBlock label="Price" value={formatPrice(job.price, donated)} />
                </div>

                <div className="mt-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Issue
                  </div>
                  <div className="mt-1 line-clamp-3 text-sm text-slate-300">
                    {job.issue || "No issue description"}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{formatDate(job.created_at)}</span>
                  <span className={donated ? "text-fuchsia-300 group-hover:underline" : "text-blue-400 group-hover:underline"}>
                    Open Job →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight = false }) {
  return (
    <div
      className={[
        "rounded-3xl border p-5 shadow-xl",
        highlight
          ? "border-fuchsia-500/30 bg-gradient-to-br from-slate-900 to-fuchsia-950/30"
          : "border-slate-800 bg-slate-900",
      ].join(" ")}
    >
      <div className={`text-sm ${highlight ? "text-fuchsia-300" : "text-slate-400"}`}>
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-white">{value || "—"}</div>
    </div>
  );
}