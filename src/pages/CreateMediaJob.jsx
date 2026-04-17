import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const SOURCE_MEDIA_OPTIONS = [
  "VHS",
  "VHS-C",
  "S-VHS",
  "Video8",
  "Hi8",
  "Digital8",
  "MiniDV",
  "Betamax",
  "Audio Cassette",
  "Microcassette",
  "MiniDisc",
  "DAT",
  "Reel to Reel",
  "CD",
  "DVD",
  "Blu-ray",
  "Floppy Disk",
  "Zip Disk",
  "Memory Card",
  "USB Stick",
  "Hard Drive",
  "Photo Prints",
  "Slides",
  "Negatives",
  "8mm Film",
  "Super 8 Film",
  "16mm Film",
  "Other",
];

const OUTPUT_MEDIA_OPTIONS = [
  "USB Stick",
  "External Hard Drive",
  "DVD",
  "CD",
  "Digital Download",
  "Cloud Transfer",
  "SD Card",
  "Customer Supplied Drive",
  "Other",
];

function emptyMediaRow() {
  return {
    source_type: "",
    quantity: 1,
  };
}

function safeNumber(value) {
  const num = Number(value || 0);
  return Number.isNaN(num) ? 0 : num;
}

function buildMediaItems(mediaRows) {
  const items = [];
  let currentNumber = 1;

  mediaRows.forEach((row) => {
    const qty = Math.max(0, safeNumber(row.quantity));

    for (let i = 0; i < qty; i += 1) {
      const itemCode = String(currentNumber).padStart(3, "0");

      items.push({
        item_number: currentNumber,
        item_code: itemCode,
        item_label: itemCode,
        source_type: row.source_type || "Unknown",
        progress_status: "Booked In",
        cleaned: false,
        captured: false,
        qc_checked: false,
        delivered: false,
        item_notes: "",
      });

      currentNumber += 1;
    }
  });

  return items;
}

export default function CreateMediaJob() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer: "",
    contact: "",
    email: "",
    phone: "",
    project_name: "",
    output_media_type: "",
    notes: "",
  });

  const [mediaRows, setMediaRows] = useState([emptyMediaRow()]);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const mediaItems = useMemo(() => buildMediaItems(mediaRows), [mediaRows]);

  const totalItems = mediaItems.length;

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateMediaRow(index, field, value) {
    setMediaRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function addMediaRow() {
    setMediaRows((prev) => [...prev, emptyMediaRow()]);
  }

  function removeMediaRow(index) {
    setMediaRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorText("");

    if (!form.customer.trim()) {
      setErrorText("Customer name is required.");
      return;
    }

    if (!form.project_name.trim()) {
      setErrorText("Project name is required.");
      return;
    }

    if (!form.output_media_type.trim()) {
      setErrorText("Output media type is required.");
      return;
    }

    const validRows = mediaRows.filter(
      (row) => row.source_type && safeNumber(row.quantity) > 0
    );

    if (validRows.length === 0) {
      setErrorText("Add at least one media type with a quantity.");
      return;
    }

    const generatedItems = buildMediaItems(validRows);

    setSaving(true);

    const summaryText = validRows
      .map((row) => `${row.source_type} x${safeNumber(row.quantity)}`)
      .join(", ");

    const issueText = `Media conversion project: ${form.project_name}`;

    const payload = {
      customer: form.customer || null,
      contact: form.contact || null,
      email: form.email || null,
      phone: form.phone || null,
      device: "Media Conversion",
      make: null,
      model: null,
      serial_number: null,
      asset_tag: null,
      fault: summaryText || null,
      issue: issueText,
      service_type: "Media Conversion",
      job_type: "media_conversion",
      project_name: form.project_name || null,
      output_media_type: form.output_media_type || null,
      media_items_json: generatedItems,
      notes: form.notes || null,
      status: "Open",
      paid: false,
      donated: false,
      collected: false,
      archived: false,
      price: 0,
      labour_cost: 0,
      parts_cost: 0,
      parts_json: [],
      parts_used: null,
      assigned_to: null,
      assigned_to_name: null,
    };

    const { data, error } = await supabase
      .from("jobs")
      .insert(payload)
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      console.error("Create media job error:", error);
      setErrorText(error.message || "Could not create media conversion booking.");
      return;
    }

    navigate(`/jobs/${data.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
              Media Conversion
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">
              New Media Conversion Booking
            </h1>
            <p className="mt-2 text-slate-400">
              Create a dedicated booking for tape, film, audio, photo, and digital media conversion work.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/media")}
              className="w-full rounded-2xl border border-emerald-600/30 bg-emerald-600/10 px-5 py-3 font-medium text-white hover:bg-emerald-600/20 sm:w-auto"
            >
              View Media Jobs
            </button>

            <button
              type="button"
              onClick={() => navigate("/jobs")}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800 sm:w-auto"
            >
              Back to Jobs
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white">Customer Details</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Customer Name *</label>
              <input
                value={form.customer}
                onChange={(e) => updateForm("customer", e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Contact</label>
              <input
                value={form.contact}
                onChange={(e) => updateForm("contact", e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Email</label>
              <input
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white">Project Details</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Project Name *</label>
              <input
                value={form.project_name}
                onChange={(e) => updateForm("project_name", e.target.value)}
                placeholder="Example: Smith Family Wedding Archive"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Output Media *</label>
              <select
                value={form.output_media_type}
                onChange={(e) => updateForm("output_media_type", e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              >
                <option value="">Select output type</option>
                {OUTPUT_MEDIA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm text-slate-400">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
                rows={4}
                placeholder="Special instructions, delivery notes, priority details, etc."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Source Media</h2>
              <p className="mt-1 text-sm text-slate-400">
                Add each source media type and the quantity received.
              </p>
            </div>

            <button
              type="button"
              onClick={addMediaRow}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-white hover:bg-slate-800"
            >
              + Add More Media
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {mediaRows.map((row, index) => (
              <div
                key={index}
                className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-12"
              >
                <div className="sm:col-span-8">
                  <label className="mb-2 block text-sm text-slate-400">Media Type</label>
                  <select
                    value={row.source_type}
                    onChange={(e) => updateMediaRow(index, "source_type", e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                  >
                    <option value="">Select media type</option>
                    {SOURCE_MEDIA_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="mb-2 block text-sm text-slate-400">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => updateMediaRow(index, "quantity", e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                  />
                </div>

                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeMediaRow(index)}
                    className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-white hover:bg-rose-500/20"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white">Generated Item Numbering</h2>
          <p className="mt-1 text-sm text-slate-400">
            This resets for every media conversion booking and numbers each individual item in the project.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-sm text-slate-400">Project Name</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {form.project_name || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-sm text-slate-400">Output Media</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {form.output_media_type || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-sm text-slate-400">Total Individual Items</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {totalItems}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-sm text-slate-400">Item Range</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {totalItems > 0 ? `001 - ${String(totalItems).padStart(3, "0")}` : "—"}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            {mediaItems.length === 0 ? (
              <div className="text-sm text-slate-400">
                Add media types and quantities to generate item numbering.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {mediaItems.map((item) => (
                  <div
                    key={`${item.item_code}-${item.source_type}`}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <span className="font-semibold">{item.item_code}</span> • {item.source_type}
                    <div className="mt-1 text-xs text-slate-500">{item.progress_status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {errorText ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {errorText}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Media Conversion Booking"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/jobs")}
            className="rounded-2xl border border-slate-700 bg-slate-950 px-6 py-3 font-medium text-white hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}