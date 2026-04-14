import { Navigate } from "react-router-dom";

export default function AdminRoute({ profile, profileLoading, children }) {
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Checking admin access...
      </div>
    );
  }

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return <Navigate to="/" replace />;
  }

  return children;
}