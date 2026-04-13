import { Outlet, Link, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  const linkClass = (path) =>
    `px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-blue-600 text-white"
        : "text-gray-300 hover:bg-gray-700"
    }`;

  return (
    <div className="flex h-screen bg-gray-900 text-white">

      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-800 p-5 flex flex-col">
        <h1 className="text-2xl font-bold mb-8">🔧 TNH System</h1>

        <nav className="flex flex-col gap-2">
          <Link to="/" className={linkClass("/")}>Dashboard</Link>
          <Link to="/jobs" className={linkClass("/jobs")}>Jobs</Link>
          <Link to="/create" className={linkClass("/create")}>New Job</Link>

          <div className="mt-6 text-xs text-gray-400">ADMIN</div>

          <Link to="/admin/users" className={linkClass("/admin/users")}>Users</Link>
          <Link to="/admin/settings" className={linkClass("/admin/settings")}>Settings</Link>
        </nav>

        <div className="mt-auto text-xs text-gray-500">
          TNH v1.0
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 bg-gray-100 text-black p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}