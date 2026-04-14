import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const emptyForm = {
  name: "",
  url: "",
  description: "",
  category: "",
  sort_order: 0,
  is_active: true,
};

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading suppliers:", error);
      setSuppliers([]);
      setLoading(false);
      return;
    }

    setSuppliers(data || []);
    setLoading(false);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(supplier) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || "",
      url: supplier.url || "",
      description: supplier.description || "",
      category: supplier.category || "",
      sort_order: supplier.sort_order ?? 0,
      is_active: Boolean(supplier.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      url: form.url.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: Boolean(form.is_active),
    };

    if (!payload.name || !payload.url) {
      alert("Name and URL are required.");
      setSaving(false);
      return;
    }

    let result;

    if (editingId) {
      result = await supabase.from("suppliers").update(payload).eq("id", editingId);
    } else {
      result = await supabase.from("suppliers").insert(payload);
    }

    if (result.error) {
      alert(`Could not save supplier: ${result.error.message}`);
      setSaving(false);
      return;
    }

    resetForm();
    await loadSuppliers();
    setSaving(false);
  }

  async function deleteSupplier(id) {
    const confirmed = window.confirm("Delete this supplier?");
    if (!confirmed) return;

    const { error } = await supabase.from("suppliers").delete().eq("id", id);

    if (error) {
      alert(`Could not delete supplier: ${error.message}`);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    await loadSuppliers();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
          Admin
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white">Manage Suppliers</h1>
        <p className="mt-2 text-slate-400">
          Add, edit, sort, activate, or remove supplier links.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
      >
        <h2 className="mb-5 text-xl font-semibold text-white">
          {editingId ? "Edit Supplier" : "Add Supplier"}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Supplier Name">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              required
            />
          </Field>

          <Field label="URL">
            <input
              name="url"
              value={form.url}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              placeholder="https://example.com"
              required
            />
          </Field>

          <Field label="Category">
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              placeholder="Parts, Electronics, Marketplace..."
            />
          </Field>

          <Field label="Sort Order">
            <input
              name="sort_order"
              type="number"
              value={form.sort_order}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Description">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />
            Active
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update Supplier" : "Add Supplier"}
          </button>

          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-6 py-3 text-white hover:bg-slate-800"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-5 text-xl font-semibold text-white">Current Suppliers</h2>

        {loading ? (
          <div className="text-slate-400">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-slate-400">No suppliers found.</div>
        ) : (
          <div className="space-y-4">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold text-white">
                        {supplier.name}
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs ${
                          supplier.is_active
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {supplier.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-2 break-all text-sm text-blue-400">
                      {supplier.url}
                    </div>

                    <div className="mt-2 text-sm text-slate-400">
                      {supplier.description || "No description"}
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      Category: {supplier.category || "General"} • Sort:{" "}
                      {supplier.sort_order ?? 0}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => startEdit(supplier)}
                      className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteSupplier(supplier.id)}
                      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-rose-200 hover:bg-rose-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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