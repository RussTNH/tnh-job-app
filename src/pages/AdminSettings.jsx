import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const defaultSettings = {
  id: 1,
  workshop_name: "The Nerd Herd",
  contact_phone: "",
  contact_email: "",
  address: "",
  default_labour_rate: "",
  print_footer_text: "Generated from TNH Workshop Hub",
  job_sheet_notes: "",
  enable_qr_on_live_jobs: true,
  enable_printed_signature_lines: true,
  highlight_donated_items: true,
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [savedMessage, setSavedMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);

    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error loading settings:", error);
      setLoading(false);
      return;
    }

    setSettings({ ...defaultSettings, ...data });
    setLoading(false);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();

    const payload = {
      ...settings,
      default_labour_rate:
        settings.default_labour_rate === ""
          ? null
          : Number(settings.default_labour_rate),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("app_settings").upsert(payload);

    if (error) {
      console.error("Error saving settings:", error);
      setSavedMessage("Could not save settings");
      setTimeout(() => setSavedMessage(""), 2500);
      return;
    }

    setSavedMessage("Settings saved");
    setTimeout(() => setSavedMessage(""), 2500);
  }

  async function exportJobsJson() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Could not export jobs: ${error.message}`);
      return;
    }

    const blob = new Blob([JSON.stringify(data || [], null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "tnh-jobs-backup.json");
  }

  async function exportJobsCsv() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Could not export jobs: ${error.message}`);
      return;
    }

    const rows = data || [];
    if (!rows.length) {
      alert("No jobs to export");
      return;
    }

    const headers = [
      "job_number",
      "customer",
      "contact",
      "device",
      "model",
      "serial_number",
      "asset_tag",
      "service_type",
      "status",
      "donated",
      "paid",
      "collected",
      "parts_cost",
      "labour_cost",
      "price",
      "issue",
      "parts_used",
      "notes",
      "created_at",
    ];

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, "tnh-jobs-backup.csv");
  }

  async function exportUsersJson() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Could not export users: ${error.message}`);
      return;
    }

    const blob = new Blob([JSON.stringify(data || [], null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "tnh-users-backup.json");
  }

  function exportSettingsJson() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "tnh-settings-backup.json");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-300">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
          Admin Area
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Configure workshop details, print defaults, and create backup exports.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-semibold text-white">
                Workshop Details
              </h2>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Workshop Name">
                  <input
                    name="workshop_name"
                    value={settings.workshop_name}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </Field>

                <Field label="Contact Phone">
                  <input
                    name="contact_phone"
                    value={settings.contact_phone}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </Field>

                <Field label="Contact Email">
                  <input
                    name="contact_email"
                    value={settings.contact_email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </Field>

                <Field label="Default Labour Rate (£)">
                  <input
                    name="default_labour_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.default_labour_rate ?? ""}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </Field>
              </div>

              <div className="mt-5">
                <Field label="Address">
                  <textarea
                    name="address"
                    value={settings.address}
                    onChange={handleChange}
                    rows="4"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-semibold text-white">
                Print Defaults
              </h2>

              <div className="space-y-5">
                <Field label="Print Footer Text">
                  <input
                    name="print_footer_text"
                    value={settings.print_footer_text}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </Field>

                <Field label="Default Job Sheet Notes">
                  <textarea
                    name="job_sheet_notes"
                    value={settings.job_sheet_notes}
                    onChange={handleChange}
                    rows="4"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-semibold text-white">
                System Preferences
              </h2>

              <div className="space-y-4">
                <ToggleRow
                  label="Enable QR on live job pages"
                  name="enable_qr_on_live_jobs"
                  checked={settings.enable_qr_on_live_jobs}
                  onChange={handleChange}
                />
                <ToggleRow
                  label="Enable signature lines on printed sheets"
                  name="enable_printed_signature_lines"
                  checked={settings.enable_printed_signature_lines}
                  onChange={handleChange}
                />
                <ToggleRow
                  label="Highlight donated items"
                  name="highlight_donated_items"
                  checked={settings.highlight_donated_items}
                  onChange={handleChange}
                />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white">Backup / Export</h2>
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={exportJobsJson}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
                >
                  Export Jobs JSON
                </button>
                <button
                  type="button"
                  onClick={exportJobsCsv}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
                >
                  Export Jobs CSV
                </button>
                <button
                  type="button"
                  onClick={exportUsersJson}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
                >
                  Export Users JSON
                </button>
                <button
                  type="button"
                  onClick={exportSettingsJson}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
                >
                  Export Settings JSON
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white">Save Settings</h2>
              <button
                type="submit"
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 font-medium text-white shadow-lg hover:opacity-90"
              >
                Save Settings
              </button>

              <div className="mt-4 text-sm text-slate-300">
                {savedMessage || "No recent changes saved."}
              </div>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-slate-400">{label}</div>
      {children}
    </label>
  );
}

function ToggleRow({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-white">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-5 w-5"
      />
    </label>
  );
}