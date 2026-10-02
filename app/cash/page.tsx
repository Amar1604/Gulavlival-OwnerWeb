"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Bike,
  RefreshCw,
  Search,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { CashRecord } from "@/types";

export default function CashReceivedPage() {
  const router = useRouter();
  const { user, loading: authLoading, hasRole } = useAuth();

  const [records, setRecords] = useState<CashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole(["MANAGER", "OWNER"]))) {
      router.replace("/orders");
    }
  }, [user, authLoading, hasRole, router]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<CashRecord[]>("/staff/cash");
      setRecords(data);
    } catch {
      // offline catch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleConfirmCash = async (recordId: string) => {
    setConfirmingId(recordId);
    try {
      const updated = await apiFetch<CashRecord>(`/staff/cash/${recordId}/confirm`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setRecords((prev) => prev.map((r) => (r.id === recordId ? updated : r)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to confirm cash receipt.");
    } finally {
      setConfirmingId(null);
    }
  };

  const totalPending = records
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalCollected = records
    .filter((r) => r.status === "RECEIVED")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Title */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                <Banknote className="w-6 h-6 text-amber-500" />
                <span>Delivery Cash Reconciliation</span>
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Track and confirm cash-on-delivery settlements returned by riders after handover.
              </p>
            </div>

            <button
              onClick={fetchRecords}
              className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4 text-amber-500" />
              <span>Refresh Cash List</span>
            </button>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl">
              <span className="text-xs text-neutral-400 font-bold uppercase">
                Pending Rider Cash
              </span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                ₹{totalPending.toFixed(2)}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Cash currently with riders on delivery routes.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl">
              <span className="text-xs text-neutral-400 font-bold uppercase">
                Collected at Counter
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                ₹{totalCollected.toFixed(2)}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Verified and deposited into restaurant counter cash.
              </p>
            </div>
          </div>

          {/* Records Table */}
          {loading ? (
            <div className="py-20 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
              <p className="text-xs text-neutral-500">Loading cash entries...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-20 text-center space-y-2 bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
              <Banknote className="w-8 h-8 mx-auto text-neutral-600" />
              <p className="text-sm font-bold text-white">No delivery cash records</p>
              <p className="text-xs text-neutral-500">
                Delivery orders will appear here automatically once marked Delivered.
              </p>
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="divide-y divide-neutral-800">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-neutral-950/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-white">
                          Order #{record.order_number}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {record.order_type}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        {record.rider_name ? `Rider: ${record.rider_name}` : "Delivery Staff Handover"} •{" "}
                        {new Date(record.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-xs text-neutral-400 block font-medium">Amount</span>
                        <span className="text-base font-black text-amber-400">
                          ₹{record.amount.toFixed(0)}
                        </span>
                      </div>

                      {record.status === "RECEIVED" ? (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center space-x-1.5 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Received</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConfirmCash(record.id)}
                          disabled={confirmingId === record.id}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center space-x-1.5 transition-all active:scale-95 shadow-md shadow-amber-500/20"
                        >
                          {confirmingId === record.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Confirm Cash</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
