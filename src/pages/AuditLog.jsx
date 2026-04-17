import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const tableOptions = ["All", "jobs", "profiles", "app_settings", "user_invites"];
const actionOptions = ["All", "INSERT", "UPDATE", "DELETE", "INVITE"];
const sourceOptions = ["All", "Live", "Archived"];
const pageSizeOptions = [25, 50, 100, 250];

function readInitialFilters() {
  const params = new URLSearchParams(window.location.search);

  return {
    table: params.get("table") || "All",
    action: params.get("action") || "All",
    source: params.get("source") || "All",
    search: params.get("search") || "",
    record: params.get("record") || "",
  };
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB");
}

function formatLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function actionBadgeClass(action, summary = "") {
  const summaryText = String(summary).toLowerCase();

  if (action === "DELETE") {
    return "border-rose-500/30 bg-rose-500/15 text-rose-200";
  }
  if (action === "INVITE") {
    return "border-cyan-500/30 bg-cyan-500/15 text-cyan-200";
  }
  if (summaryText.includes("role changed")) {
    return "border-violet-500/30 bg-violet-500/15 text-violet-200";
  }
  if (summaryText.includes("disabled") || summaryText.includes("inactive")) {
    return "border-rose-500/30 bg-rose-500/15 text-rose-200";
  }
  if (action === "INSERT") {
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
  }
  if (action === "UPDATE") {
    return "border-amber-500/30 bg-amber-500/15 text-amber-200";
  }
  return "border-slate-600 bg-slate-700/40 text-slate-200";
}

function sourceBadgeClass(isArchived) {
  return isArchived
    ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
    : "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
}

function getVisibleChanges(log) {
  const oldData = log.old_data || {};
  const newData = log.new_data || {};

  if (log.action === "INVITE") {
    return Object.entries(newData).map(([key, value]) => ({
      field: key,
      before: null,
      after: value,
      type: "added",
    }));
  }

  if (log.action === "INSERT") {
    return Object.entries(newData)
      .filter(([, value]) => value !== null && value !== "" && value !== false)
      .slice(0, 8)
      .map(([key, value]) => ({
        field: key,
        before: null,
        after: value,
        type: "added",
      }));
  }

  if (log.action === "DELETE") {
    return Object.entries(oldData)
      .filter(([, value]) => value !== null && value !== "" && value !== false)
      .slice(0, 8)
      .map(([key, value]) => ({
        field: key,
        before: value,
        after: null,
        type: "removed",
      }));
  }

  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));

  return allKeys
    .filter((key) => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]))
    .map((key) => ({
      field: key,
      before: oldData[key],
      after: newData[key],
      type: "changed",
    }))
    .slice(0, 10);
}

function matchesDate(logDateValue, datePreset, dateFrom, dateTo) {
  if (!logDateValue) return true;

  const logDate = new Date(logDateValue);
  const now = new Date();

  if (datePreset === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return logDate >= start;
  }

  if (datePreset === "7days") {
    const start = new Date();
    start.setDate(now.getDate() - 7);
    return logDate >= start;
  }

  if (datePreset === "30days") {
    const start = new Date();
    start.setDate(now.getDate() - 30);
    return logDate >= start;
  }

  if (datePreset === "custom") {
    const fromOk = !dateFrom || logDate >= new Date(`${dateFrom}T00:00:00`);
    const toOk = !dateTo || logDate <= new Date(`${dateTo}T23:59:59`);
    return fromOk && toOk;
  }

  return true;
}

