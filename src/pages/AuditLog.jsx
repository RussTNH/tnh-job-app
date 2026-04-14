import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const tableOptions = ["All", "jobs", "profiles", "app_settings", "user_invites"];
const actionOptions = ["All", "INSERT", "UPDATE", "DELETE", "INVITE"];

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [tableFilter, setTableFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [datePreset, setDatePreset] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error loading audit logs:", error);
      setMessage(`Could not load audit log: ${error.message}`);
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString();
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

  function cardAccent(log) {
    const summaryText = String(log.summary || "").toLowerCase();

    if (log.action === "DELETE") return "border-rose-500/30";
    if (log.action === "INVITE") return "border-cyan-500/30";
    if (summaryText.includes("role changed")) return "border-violet-500/30";
    if (summaryText.includes("status changed")) return "border-amber-500/30";
    return "border-slate-800";
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

    const allKeys = Array.from(
      new Set([...Object.keys(oldData), ...Object.keys(newData)])
    );

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

  function matchesDate(logDateValue) {
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

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesTable =
        tableFilter === "All" || log.table_name === tableFilter;

      const matchesAction =
        actionFilter === "All" || log.action === actionFilter;

      const search = searchTerm.trim().toLowerCase();
      const haystack = [
        log.table_name,
        log.record_id,
        log.action,
        log.changed_by_email,
        log.summary,
        JSON.stringify(log.old_data || {}),
        JSON.stringify(log.new_data || {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search);

      return matchesTable && matchesAction && matchesSearch && matchesDate(log.created_at);
    });
  }, [logs, tableFilter, actionFilter, searchTerm, datePreset, dateFrom, dateTo]);

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
      roleChanges: filteredLogs.filter((l) =>
        String(l.summary || "").toLowerCase().includes("role changed")
      ).length,
    };
  }, [filteredLogs]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "tnh-audit-log.json");
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
    downloadBlob(blob, "tnh-audit-log.csv");
  }

  function printReport() {
    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      setMessage("Pop-up blocked. Please allow pop-ups and try again.");
      return;
    }

    const rowsHtml = filteredLogs
      .slice(0, 150)
      .map(
        (log) => `
          <tr>
            <td>${escapeHtml(formatDate(log.created_at))}</td>
            <td>${escapeHtml(log.table_name || "—")}</td>
            <td>${escapeHtml(log.action || "—")}</td>
            <td>${escapeHtml(log.summary || "Change recorded")}</td>
            <td>${escapeHtml(log.changed_by_email || String(log.changed_by || "Unknown"))}</td>
            <td>${escapeHtml(log.record_id || "—")}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>TNH Audit Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111827;
            }
            h1 {
              margin-bottom: 6px;
            }
            .sub {
              color: #475569;
              margin-bottom: 20px;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 20px;
            }
            .card {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 12px;
              background: #f8fafc;
            }
            .label {
              color: #475569;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.06em;
            }
            .value {
              font-size: 24px;
              font-weight: bold;
              margin-top: 6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px;
              text-align: left;
              vertical-align: top;
              font-size: 12px;
            }
            th {
              background: #e2e8f0;
            }
          </style>
        </head>
        <body>
          <h1>The Nerd Herd Audit Report</h1>
          <div class="sub">
            Generated ${escapeHtml(new Date().toLocaleString())}
          </div>

          <div class="stats">
            <div class="card">
              <div class="label">Entries</div>
              <div class="value">${trendStats.total}</div>
            </div>
            <div class="card">
              <div class="label">Updates</div>
              <div class="value">${trendStats.updates}</div>
            </div>
            <div class="card">
              <div class="label">Deletes</div>
              <div class="value">${trendStats.deletes}</div>
            </div>
            <div class="card">
              <div class="label">Invites</div>
              <div class="value">${trendStats.invites}</div>
            </div>
            <div class="card">
              <div class="label">Role Changes</div>
              <div class="value">${trendStats.roleChanges}</div>
            </div>
            <div class="card">
              <div class="label">Last 7 Days</div>
              <div class="value">${trendStats.last7Days}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Table</th>
                <th>Action</th>
                <th>Summary</th>
                <th>Changed By</th>
                <th>Record ID</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="6">No audit entries found.</td></tr>`}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
          Admin Area
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white">Audit Log</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Review key changes to jobs, users, settings, and invite activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <StatCard label="Entries" value={trendStats.total} />
        <StatCard label="Updates" value={trendStats.updates} />
        <StatCard label="Deletes" value={trendStats.deletes} critical />
        <StatCard label="Invites" value={trendStats.invites} info />
        <StatCard label="Role Changes" value={trendStats.roleChanges} />
        <StatCard label="Last 7 Days" value={trendStats.last7Days} />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="grid gap-4 xl:grid-cols-5">
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
            onClick={printReport}
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
          >
            Print Report
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setTableFilter("All");
              setActionFilter("All");
              setDatePreset("all");
              setDateFrom("");
              setDateTo("");
            }}
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
          <div className="text-slate-400">No audit entries match your filters.</div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => {
              const visibleChanges = getVisibleChanges(log);

              return (
                <div
                  key={log.id}
                  className={`rounded-2xl border bg-slate-950 p-5 ${cardAccent(log)}`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full border border-slate-600 bg-slate-700/40 px-3 py-1 text-xs text-slate-200">
                          {log.table_name}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs ${actionBadgeClass(
                            log.action,
                            log.summary
                          )}`}
                        >
                          {log.action}
                        </span>
                      </div>

                      <div className="mt-3 text-base font-semibold text-white">
                        {log.summary || "Change recorded"}
                      </div>

                      <div className="mt-2 text-sm text-slate-300">
                        Record ID: <span className="text-white">{log.record_id || "—"}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-300">
                        Changed by:{" "}
                        <span className="text-white">
                          {log.changed_by_email || log.changed_by || "Unknown"}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(log.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="mb-3 text-sm text-slate-400">Key Changes</div>

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

                  <details className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <summary className="cursor-pointer text-sm text-slate-300">
                      View full raw JSON details
                    </summary>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <JsonPanel title="Old Data" value={log.old_data} />
                      <JsonPanel title="New Data" value={log.new_data} />
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
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