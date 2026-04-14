import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import CreateJob from "./pages/CreateJob";
import JobDetail from "./pages/JobDetail";
import Suppliers from "./pages/Suppliers";
import AdminSuppliers from "./pages/AdminSuppliers";
import AdminUsers from "./pages/AdminUsers";
import AdminSettings from "./pages/AdminSettings";
import AuditLog from "./pages/AuditLog";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
        setProfile(null);
        return;
      }

      setProfile(data || null);
    } catch (err) {
      console.error("Unexpected profile load error:", err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function initialise() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(currentSession ?? null);

        if (currentSession?.user?.id) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Initial session load error:", err);
        if (isMounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setAppLoading(false);
        }
      }
    }

    initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);

      if (newSession?.user?.id) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (appLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login />}
        />

        <Route
          path="/"
          element={
            <ProtectedRoute
              session={session}
              profile={profile}
              profileLoading={profileLoading}
            >
              <Layout
                session={session}
                profile={profile}
                profileLoading={profileLoading}
              />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/new" element={<CreateJob />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="suppliers" element={<Suppliers />} />

          <Route
            path="admin/suppliers"
            element={
              <AdminRoute profile={profile} profileLoading={profileLoading}>
                <AdminSuppliers />
              </AdminRoute>
            }
          />

          <Route
            path="admin/users"
            element={
              <AdminRoute profile={profile} profileLoading={profileLoading}>
                <AdminUsers />
              </AdminRoute>
            }
          />

          <Route
            path="admin/settings"
            element={
              <AdminRoute profile={profile} profileLoading={profileLoading}>
                <AdminSettings />
              </AdminRoute>
            }
          />

          <Route
            path="admin/audit-log"
            element={
              <AdminRoute profile={profile} profileLoading={profileLoading}>
                <AuditLog />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}