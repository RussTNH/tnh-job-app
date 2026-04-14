import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  session,
  profile,
  profileLoading,
  children,
}) {
  // Not logged in
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Still loading profile
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading user...
      </div>
    );
  }

  // No profile found (shouldn't happen, but safe)
  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // 🚫 USER DISABLED
  if (!profile.is_active) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">
            Account Disabled
          </h2>
          <p className="mt-3 text-slate-400">
            Your account has been disabled. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return children;
}