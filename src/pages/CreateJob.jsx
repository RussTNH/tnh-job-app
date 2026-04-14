import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const defaultForm = {
  customer: "",
  contact: "",
  device: "",
  model: "",
  serial_number: "",
  asset_tag: "",
  issue: "",
  service_type: "Hardware Repair",
  status: "Open",
  price: "",
  labour_cost: "",
  parts_cost: "",
  paid: false,
  donated: false,
  collected: false,
  assigned_to: "",
};

function normaliseNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export default function CreateJob() {
  const navigate = useNavigate();

  const [form, setForm] = useState(defaultForm);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (form.service_type === "Donated Item") {
      setForm((prev) => ({
        ...prev,
        donated: true,
        paid: false,
        price: "",
        labour_cost: "",
        parts_cost: "",
      }));
    }
  }, [form.service_type]);

  async function loadUsers() {
    setLoadingUsers(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, is_active")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error loading users:", error);
      setLoadingUsers(false);
      return;
    }

    setUsers(data || []);
    setLoadingUsers(false);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "donated") {
        if (checked) {
          updated.service_type = "Donated Item";
          updated.paid = false;
          updated.price = "";
          updated.labour_cost = "";
          updated.parts_cost = "";
        } else if (prev.service_type === "Donated Item") {
          updated.service_type = "Hardware Repair";
        }
      }

      if (name === "service_type" && value === "Donated Item") {
        updated.donated = true;
        updated.paid = false;
        updated.price = "";
        updated.labour_cost = "";
        updated.parts_cost = "";
      }

      if (name === "paid" && prev.donated) {
        updated.paid = false;
      }

      return updated;
    });
  }

  function buildJobNumber() {
    return `TNH-${Date.now()}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const assignedUser = users.find((u) => u.id === form.assigned_to);
      const donatedMode = form.donated || form.service_type === "Donated Item";

      const payload = {
        job_number: buildJobNumber(),
        customer: form.customer.trim() || null,
        contact: form.contact.trim() || null,
        device: form.device.trim() || null,
        model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null,
        asset_tag: form.asset_tag.trim() || null,
        issue: form.issue.trim() || null,
        service_type: donatedMode ? "Donated Item" : form.service_type || null,
        status: form.status || "Open",
        price: donatedMode ? 0 : normaliseNumberOrNull(form.price),
        labour_cost: donatedMode ? 0 : normaliseNumberOrNull(form.labour_cost),
        parts_cost: donatedMode ? 0 : normaliseNumberOrNull(form.parts_cost),
        paid: donatedMode ? false : Boolean(form.paid),
        donated: donatedMode,
        collected: Boolean(form.collected),
        assigned_to: form.assigned_to || null,
        assigned_to_name: assignedUser
          ? assignedUser.full_name || assignedUser.email
          : null,
        parts_json: JSON.stringify([]),
      };

      const { data, error } = await supabase
        .from("jobs")
        .insert(payload)
        .select()
        .single();

      if (error) {
        alert(`Error creating job: ${error.message}`);
        setSaving(false);
        return;
      }

      navigate(`/jobs/${data.id}`);
    } catch (err) {
      alert(`Unexpected error creating job: ${err.message}`);
      setSaving(false);
    }
  }

  const donatedMode = form.donated || form.service_type === "Donated Item";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
              Workshop
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">Create Job</h1>
            <p className="mt-2 text-slate-400">
              Add a new workshop, repair, drop-in, or donated item job.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Customer Name">
            <input
              name="customer"
              value={form.customer}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </Field>

          <Field label="Contact">
            <input
              name="contact"
              value={form.contact}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </Field>

          <Field label="Device">
            <input
              name="device"
              value={form.device}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </Field>

          <Field label="Model">
            <input
              name="model"
              value={form.model}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </Field>

          <Field label="Serial Number">
            <input
              name="serial_number"
              value={form.serial_number}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </Field>

          <Field label="Asset Tag">
            <input
              name="asset_tag"
              value={form.asset_tag}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </Field>

          <Field label="Service Type">
            <select
              name="service_type"
              value={form.service_type}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              <option>Virus Removal</option>
              <option>Data Recovery</option>
              <option>Hardware Repair</option>
              <option>Networking</option>
              <option>Software Support</option>
              <option>General Drop-in</option>
              <option>Donated Item</option>
            </select>
          </Field>

          <Field label="Assign To Engineer / User">
            <select
              name="assigned_to"
              value={form.assigned_to}
              onChange={handleChange}
              disabled={loadingUsers}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-60"
            >
              <option value="">
                {loadingUsers ? "Loading users..." : "Unassigned"}
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Price (£)">
            <input
              name="price"
              type="number"
              step="0.01"
              value={donatedMode ? "" : form.price}
              onChange={handleChange}
              disabled={donatedMode}
              placeholder={donatedMode ? "Donated item" : "Leave blank if not set"}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-60"
            />
          </Field>

          <Field label="Labour Cost (£)">
            <input
              name="labour_cost"
              type="number"
              step="0.01"
              value={donatedMode ? "" : form.labour_cost}
              onChange={handleChange}
              disabled={donatedMode}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-60"
            />
          </Field>

          <Field label="Parts Cost (£)">
            <input
              name="parts_cost"
              type="number"
              step="0.01"
              value={donatedMode ? "" : form.parts_cost}
              onChange={handleChange}
              disabled={donatedMode}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-60"
            />
          </Field>

          <Field label="Status">
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              <option>Open</option>
              <option>In Progress</option>
              <option>Waiting Parts</option>
              <option>Ready for Collection</option>
              <option>Completed</option>
            </select>
          </Field>
        </div>

        <div className="mt-5">
          <Field label="Issue Description">
            <textarea
              name="issue"
              value={form.issue}
              onChange={handleChange}
              rows="4"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              name="paid"
              checked={form.paid}
              onChange={handleChange}
              disabled={donatedMode}
            />
            Paid
          </label>

          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              name="donated"
              checked={form.donated}
              onChange={handleChange}
            />
            Donated
          </label>

          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              name="collected"
              checked={form.collected}
              onChange={handleChange}
            />
            Collected
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Creating..." : "Create Job"}
          </button>
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