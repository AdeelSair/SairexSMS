"use client";

import { useState, useEffect } from "react";

type Org = { id: number; name: string };
type Campus = { id: number; name: string; organizationId: number };
type User = {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
  campusId: number | null;
  organization: { id: number; name: string };
  campus: { id: number; name: string } | null;
};
type Invite = {
  id: number;
  email: string;
  role: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  organization: { name: string };
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("TEACHER");
  const [inviteOrgId, setInviteOrgId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteError, setInviteError] = useState("");

  // Toggle loading state per user
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/invites");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setInvites(data.pendingInvites || []);
        setOrganizations(data.organizations || []);
        setCampuses(data.campuses || []);
        setIsSuperAdmin(data.isSuperAdmin || false);
        // Default the org selector to first org if SUPER_ADMIN
        if (data.isSuperAdmin && data.organizations?.length > 0 && !inviteOrgId) {
          setInviteOrgId(data.organizations[0].id.toString());
        }
      }
    } catch {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteMessage("");
    setInviteUrl("");
    setInviteLoading(true);

    try {
      const body: any = { email: inviteEmail, role: inviteRole };
      if (isSuperAdmin && inviteOrgId) {
        body.organizationId = inviteOrgId;
      }

      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Failed to send invite.");
      } else {
        setInviteMessage(data.message);
        setInviteUrl(data.inviteUrl || "");
        setInviteEmail("");
        setInviteRole("TEACHER");
        fetchData();
      }
    } catch {
      setInviteError("Something went wrong.");
    } finally {
      setInviteLoading(false);
    }
  };

  const toggleUserActive = async (user: User) => {
    setTogglingId(user.id);
    try {
      const res = await fetch("/api/invites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isActive: !user.isActive }),
      });

      const data = await res.json();

      if (res.ok) {
        fetchData();
      } else {
        alert(data.error || "Failed to update user.");
      }
    } catch {
      alert("Something went wrong.");
    } finally {
      setTogglingId(null);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    setInviteMessage("Invite link copied to clipboard!");
  };

  // Filter campuses by selected org for invite form
  const filteredCampuses = isSuperAdmin
    ? campuses.filter((c) => c.organizationId === parseInt(inviteOrgId || "0"))
    : campuses;

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: "bg-purple-100 text-purple-800",
      ORG_ADMIN: "bg-blue-100 text-blue-800",
      CAMPUS_ADMIN: "bg-green-100 text-green-800",
      TEACHER: "bg-yellow-100 text-yellow-800",
      PARENT: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || "bg-gray-100 text-gray-800"}`}
      >
        {role.replace("_", " ")}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Invites</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage users and invite new team members
          </p>
        </div>
        <button
          onClick={() => {
            setShowInviteForm(!showInviteForm);
            setInviteMessage("");
            setInviteUrl("");
            setInviteError("");
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors text-sm"
        >
          {showInviteForm ? "Cancel" : "+ Invite User"}
        </button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            Send an Invitation
          </h3>

          {inviteMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm mb-4">
              {inviteMessage}
              {inviteUrl && (
                <div className="mt-2">
                  <button
                    onClick={copyUrl}
                    className="text-green-700 underline hover:text-green-900 text-xs"
                  >
                    Copy invite link manually
                  </button>
                </div>
              )}
            </div>
          )}
          {inviteError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm mb-4">
              {inviteError}
            </div>
          )}

          <form onSubmit={handleInvite} className="space-y-4">
            {/* Row 1: Org selector (SUPER_ADMIN only) */}
            {isSuperAdmin && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <select
                    value={inviteOrgId}
                    onChange={(e) => setInviteOrgId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select organization...</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campus / School
                    <span className="text-gray-400 font-normal"> (optional)</span>
                  </label>
                  <select
                    disabled={!inviteOrgId}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">All campuses</option>
                    {filteredCampuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Row 2: Email, Role, Submit */}
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teacher@school.com"
                  required
                  className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ORG_ADMIN">Org Admin</option>
                  <option value="CAMPUS_ADMIN">Campus Admin</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="PARENT">Parent</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={inviteLoading || (isSuperAdmin && !inviteOrgId)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {inviteLoading ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Active Users */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Users ({users.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Organization</th>
                    <th className="px-6 py-3">Campus</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-gray-50 ${!user.isActive ? "opacity-60" : ""}`}
                    >
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-3">{roleBadge(user.role)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {user.organization.name}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {user.campus?.name || "—"}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.isActive ? "Active" : "Locked"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => toggleUserActive(user)}
                          disabled={togglingId === user.id}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                            user.isActive
                              ? "text-red-700 bg-red-50 hover:bg-red-100"
                              : "text-green-700 bg-green-50 hover:bg-green-100"
                          } disabled:opacity-50`}
                        >
                          {togglingId === user.id
                            ? "..."
                            : user.isActive
                              ? "Lock"
                              : "Unlock"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-gray-400 text-sm"
                      >
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">
                  Pending Invites ({invites.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Organization</th>
                      <th className="px-6 py-3">Invited By</th>
                      <th className="px-6 py-3">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invites.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {inv.email}
                        </td>
                        <td className="px-6 py-3">{roleBadge(inv.role)}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {inv.organization.name}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {inv.createdBy}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
