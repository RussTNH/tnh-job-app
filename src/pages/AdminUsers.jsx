import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    role: "staff",
  });
  const [inviting, setInviting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    loadProfiles();
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUserId(user?.id || "");
  }

  async function loadProfiles() {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Could not load users: ${error.message}`);
      setLoading(false);
      return;
    }

    setProfiles(data || []);
    setLoading(false);
  }

  function handleInviteChange(e) {
    const { name, value } = e.target;
    setInviteForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleInviteSubmit(e) {
    e.preventDefault();
    setInviting(true);
    setMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: inviteForm.email,
          fullName: inviteForm.fullName,
          role: inviteForm.role,
          redirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        let detailedMessage = error.message || "Could not send invite";

        try {
          if (error.context) {
            const text = await error.context.text();
            try {
              const parsed = JSON.parse(text);
              detailedMessage =
                parsed.error || parsed.message || text || detailedMessage;
            } catch {
              detailedMessage = text || detailedMessage;
            }
          }
        } catch {}

        setMessage(detailedMessage);
        setInviting(false);
        return;
      }

      if (data?.error) {
        setMessage(data.error);
        setInviting(false);
        return;
      }

      setMessage(`Invite sent to ${inviteForm.email}`);
      setInviteForm({
        fullName: "",
        email: "",
        role: "staff",
      });

      await loadProfiles();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not send invite"
      );
    }

    setInviting(false);
  }

  async function updateProfile(id, updates) {
    const { error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMessage(`Could not update user: ${error.message}`);
      return;
    }

    setMessage("User updated");
    setTimeout(() => setMessage(""), 2000);
    await loadProfiles();
  }

  async function handleRoleToggle(profile) {
    const nextRole = profile.role === "admin" ? "staff" : "admin";
    const confirmed = window.confirm(
      `Change ${profile.email || "this user"} from ${profile.role || "staff"} to ${nextRole}?`
    );
    if (!confirmed) return;
    await updateProfile(profile.id, { role: nextRole });
  }

  async function handleActiveToggle(profile) {
    const nextState = !profile.is_active;
    const confirmed = window.confirm(
      `${nextState ? "Enable" : "Disable"} ${profile.email || "this user"}?`
    );
    if (!confirmed) return;
    await updateProfile(profile.id, { is_active: nextState });
  }

  async function handleDeleteUser(profile) {
    if (profile.id === currentUserId) {
      alert("You cannot delete your own account from here.");
      return;
    }

    const confirmed = window.confirm(
      `Delete user ${profile.email || profile.full_name || profile.id}? This will remove their login account.`
    );
    if (!confirmed) return;

    setMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: profile.id },
      });

      if (error) {
        let detailedMessage = error.message || "Could not delete user";

        try {
          if (error.context) {
            const text = await error.context.text();
            try {
              const parsed = JSON.parse(text);
              detailedMessage =
                parsed.error || parsed.message || text || detailedMessage;
            } catch {
              detailedMessage = text || detailedMessage;
            }
          }
        } catch {}

        setMessage(detailedMessage);
        return;
      }

      if (data?.error) {
        setMessage(data.error);
        return;
      }

      setMessage("User deleted");
      await loadProfiles();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete user"
      );
    }
  }

  function roleBadge(role) {
    return role === "admin"
      ? "border-violet-500/30 bg-violet-500/15 text-violet-200"
      : "border-slate-600 bg-slate-700/40 text-slate-200";
  }

  function activeBadge(isActive) {
    return isActive
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
      : "border-rose-500/30 bg-rose-500/15 text-rose-200";
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="text-sm uppercase tracking-[0.25em] text-blue-400">
          Admin Area
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white">Users</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Manage staff access, admin permissions, account status, and send invites.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={profiles.length} />
        <StatCard label="Admins" value={profiles.filter((p) => p.role === "admin").length} />
        <StatCard label="Staff" value={profiles.filter((p) => p.role !== "admin").length} />
        <StatCard label="Active" value={profiles.filter((p) => p.is_active).length} />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Invite User</h2>
        <form onSubmit={handleInviteSubmit} className="mt-5 grid gap-4 md:grid-cols-4">
          <input
            name="fullName"
            value={inviteForm.fullName}
            onChange={handleInviteChange}
            placeholder="Full name"
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          />
          <input
            name="email"
            type="email"
            value={inviteForm.email}
            onChange={handleInviteChange}
            placeholder="Email address"
            required
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          />
          <select
            name="role"
            value={inviteForm.role}
            onChange={handleInviteChange}
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          >
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-60"
          >
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        {message ? (
          <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="text-slate-400">Loading users...</div>
        ) : profiles.length === 0 ? (
          <div className="text-slate-400">No user profiles yet.</div>
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-white">
                      {profile.full_name || "Unnamed User"}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {profile.email || "No email"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${roleBadge(profile.role)}`}>
                        {profile.role || "staff"}
                      </span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${activeBadge(profile.is_active)}`}>
                        {profile.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:w-[540px]">
                    <button
                      type="button"
                      onClick={() => handleRoleToggle(profile)}
                      className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
                    >
                      {profile.role === "admin" ? "Make Staff" : "Make Admin"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleActiveToggle(profile)}
                      className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
                    >
                      {profile.is_active ? "Disable User" : "Enable User"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteUser(profile)}
                      disabled={profile.id === currentUserId}
                      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      Delete User
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

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}