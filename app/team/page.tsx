"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Phone,
  CheckCircle2,
  XCircle,
  KeyRound,
  Lock,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { TeamMember, UserRole } from "@/types";

export default function TeamManagementPage() {
  const router = useRouter();
  const { user, loading: authLoading, hasRole } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("STAFF");
  const [newPin, setNewPin] = useState("1234");
  const [adding, setAdding] = useState(false);

  // Reset PIN modal state
  const [resetMember, setResetMember] = useState<TeamMember | null>(null);
  const [resetPinValue, setResetPinValue] = useState("");
  const [resettingPin, setResettingPin] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole(["OWNER"]))) {
      router.replace("/orders");
    }
  }, [user, authLoading, hasRole, router]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<TeamMember[]>("/staff/team");
      setMembers(data);
    } catch {
      // offline catch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleToggleActive = async (memberId: string) => {
    try {
      const updated = await apiFetch<TeamMember>(`/staff/team/${memberId}/toggle-active`, {
        method: "PATCH",
      });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status.");
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    try {
      await apiFetch(`/staff/team/${memberId}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete team member.");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone || newPhone.trim().length < 10 || !newName.trim()) {
      alert("Please provide valid phone and full name.");
      return;
    }
    const pin = newPin.trim() || "1234";
    if (pin.length < 4) {
      alert("PIN must be at least 4 digits.");
      return;
    }

    setAdding(true);
    try {
      const created = await apiFetch<TeamMember>("/staff/team", {
        method: "POST",
        body: JSON.stringify({
          phone: newPhone.trim(),
          full_name: newName.trim(),
          role: newRole,
          pin: pin,
        }),
      });
      setMembers((prev) => [created, ...prev.filter((m) => m.id !== created.id)]);
      setShowAddModal(false);
      setNewPhone("");
      setNewName("");
      setNewRole("STAFF");
      setNewPin("1234");
      alert(`Team member "${created.full_name}" added successfully with Login PIN: ${pin}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add team member.");
    } finally {
      setAdding(false);
    }
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetMember) return;
    const cleanPin = resetPinValue.trim();
    if (cleanPin.length < 4) {
      alert("PIN must be at least 4 digits.");
      return;
    }

    setResettingPin(true);
    try {
      await apiFetch(`/staff/team/${resetMember.id}/reset-pin`, {
        method: "POST",
        body: JSON.stringify({ new_pin: cleanPin }),
      });
      alert(`Login PIN for ${resetMember.full_name} has been reset to: ${cleanPin}`);
      setResetMember(null);
      setResetPinValue("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reset PIN.");
    } finally {
      setResettingPin(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Title & Action */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                <Users className="w-6 h-6 text-amber-500" />
                <span>Team & Access Control</span>
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Manage staff accounts, assign 4-digit POS PINs, and control access permissions.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs flex items-center space-x-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Team Member</span>
            </button>
          </div>

          {/* Members Table */}
          {loading ? (
            <div className="py-20 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
              <p className="text-xs text-neutral-500">Loading authorized personnel...</p>
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="divide-y divide-neutral-800">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-neutral-950/40 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-amber-400 text-sm">
                        {member.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{member.full_name}</h4>
                        <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-0.5">
                          <Phone className="w-3 h-3 text-neutral-500" />
                          <span>{member.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          member.role === "OWNER"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            : member.role === "MANAGER"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                        }`}
                      >
                        {member.role}
                      </span>

                      {/* Instant Access Toggle */}
                      <button
                        onClick={() => handleToggleActive(member.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          member.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                        }`}
                      >
                        {member.is_active ? "ACTIVE" : "DISABLED"}
                      </button>

                      {/* Reset PIN Button */}
                      {member.role !== "OWNER" && (
                        <button
                          onClick={() => {
                            setResetMember(member);
                            setResetPinValue("1234");
                          }}
                          className="p-2 text-neutral-400 hover:text-amber-400 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Set / Reset 4-digit PIN"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="p-2 text-neutral-500 hover:text-red-400 rounded-xl hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Member Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <h3 className="text-base font-extrabold text-white">Add Team Member</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddMember} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      10-Digit Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      maxLength={10}
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Assigned Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="STAFF">Staff / Cashier (Counter POS Only)</option>
                      <option value="MANAGER">Manager (POS + Live Sold-Out Toggle)</option>
                      <option value="OWNER">Owner (Full Business Authority)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Assigned Login PIN *
                      </label>
                      <span className="text-[10px] text-neutral-500">Min 4 digits (e.g. 1234)</span>
                    </div>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="1234"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={adding}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {adding ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <span>Authorize Person</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Reset PIN Modal */}
          {resetMember && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span>Reset Login PIN</span>
                  </h3>
                  <button
                    onClick={() => setResetMember(null)}
                    className="text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs">
                  <p className="text-neutral-400">Team Member:</p>
                  <p className="font-bold text-white">{resetMember.full_name} ({resetMember.phone})</p>
                </div>

                <form onSubmit={handleResetPinSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      New 4-Digit PIN
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5678"
                      value={resetPinValue}
                      onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 tracking-widest text-center text-sm"
                      autoFocus
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetMember(null)}
                      className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resettingPin}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {resettingPin ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <span>Save New PIN</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
