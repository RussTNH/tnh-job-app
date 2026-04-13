import { useEffect, useState } from "react";

const defaultSettings = {
  workshopName: "The Nerd Herd",
  contactPhone: "",
  contactEmail: "",
  address: "",
  defaultLabourRate: "",
  printFooterText: "Generated from TNH Workshop Hub",
  jobSheetNotes: "",
  enableQrOnLiveJobs: true,
  enablePrintedSignatureLines: true,
  highlightDonatedItems: true,
};

const STORAGE_KEY = "tnh_admin_settings";

export default function AdminSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSave(e) {
    e.preventDefault();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedMessage("Settings saved locally");
      setTimeout(() => setSavedMessage(""), 2500);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSavedMessage("Could not save settings");
      setTimeout(() => setSavedMessage(""), 2500);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
          Admin Area
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Configure your workshop details, print defaults, and future system
          behaviour. These settings are currently stored locally in this browser.
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
                    name="workshopName"
                    value={settings.workshopName}
                    onChange={handleChange}
                    placeholder="Workshop or organisation name"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                  />
                </Field>

                <Field label="Contact Phone">
                  <input
                    name="contactPhone"
                    value={settings.contactPhone}
                    onChange={handleChange}
                    placeholder="Phone number"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                  />
                </Field>

                <Field label="Contact Email">
                  <input
                    name="contactEmail"
                    value={settings.contactEmail}
                    onChange={handleChange}
                    placeholder="Email address"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                  />
                </Field>

                <Field label="Default Labour Rate (£)">
                  <input
                    name="defaultLabourRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.defaultLabourRate}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
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
                    placeholder="Workshop address"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
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
                    name="printFooterText"
                    value={settings.printFooterText}
                    onChange={handleChange}
                    placeholder="Footer text for printed job sheets"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                  />
                </Field>

                <Field label="Default Job Sheet Notes">
                  <textarea
                    name="jobSheetNotes"
                    value={settings.jobSheetNotes}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Optional notes or disclaimers to appear on job sheets later"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
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
                  name="enableQrOnLiveJobs"
                  checked={settings.enableQrOnLiveJobs}
                  onChange={handleChange}
                />

                <ToggleRow
                  label="Enable signature lines on printed sheets"
                  name="enablePrintedSignatureLines"
                  checked={settings.enablePrintedSignatureLines}
                  onChange={handleChange}
                />

                <ToggleRow
                  label="Highlight donated items in lists"
                  name="highlightDonatedItems"
                  checked={settings.highlightDonatedItems}
                  onChange={handleChange}
                />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white">Preview</h2>
              <p className="mt-2 text-sm text-slate-400">
                A quick summary of your current settings.
              </p>

              <div className="mt-5 space-y-4">
                <SummaryRow label="Workshop" value={settings.workshopName || "Not set"} />
                <SummaryRow label="Phone" value={settings.contactPhone || "Not set"} />
                <SummaryRow label="Email" value={settings.contactEmail || "Not set"} />
                <SummaryRow
                  label="Labour Rate"
                  value={
                    settings.defaultLabourRate
                      ? `£${Number(settings.defaultLabourRate).toFixed(2)}`
                      : "Not set"
                  }
                />
                <SummaryRow
                  label="QR on Live Jobs"
                  value={settings.enableQrOnLiveJobs ? "Enabled" : "Disabled"}
                />
                <SummaryRow
                  label="Signature Lines"
                  value={settings.enablePrintedSignatureLines ? "Enabled" : "Disabled"}
                />
                <SummaryRow
                  label="Highlight Donations"
                  value={settings.highlightDonatedItems ? "Enabled" : "Disabled"}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white">Save Settings</h2>
              <p className="mt-2 text-sm text-slate-400">
                This first version stores settings in your current browser only.
              </p>

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

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white">Next Step</h2>
              <p className="mt-2 text-sm text-slate-400">
                Once you’re happy with the layout, we can connect these settings
                to Supabase so they load for all users and devices.
              </p>
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

function SummaryRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}