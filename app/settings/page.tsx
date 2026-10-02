"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  Store,
  Clock,
  Percent,
  Bike,
  ShieldAlert,
  Phone,
  CheckCircle2,
  RefreshCw,
  Save,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { RestaurantSettings } from "@/types";

export default function StoreSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, hasRole } = useAuth();

  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole(["OWNER"]))) {
      router.replace("/orders");
    }
  }, [user, authLoading, hasRole, router]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<RestaurantSettings>("/staff/settings");
      setSettings(data);
    } catch {
      // offline catch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleOpen = async () => {
    if (!settings) return;
    const nextState = !settings.is_open;
    setSaving(true);
    try {
      const updated = await apiFetch<RestaurantSettings>("/staff/settings", {
        method: "PATCH",
        body: JSON.stringify({ is_open: nextState }),
      });
      setSettings(updated);
      setSuccessMsg(`Store is now marked ${updated.is_open ? "OPEN" : "CLOSED"}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle store state.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      const updated = await apiFetch<RestaurantSettings>("/staff/settings", {
        method: "PATCH",
        body: JSON.stringify({
          opening_time: settings.opening_time,
          closing_time: settings.closing_time,
          tax_percentage: settings.tax_percentage,
          delivery_charge: settings.delivery_charge,
          min_delivery_order: settings.min_delivery_order,
          delivery_area: settings.delivery_area,
          whatsapp_notification_phone: settings.whatsapp_notification_phone,
        }),
      });
      setSettings(updated);
      setSuccessMsg("Restaurant settings updated successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
              <SlidersHorizontal className="w-6 h-6 text-amber-500" />
              <span>Store Configuration</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Owner controls for operating status, store hours, tax %, delivery fees, and minimum orders.
            </p>
          </div>

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading || !settings ? (
            <div className="py-20 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
              <p className="text-xs text-neutral-500">Loading store settings...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Master Open / Closed Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      settings.is_open
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-red-500/20 text-red-400 border border-red-500/40"
                    }`}
                  >
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      Restaurant Master Status: {settings.is_open ? "OPEN" : "CLOSED"}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {settings.is_open
                        ? "Accepting new orders from dine-in QR codes, takeaway, and delivery."
                        : "Orders are blocked on the customer website with a store closed notice."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleToggleOpen}
                  disabled={saving}
                  className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 ${
                    settings.is_open
                      ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                  }`}
                >
                  {settings.is_open ? "Close Restaurant" : "Open Restaurant"}
                </button>
              </div>

              {/* Operating Form */}
              <form onSubmit={handleSaveForm} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider pb-3 border-b border-neutral-800">
                  Business Hours & Financial Controls
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      Opening Time
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-neutral-500 absolute left-4 top-3.5" />
                      <input
                        type="text"
                        value={settings.opening_time}
                        onChange={(e) =>
                          setSettings({ ...settings, opening_time: e.target.value })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      Closing Time
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-neutral-500 absolute left-4 top-3.5" />
                      <input
                        type="text"
                        value={settings.closing_time}
                        onChange={(e) =>
                          setSettings({ ...settings, closing_time: e.target.value })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      Tax Percentage (GST %)
                    </label>
                    <div className="relative">
                      <Percent className="w-4 h-4 text-neutral-500 absolute left-4 top-3.5" />
                      <input
                        type="number"
                        step="0.1"
                        value={settings.tax_percentage}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            tax_percentage: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      Delivery Charge (₹)
                    </label>
                    <div className="relative">
                      <Bike className="w-4 h-4 text-neutral-500 absolute left-4 top-3.5" />
                      <input
                        type="number"
                        step="1"
                        value={settings.delivery_charge}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            delivery_charge: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      Minimum Delivery Order (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={settings.min_delivery_order}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          min_delivery_order: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      WhatsApp Backup Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-500 absolute left-4 top-3.5" />
                      <input
                        type="text"
                        value={settings.whatsapp_notification_phone || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            whatsapp_notification_phone: e.target.value,
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Delivery Area Description
                  </label>
                  <input
                    type="text"
                    value={settings.delivery_area}
                    onChange={(e) =>
                      setSettings({ ...settings, delivery_area: e.target.value })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs font-medium text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-4 border-t border-neutral-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs flex items-center space-x-2 transition-all active:scale-95 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Store Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
