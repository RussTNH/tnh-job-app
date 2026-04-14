import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Layout({ session, profile }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = profile?.role === "admin";

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-800 bg-slate-950/95 p-6 flex flex-col">
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
            <Link to="/" className={navClass("/")}>
              Dashboard
            </Link>
            <Link to="/jobs" className={navClass("/jobs")}>
              Jobs
            </Link>
            <Link to="/create" className={navClass("/create")}>
              New Job
            </Link>

            {isAdmin ? (
              <>
                <div className="pt-6 text-xs uppercase tracking-[0.25em] text-slate-500">
                  Admin
                </div>

                <Link to="/admin/users" className={navClass("/admin/users")}>
                  Users
                </Link>
                <Link to="/admin/settings" className={navClass("/admin/settings")}>
                  Settings
                </Link>
              </>
            ) : null}
          </nav>

          <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="text-sm font-semibold text-white">Signed In</div>
            <div className="mt-2 text-sm text-slate-400 break-all">
              {session?.user?.email || "Unknown user"}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                  isAdmin
                    ? "border-violet-500/30 bg-violet-500/15 text-violet-200"
                    : "border-slate-600 bg-slate-700/40 text-slate-200"
                }`}
              >
                {profile?.role || "staff"}
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

          <div className="mt-auto pt-8 text-xs text-slate-500">
            TNH Job App · v2
          </div>
        </aside>

        <main className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl backdrop-blur">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-blue-400">
                    Control Centre
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-white">
                    Workshop & Drop-in Management
                  </div>
                </div>

                <div className="text-sm text-slate-400">
                  {isAdmin ? "Admin access enabled" : "Standard user access"}
                </div>
              </div>
            </div>

            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}