export default function AuditLog() {
  const initialFilters = readInitialFilters();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [tableFilter, setTableFilter] = useState(
    tableOptions.includes(initialFilters.table) ? initialFilters.table : "All"
  );
  const [actionFilter, setActionFilter] = useState(
    actionOptions.includes(initialFilters.action) ? initialFilters.action : "All"
  );
  const [sourceFilter, setSourceFilter] = useState(
    sourceOptions.includes(initialFilters.source) ? initialFilters.source : "All"
  );
  const [searchTerm, setSearchTerm] = useState(initialFilters.search);
  const [recordFilter, setRecordFilter] = useState(initialFilters.record);

  const [datePreset, setDatePreset] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState({});

  const isJobHistoryMode = tableFilter === "jobs" && !!recordFilter.trim();

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();

    if (tableFilter !== "All") params.set("table", tableFilter);
    if (actionFilter !== "All") params.set("action", actionFilter);
    if (sourceFilter !== "All") params.set("source", sourceFilter);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (recordFilter.trim()) params.set("record", recordFilter.trim());

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, [tableFilter, actionFilter, sourceFilter, searchTerm, recordFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tableFilter, actionFilter, sourceFilter, searchTerm, recordFilter, datePreset, dateFrom, dateTo, pageSize]);

  async function loadLogs() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("audit_logs_all")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (error) {
      console.error("Error loading audit logs:", error);
      setMessage(`Could not load audit log: ${error.message}`);
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesTable = tableFilter === "All" || log.table_name === tableFilter;

      const matchesAction = actionFilter === "All" || log.action === actionFilter;

      const matchesSource =
        sourceFilter === "All" ||
        (sourceFilter === "Live" && !log.is_archived) ||
        (sourceFilter === "Archived" && !!log.is_archived);

      const matchesRecord =
        !recordFilter.trim() ||
        String(log.record_id ?? "").trim() === recordFilter.trim() ||
        String(log.record_id ?? "").trim() === String(Number(recordFilter)).trim();

      const search = searchTerm.trim().toLowerCase();
      const haystack = [
        log.table_name,
        log.record_id,
        log.action,
        log.changed_by_email,
        log.summary,
        log.is_archived ? "archived" : "live",
        JSON.stringify(log.old_data || {}),
        JSON.stringify(log.new_data || {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search);

      return (
        matchesTable &&
        matchesAction &&
        matchesSource &&
        matchesRecord &&
        matchesSearch &&
        matchesDate(log.created_at, datePreset, dateFrom, dateTo)
      );
    });
  }, [logs, tableFilter, actionFilter, sourceFilter, recordFilter, searchTerm, datePreset, dateFrom, dateTo]);

  const trendStats = useMemo(() => {
    const last7Days = filteredLogs.filter((log) => {
      const d = new Date(log.created_at);
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return d >= start;
    });

    return {
      total: filteredLogs.length,
      updates: filteredLogs.filter((l) => l.action === "UPDATE").length,
      deletes: filteredLogs.filter((l) => l.action === "DELETE").length,
      invites: filteredLogs.filter((l) => l.action === "INVITE").length,
      last7Days: last7Days.length,
      archived: filteredLogs.filter((l) => !!l.is_archived).length,
      live: filteredLogs.filter((l) => !l.is_archived).length,
    };
  }, [filteredLogs]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedLogs = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, safeCurrentPage, pageSize]);

  function toggleExpanded(rowKey) {
    setExpandedRows((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, isJobHistoryMode ? `tnh-job-${recordFilter}-history.json` : "tnh-audit-log.json");
  }

  function exportCsv() {
    if (!filteredLogs.length) {
      setMessage("No audit entries to export.");
      return;
    }

    const headers = [
      "id",
      "table_name",
      "record_id",
      "action",
      "summary",
      "changed_by_email",
      "created_at",
      "is_archived",
      "archived_at",
    ];

    const csv = [
      headers.join(","),
      ...filteredLogs.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, isJobHistoryMode ? `tnh-job-${recordFilter}-history.csv` : "tnh-audit-log.csv");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSearchTerm("");
    setTableFilter("All");
    setActionFilter("All");
    setSourceFilter("All");
    setRecordFilter("");
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
    setExpandedRows({});
  }

  function clearJobHistoryMode() {
    setTableFilter("All");
    setRecordFilter("");
    setCurrentPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="text-sm uppercase tracking-[0.25em] text-blue-400">Admin Area</div>
        <h1 className="mt-2 text-3xl font-bold text-white">
          {isJobHistoryMode ? `Job History: Record ${recordFilter}` : "Audit Log"}
        </h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          {isJobHistoryMode
            ? "Showing audit history for this specific job record, including archived entries."
            : "Review changes to jobs, users, settings, and invites in a compact audit table, with archived entries included."}
        </p>

        {isJobHistoryMode ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={clearJobHistoryMode}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
            >
              Back to Full Audit Log
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-6 xl:grid-cols-6">
        <StatCard label="Entries" value={trendStats.total} />
        <StatCard label="Updates" value={trendStats.updates} />
        <StatCard label="Deletes" value={trendStats.deletes} critical />
        <StatCard label="Invites" value={trendStats.invites} info />
        <StatCard label="Live" value={trendStats.live} />
        <StatCard label="Archived" value={trendStats.archived} />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="grid gap-4 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm text-slate-400">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search summary, email, record id..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Table</label>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              {tableOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              {actionOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              {sourceOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Date Range</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Record ID</label>
            <input
              type="text"
              value={recordFilter}
              onChange={(e) => setRecordFilter(e.target.value)}
              placeholder="Exact record id..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Rows Per Page</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>
          </div>
        </div>

        {datePreset === "custom" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-400">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadLogs}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 font-medium text-white shadow-lg hover:opacity-90"
          >
            Refresh Log
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={exportJson}
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
          >
            Export JSON
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        {message ? (
          <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="text-slate-400">Loading audit log...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
            No audit entries match your filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Record</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Changed By</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {pagedLogs.map((log) => {
                    const rowKey = `${log.id}-${log.is_archived ? "archived" : "live"}`;
                    const isExpanded = !!expandedRows[rowKey];
                    const visibleChanges = getVisibleChanges(log);

                    return (
                      <>
                        <tr key={rowKey} className="align-top hover:bg-slate-950/60">
                          <td className="px-4 py-3 text-sm text-slate-300">{formatDate(log.created_at)}</td>
                          <td className="px-4 py-3 text-sm text-white">{log.table_name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{log.record_id || "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs ${actionBadgeClass(
                                log.action,
                                log.summary
                              )}`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs ${sourceBadgeClass(
                                log.is_archived
                              )}`}
                            >
                              {log.is_archived ? "Archived" : "Live"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {log.changed_by_email || log.changed_by || "Unknown"}
                          </td>
                          <td className="max-w-[420px] px-4 py-3 text-sm text-slate-200">
                            <div className="line-clamp-2">{log.summary || "Change recorded"}</div>
                            {log.is_archived ? (
                              <div className="mt-1 text-xs text-amber-400">
                                Archived at {formatDate(log.archived_at)}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(rowKey)}
                              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white hover:bg-slate-800"
                            >
                              {isExpanded ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>

                        {isExpanded ? (
                          <tr key={`${rowKey}-expanded`} className="bg-slate-950/70">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="grid gap-4 xl:grid-cols-3">
                                <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                                  <div className="mb-3 text-sm font-medium text-white">Key Changes</div>

                                  {visibleChanges.length === 0 ? (
                                    <div className="text-sm text-slate-500">
                                      No simple field changes to display.
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {visibleChanges.map((change, index) => (
                                        <div
                                          key={`${change.field}-${index}`}
                                          className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                                        >
                                          <div className="text-sm font-medium text-white">
                                            {formatLabel(change.field)}
                                          </div>

                                          {change.type === "added" ? (
                                            <div className="mt-2 text-sm text-slate-300">
                                              <span className="text-slate-500">Set to:</span>{" "}
                                              <span className="text-emerald-300">
                                                {formatValue(change.after)}
                                              </span>
                                            </div>
                                          ) : change.type === "removed" ? (
                                            <div className="mt-2 text-sm text-slate-300">
                                              <span className="text-slate-500">Removed value:</span>{" "}
                                              <span className="text-rose-300">
                                                {formatValue(change.before)}
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="mt-2 grid gap-3 md:grid-cols-2">
                                              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                                                <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                                                  Before
                                                </div>
                                                <div className="mt-1 text-sm text-rose-300">
                                                  {formatValue(change.before)}
                                                </div>
                                              </div>

                                              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                                                <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                                                  After
                                                </div>
                                                <div className="mt-1 text-sm text-emerald-300">
                                                  {formatValue(change.after)}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  <JsonPanel title="Old Data" value={log.old_data} />
                                  <JsonPanel title="New Data" value={log.new_data} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-400">
                Showing {(safeCurrentPage - 1) * pageSize + 1}–
                {Math.min(safeCurrentPage * pageSize, filteredLogs.length)} of {filteredLogs.length}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  Previous
                </button>

                <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white">
                  Page {safeCurrentPage} of {totalPages}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-40"
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

function StatCard({ label, value, critical = false, info = false }) {
  const cls = critical
    ? "border-rose-500/30 bg-rose-500/10"
    : info
    ? "border-cyan-500/30 bg-cyan-500/10"
    : "border-slate-800 bg-slate-900";

  return (
    <div className={`rounded-3xl border p-5 shadow-xl ${cls}`}>
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function JsonPanel({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 text-sm text-slate-400">{title}</div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
        {value ? JSON.stringify(value, null, 2) : "—"}
      </pre>
    </div>
  );
}