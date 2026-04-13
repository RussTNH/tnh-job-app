import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

const serviceOptions = [
  { title: "Virus Removal", value: "Virus Removal", icon: "🛡️" },
  { title: "Data Recovery", value: "Data Recovery", icon: "💾" },
  { title: "Hardware Repair", value: "Hardware Repair", icon: "🛠️" },
  { title: "Networking", value: "Networking", icon: "🌐" },
  { title: "Software Support", value: "Software Support", icon: "💻" },
  { title: "General Drop-in", value: "General Drop-in", icon: "👋" },
  { title: "Donated Item", value: "Donated Item", icon: "🎁" },
];

const statusOptions = [
  "Open",
  "In Progress",
  "Waiting Parts",
  "Ready for Collection",
  "Completed",
];

export default function CreateJob() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer: "",
    contact: "",
    device: "",
    model: "",
    serial_number: "",
    asset_tag: "",
    issue: "",
    status: "Open",
    service_type: "",
    price: "0.00",
    paid: false,
    donated: false,
  });

  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function selectService(service) {
    const isDonated = service === "Donated Item";

    setForm((prev) => ({
      ...prev,
      service_type: service,
      donated: isDonated,
      paid: isDonated ? false : prev.paid,
      price: isDonated ? "0.00" : prev.price,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    const jobNumber = `TNH-${Date.now()}`;
    const isDonated = form.service_type === "Donated Item" || form.donated;

    const payload = {
      job_number: jobNumber,
      customer: form.customer || null,
      contact: form.contact || null,
      device: form.device || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      asset_tag: form.asset_tag || null,
      issue: form.issue || null,
      status: form.status,
      price: isDonated ? 0 : form.price === "" ? 0 : Number(form.price),
      paid: isDonated ? false : form.paid,
      donated: isDonated,
      service_type: form.service_type || null,
    };

    const { data, error } = await supabase
      .from("jobs")
      .insert([payload])
      .select();

    setSubmitting(false);

    if (error) {
      console.error("Supabase insert error:", error);
      alert(`Error creating job: ${error.message}`);
      return;
    }

    if (data?.[0]?.id) {
      navigate(`/jobs/${data[0].id}`);
      return;
    }

    navigate("/jobs");
  }

  const isDonated = form.service_type === "Donated Item" || form.donated;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
          New Intake
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white">Create New Job</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Log a new workshop or drop-in job, capture device details, assign a
          service type, and create a live record ready for tracking.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="mb-4 text-xl font-semibold text-white">
            Select Service Type
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {serviceOptions.map((service) => {
              const active = form.service_type === service.value;

              return (
                <button
                  key={service.value}
                  type="button"
                  onClick={() => selectService(service.value)}
                  className={[
                    "rounded-3xl border p-5 text-left transition-all",
                    active
                      ? "border-blue-500 bg-gradient-to-br from-blue-600/20 to-violet-600/20 shadow-lg shadow-blue-900/20"
                      : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900",
                  ].join(" ")}
                >
                  <div className="text-3xl">{service.icon}</div>
                  <div className="mt-4 text-lg font-semibold text-white">
                    {service.title}
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Use this category to classify the job clearly for the team.
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-semibold text-white">
              Customer & Device Details
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Customer Name">
                <input
                  name="customer"
                  value={form.customer}
                  onChange={handleChange}
                  placeholder="Enter customer name if applicable"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </Field>

              <Field label="Contact Info">
                <input
                  name="contact"
                  value={form.contact}
                  onChange={handleChange}
                  placeholder="Phone number or email"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </Field>

              <Field label="Device">
                <input
                  name="device"
                  value={form.device}
                  onChange={handleChange}
                  placeholder="Laptop, desktop, phone, console..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </Field>

              <Field label="Model">
                <input
                  name="model"
                  value={form.model}
                  onChange={handleChange}
                  placeholder="Model name or number"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </Field>

              <Field label="Serial Number">
                <input
                  name="serial_number"
                  value={form.serial_number}
                  onChange={handleChange}
                  placeholder="Serial number"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </Field>

              <Field label="Asset Tag / Reference">
                <input
                  name="asset_tag"
                  value={form.asset_tag}
                  onChange={handleChange}
                  placeholder="Internal ref, tag, or label"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </Field>

              <Field label="Initial Status">
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  {statusOptions.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </Field>

              <Field label="Estimated Price (£)">
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={handleChange}
                  disabled={isDonated}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 disabled:opacity-60"
                />
              </Field>

              {isDonated ? (
                <Field label="Donation Status">
                  <div className="flex h-[50px] items-center rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-3 text-fuchsia-200">
                    Donated item
                  </div>
                </Field>
              ) : (
                <Field label="Payment Status">
                  <label className="flex h-[50px] items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
                    <input
                      name="paid"
                      type="checkbox"
                      checked={form.paid}
                      onChange={handleChange}
                      className="h-5 w-5"
                    />
                    <span>{form.paid ? "Paid" : "Unpaid"}</span>
                  </label>
                </Field>
              )}
            </div>

            <div className="mt-5">
              <Field label="Issue Description">
                <textarea
                  name="issue"
                  value={form.issue}
                  onChange={handleChange}
                  rows="6"
                  placeholder="Describe the fault, symptoms, donated item notes, or requested work..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-semibold text-white">
              Job Summary
            </h2>

            <div className="space-y-4">
              <SummaryRow label="Service" value={form.service_type || "Not selected"} />
              <SummaryRow label="Customer" value={form.customer || "Not entered"} />
              <SummaryRow label="Contact" value={form.contact || "Not entered"} />
              <SummaryRow label="Device" value={form.device || "Not entered"} />
              <SummaryRow label="Model" value={form.model || "Not entered"} />
              <SummaryRow label="Serial Number" value={form.serial_number || "Not entered"} />
              <SummaryRow label="Asset Tag" value={form.asset_tag || "Not entered"} />
              <SummaryRow label="Status" value={form.status || "Open"} />
              <SummaryRow
                label="Estimated Price"
                value={`£${Number(form.price || 0).toFixed(2)}`}
              />
              <SummaryRow
                label={isDonated ? "Donation" : "Payment"}
                value={isDonated ? "Donated" : form.paid ? "Paid" : "Unpaid"}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-sm text-slate-400">What happens next</div>
              <div className="mt-2 text-sm text-slate-300">
                Once saved, the job gets a job number, appears in the jobs list,
                and opens its detail page ready for tracking and printing.
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 font-medium text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating Job..." : "Create Job"}
            </button>
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