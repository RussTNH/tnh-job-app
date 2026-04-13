import { Outlet, Link, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-800 bg-slate-950/95 p-6">
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

            <div className="pt-6 text-xs uppercase tracking-[0.25em] text-slate-500">
              Admin
            </div>

            <Link to="/admin/users" className={navClass("/admin/users")}>
              Users
            </Link>
            <Link to="/admin/settings" className={navClass("/admin/settings")}>
              Settings
            </Link>
          </nav>

          <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="text-sm font-semibold text-white">Workshop Services</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                Virus Removal
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                Data Recovery
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                Hardware Repair
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                Networking
              </div>
            </div>
          </div>

          <div className="mt-auto pt-8 text-xs text-slate-500">
            TNH Job App · v1.0
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

                <div className="w-full md:w-80">
                  <input
                    type="text"
                    placeholder="Search jobs, customer, device..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                  />
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