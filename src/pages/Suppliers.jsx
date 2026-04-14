import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function SupplierCard({ supplier }) {
  return (
    <a
      href={supplier.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl transition hover:bg-slate-800/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-white">{supplier.name}</div>
          <div className="mt-2 text-sm text-slate-400">
            {supplier.description || "No description"}
          </div>
        </div>

        <span className="inline-flex shrink-0 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
          {supplier.category || "General"}
        </span>
      </div>

      <div className="mt-4 break-all text-sm text-blue-400">{supplier.url}</div>
    </a>
  );
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading suppliers:", error);
      setLoadError(error.message || "Unknown error");
      setSuppliers([]);
      setLoading(false);
      return;
    }

    setSuppliers(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Loading suppliers...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-slate-900 p-6 text-rose-200">
        Could not load suppliers: {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
          Workshop
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white">Suppliers</h1>
        <p className="mt-2 text-slate-400">
          Quick links to common parts, tools, and electronics suppliers.
        </p>
      </div>

      {suppliers.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          No suppliers have been added yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} />
          ))}
        </div>
      )}
    </div>
  );
}