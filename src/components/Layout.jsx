import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Layout({ session, profile, profileLoading }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = profile?.role === "admin" && profile?.is_active;

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const navClass = (path) =>
    [
      "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-all",
      isActive(path)
        ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-900/30"
        : "text-slate-300 hover:bg-slate-800 hover:text-white",
    ].join(" ");

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function SidebarContent() {
    return (
      <>
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            The Nerd Herd
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white">Workshop Hub</h1>
          <p className="mt-2 text-sm text-slate-400">
            Repairs, drop-ins, diagnostics, and job tracking.
          </p>
        </div>

        <nav className="space-y-2">
          <Link to="/" className={navClass("/")} onClick={closeMobileMenu}>
            Dashboard
          </Link>

          <Link to="/jobs" className={navClass("/jobs")} onClick={closeMobileMenu}>
            Jobs
          </Link>

          <Link
            to="/jobs/archived"
            className={navClass("/jobs/archived")}
            onClick={closeMobileMenu}
          >
            Archived Jobs
          </Link>

          <Link
            to="/jobs/new"
            className={navClass("/jobs/new")}
            onClick={closeMobileMenu}
          >
            New Job
          </Link>

          <Link
            to="/media"
            className={navClass("/media")}
            onClick={closeMobileMenu}
          >
            Media
          </Link>

          <Link
            to="/media/archived"
            className={navClass("/media/archived")}
            onClick={closeMobileMenu}
          >
            Archived Media
          </Link>

          <Link
            to="/suppliers"
            className={navClass("/suppliers")}
            onClick={closeMobileMenu}
          >
            Suppliers
          </Link>

          {isAdmin ? (
            <>
              <div className="pt-6 text-xs uppercase tracking-[0.25em] text-slate-500">
                Admin
              </div>

              <Link
                to="/admin/suppliers"
                className={navClass("/admin/suppliers")}
                onClick={closeMobileMenu}
              >
                Supplier Admin
              </Link>

              <Link
                to="/admin/users"
                className={navClass("/admin/users")}
                onClick={closeMobileMenu}
              >
                Users
              </Link>

              <Link
                to="/admin/settings"
                className={navClass("/admin/settings")}
                onClick={closeMobileMenu}
              >
                Settings
              </Link>

              <Link
                to="/admin/audit-log"
                className={navClass("/admin/audit-log")}
                onClick={closeMobileMenu}
              >
                Audit Log
              </Link>
            </>
          ) : null}
        </nav>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
          <div className="text-sm font-semibold text-white">Signed In</div>
          <div className="mt-2 break-all text-sm text-slate-400">
            {session?.user?.email || "Unknown user"}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                profileLoading
                  ? "border-slate-600 bg-slate-700/40 text-slate-200"
                  : isAdmin
                  ? "border-violet-500/30 bg-violet-500/15 text-violet-200"
                  : "border-slate-600 bg-slate-700/40 text-slate-200"
              }`}
            >
              {profileLoading ? "Loading role..." : profile?.role || "staff"}
            </span>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                profile?.is_active
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                  : "border-rose-500/30 bg-rose-500/15 text-rose-200"
              }`}
            >
              {profile?.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
          >
            Log Out
          </button>
        </div>

        <div className="mt-auto pt-8 text-xs text-slate-500">TNH Job App · v2</div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r border-slate-800 bg-slate-950/95 p-6 lg:flex">
          <SidebarContent />
        </aside>

        {mobileMenuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={closeMobileMenu}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transform border-r border-slate-800 bg-slate-950 p-6 transition-transform duration-300 lg:hidden ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-semibold text-white">Menu</div>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <div className="flex h-[calc(100%-3.5rem)] flex-col overflow-y-auto">
            <SidebarContent />
          </div>
        </aside>

        <main className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.25em] text-blue-400">
                  The Nerd Herd
                </div>
                <div className="truncate text-lg font-semibold text-white">
                  Workshop Hub
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Menu
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6 xl:p-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.25em] text-blue-400">
                      Control Centre
                    </div>
                    <div className="mt-1 break-words text-xl font-semibold text-white sm:text-2xl">
                      Workshop & Drop-in Management
                    </div>
                  </div>

                  <div className="text-sm text-slate-400">
                    {profileLoading
                      ? "Checking access..."
                      : isAdmin
                      ? "Admin access enabled"
                      : "Standard user access"}
                  </div>
                </div>
              </div>

              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}