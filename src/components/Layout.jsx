import { Outlet, Link } from "react-router-dom";

export default function Layout() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* SIDEBAR */}
      <div style={{ width: "250px", background: "black", color: "white", padding: "20px" }}>
        <h2>TNH System</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link to="/">Dashboard</Link>
          <Link to="/jobs">Jobs</Link>
          <Link to="/create">New Job</Link>
          <Link to="/admin/users">Users</Link>
          <Link to="/admin/settings">Settings</Link>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet />
      </div>

    </div>
  );
}