import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const tableOptions = ["All", "jobs", "profiles", "app_settings"];
const actionOptions = ["All", "INSERT", "UPDATE", "DELETE"];

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [tableFilter, setTableFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

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
      .limit(200);

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

  function actionBadgeClass(action) {
    if (action === "INSERT") {
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
    }
    if (action === "UPDATE") {
      return "border-amber-500/30 bg-amber-500/15 text-amber-200";
    }
    if (action === "DELETE") {
      return "border-rose-500/30 bg-rose-500/15 text-rose-200";
    }
    return "border-slate-600 bg-slate-700/40 text-slate-200";
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
        JSON.stringify(log.old_data || {}),
        JSON.stringify(log.new_data || {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search);

      return matchesTable && matchesAction && matchesSearch;
    });
  }, [logs, tableFilter, actionFilter, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
          Admin Area
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white">Audit Log</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Review key changes to jobs, users, and settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Entries Loaded" value={logs.length} />
        <StatCard
          label="Job Changes"
          value={logs.filter((l) => l.table_name === "jobs").length}
        />
        <StatCard
          label="User Changes"
          value={logs.filter((l) => l.table_name === "profiles").length}
        />
        <StatCard
          label="Settings Changes"
          value={logs.filter((l) => l.table_name === "app_settings").length}
        />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm text-slate-400">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search email, record id, table, JSON changes..."
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
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={loadLogs}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 font-medium text-white shadow-lg hover:opacity-90"
          >
            Refresh Log
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setTableFilter("All");
              setActionFilter("All");
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
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-slate-600 bg-slate-700/40 px-3 py-1 text-xs text-slate-200">
                        {log.table_name}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs ${actionBadgeClass(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-slate-300">
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

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <JsonPanel title="Old Data" value={log.old_data} />
                  <JsonPanel title="New Data" value={log.new_data} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
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