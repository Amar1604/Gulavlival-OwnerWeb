"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Clock,
  Printer,
  CheckCircle2,
  Bike,
  Utensils,
  ShoppingBag,
  RefreshCw,
  Phone,
  MapPin,
  FileText,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ThermalReceiptModal } from "@/components/orders/thermal-receipt-modal";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { audioEngine } from "@/lib/audio-alert";
import { Order, OrderStatus } from "@/types";

export default function OrderInboxPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewReceiptOrder, setViewReceiptOrder] = useState<Order | null>(null);
  const [todayStats, setTodayStats] = useState<{
    total_orders: number;
    total_revenue: number;
    active_orders: number;
    delivered_orders: number;
  } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Fetch orders from backend
  const fetchOrders = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await apiFetch<Order[]>("/staff/orders?limit=100");
      setOrders(data);

      // Check if unconfirmed orders exist to maintain audio alarm
      const unconfirmed = data.some((o) => o.status === "RECEIVED");
      if (unconfirmed) {
        audioEngine?.startAlarmLoop();
      } else {
        audioEngine?.stopAlarmLoop();
      }

      // Preserve or set selected order
      setSelectedOrder((prev) => {
        if (prev) {
          const updated = data.find((o) => o.id === prev.id);
          return updated || (data.length > 0 ? data[0] : null);
        }
        return data.length > 0 ? data[0] : null;
      });

      // Fetch today's order count & sales summary
      apiFetch<{
        total_orders: number;
        total_revenue: number;
        active_orders: number;
        delivered_orders: number;
      }>("/staff/orders/stats/today")
        .then(setTodayStats)
        .catch(() => {});
    } catch {
      // Offline/fetch catch
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Initialize Polling & WebSocket connection
  useEffect(() => {
    fetchOrders();

    // 8-second safety fallback polling
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 8000);

    // WebSocket real-time connection
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/orders";
    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === "NEW_ORDER") {
            audioEngine?.playChime();
            audioEngine?.startAlarmLoop();
            fetchOrders(true);
          }
        } catch {
          // JSON parse catch
        }
      };

      ws.onerror = () => {};
    } catch {
      // WebSocket setup catch
    }

    return () => {
      clearInterval(interval);
      audioEngine?.stopAlarmLoop();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [fetchOrders]);

  const handleConfirmOrder = async (orderId: string) => {
    setActionLoading(true);
    try {
      const updated = await apiFetch<Order>(`/staff/orders/${orderId}/confirm`, {
        method: "POST",
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setSelectedOrder(updated);

      // Check if any remaining received orders
      const remainingUnconfirmed = orders.some(
        (o) => o.id !== orderId && o.status === "RECEIVED"
      );
      if (!remainingUnconfirmed) {
        audioEngine?.stopAlarmLoop();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to confirm order.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    setActionLoading(true);
    try {
      const updated = await apiFetch<Order>(`/staff/orders/${orderId}/delivered`, {
        method: "POST",
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setSelectedOrder(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to mark delivered.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintKOT = () => {
    window.print();
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "ALL") return true;
    return order.status === statusFilter;
  });

  const unreadCount = orders.filter((o) => o.status === "RECEIVED").length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header unreadCount={unreadCount} />

        {/* 2-Column Counter Tablet Workspace */}
        <div className="flex-1 flex min-h-0">
          {/* LEFT COLUMN: Order List */}
          <section className="w-full lg:w-96 xl:w-[420px] border-r border-neutral-800 flex flex-col bg-neutral-950 shrink-0">
            {/* Today's Shift Counter */}
            {todayStats && (
              <div className="p-3.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                    Today&apos;s Total Orders
                  </span>
                  <span className="font-black text-white text-base">
                    {todayStats.total_orders} Orders
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                    Today&apos;s Gross Sales
                  </span>
                  <span className="font-black text-amber-400 text-base">
                    ₹{todayStats.total_revenue.toFixed(0)}
                  </span>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="p-3 border-b border-neutral-800 bg-neutral-900/50 flex space-x-1.5 overflow-x-auto no-scrollbar">
              {[
                { label: "All", value: "ALL", count: orders.length },
                {
                  label: "New",
                  value: "RECEIVED",
                  count: unreadCount,
                  highlight: unreadCount > 0,
                },
                {
                  label: "Cooking",
                  value: "CONFIRMED",
                  count: orders.filter((o) => o.status === "CONFIRMED").length,
                },
                {
                  label: "Delivered",
                  value: "DELIVERED",
                  count: orders.filter((o) => o.status === "DELIVERED").length,
                },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 transition-all ${
                    statusFilter === tab.value
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      tab.highlight
                        ? "bg-red-600 text-white font-extrabold animate-pulse"
                        : statusFilter === tab.value
                        ? "bg-black/20 text-black font-extrabold"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* List Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {loading ? (
                <div className="py-20 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                  <p className="text-xs text-neutral-500 font-medium">Syncing orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-neutral-600" />
                  <p className="text-xs text-neutral-500 font-medium">
                    No orders in this category
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  const isReceived = order.status === "RECEIVED";
                  const isConfirmed = order.status === "CONFIRMED";

                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all relative ${
                        isReceived
                          ? "bg-red-950/20 border-red-500/60 shadow-lg shadow-red-500/10 animate-pulse"
                          : isSelected
                          ? "bg-neutral-900 border-amber-500/60 shadow-md shadow-amber-500/10"
                          : "bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-900 hover:border-neutral-700"
                      }`}
                    >
                      {/* Top Row: Type & Order # */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-neutral-400">
                          #{order.order_number.slice(-8)}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                              order.order_type === "DINE_IN"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : order.order_type === "DELIVERY"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {order.order_type === "DINE_IN" && <Utensils className="w-3 h-3" />}
                            {order.order_type === "DELIVERY" && <Bike className="w-3 h-3" />}
                            {order.order_type === "TAKEAWAY" && <ShoppingBag className="w-3 h-3" />}
                            <span>{order.order_type}</span>
                          </span>
                        </div>
                      </div>

                      {/* Prominent Table Number or Customer */}
                      <div className="flex items-baseline justify-between mb-2">
                        {order.table_number ? (
                          <div className="text-base font-black text-white tracking-wide">
                            TABLE {order.table_number}
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-white truncate max-w-[180px]">
                            {order.customer_name}
                          </div>
                        )}
                        <span className="text-sm font-extrabold text-amber-400">
                          ₹{order.total.toFixed(0)}
                        </span>
                      </div>

                      {/* Item Preview */}
                      <div className="text-xs text-neutral-400 truncate mb-2">
                        {order.items.map((i) => `${i.quantity}× ${i.item_name_snapshot}`).join(", ")}
                      </div>

                      {/* Status indicator bar */}
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-neutral-800/80">
                        <div className="flex items-center space-x-1 text-neutral-500">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <span
                          className={`font-extrabold text-[10px] uppercase ${
                            isReceived
                              ? "text-red-400 animate-pulse"
                              : isConfirmed
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {order.status === "RECEIVED" ? "● NEW (NEEDS ACCEPT)" : order.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: Order Detail & Actions */}
          <main className="flex-1 bg-neutral-900/30 flex flex-col overflow-y-auto">
            {selectedOrder ? (
              <div className="p-6 lg:p-8 max-w-3xl mx-auto w-full space-y-6">
                {/* Header Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-neutral-800">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-extrabold text-white">
                          Order #{selectedOrder.order_number}
                        </h2>
                        <span
                          className={`text-xs font-black uppercase px-2.5 py-1 rounded-full ${
                            selectedOrder.status === "RECEIVED"
                              ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                              : selectedOrder.status === "CONFIRMED"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          }`}
                        >
                          {selectedOrder.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Received on{" "}
                        {new Date(selectedOrder.created_at).toLocaleDateString()} at{" "}
                        {new Date(selectedOrder.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewReceiptOrder(selectedOrder)}
                        className="px-3.5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all border border-amber-500/40"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>View Receipt Slip</span>
                      </button>
                      <button
                        onClick={handlePrintKOT}
                        className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all border border-neutral-700"
                      >
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>Print KOT Ticket</span>
                      </button>
                    </div>
                  </div>

                  {/* High Visibility Table Display for Dine-In */}
                  {selectedOrder.table_number && (
                    <div className="my-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">
                          Dining Area
                        </span>
                        <div className="text-3xl font-black text-white tracking-wider">
                          TABLE {selectedOrder.table_number}
                        </div>
                      </div>
                      <Utensils className="w-10 h-10 text-amber-400/40" />
                    </div>
                  )}

                  {/* Customer Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 text-xs">
                    <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold">
                        Customer Details
                      </span>
                      <p className="font-bold text-white mt-1 text-sm">
                        {selectedOrder.customer_name}
                      </p>
                      <p className="text-neutral-400 flex items-center space-x-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{selectedOrder.customer_phone}</span>
                      </p>
                    </div>

                    <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold">
                        Delivery / Order Type
                      </span>
                      <p className="font-bold text-white mt-1 text-sm flex items-center space-x-1">
                        <span>{selectedOrder.order_type}</span>
                      </p>
                      {selectedOrder.delivery_address && (
                        <p className="text-neutral-400 flex items-start space-x-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{selectedOrder.delivery_address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Order Items ({selectedOrder.items.length})
                  </h3>

                  <div className="divide-y divide-neutral-800">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="py-3.5 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-extrabold text-xs flex items-center justify-center border border-amber-500/30">
                            {item.quantity}×
                          </span>
                          <div>
                            <p className="text-sm font-bold text-white">
                              {item.item_name_snapshot}
                            </p>
                            {item.variant_name_snapshot && (
                              <p className="text-xs text-neutral-400">
                                Variant: {item.variant_name_snapshot}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-extrabold text-neutral-200">
                          ₹{item.line_total.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Special Cooking Instructions */}
                  {selectedOrder.special_instructions && (
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start space-x-3 text-xs text-amber-300">
                      <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">Special Notes / Change:</strong>
                        <span>{selectedOrder.special_instructions}</span>
                      </div>
                    </div>
                  )}

                  {/* Financial Breakdown */}
                  <div className="pt-4 border-t border-neutral-800 space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-400">
                      <span>Subtotal</span>
                      <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Taxes (5% GST)</span>
                      <span>₹{selectedOrder.tax.toFixed(2)}</span>
                    </div>
                    {selectedOrder.delivery_charge > 0 && (
                      <div className="flex justify-between text-neutral-400">
                        <span>Delivery Fee</span>
                        <span>₹{selectedOrder.delivery_charge.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-neutral-800">
                      <span>Total COD Amount</span>
                      <span className="text-amber-400">
                        ₹{selectedOrder.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-12">
                  <button
                    onClick={() => handleConfirmOrder(selectedOrder.id)}
                    disabled={actionLoading || selectedOrder.status !== "RECEIVED"}
                    className={`p-4 rounded-2xl font-extrabold text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${
                      selectedOrder.status === "RECEIVED"
                        ? "bg-amber-500 hover:bg-amber-400 text-black shadow-xl shadow-amber-500/25 ring-2 ring-amber-400"
                        : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      {selectedOrder.status === "RECEIVED"
                        ? "CONFIRM & SEND TO KITCHEN"
                        : "ORDER CONFIRMED"}
                    </span>
                  </button>

                  <button
                    onClick={() => handleDeliverOrder(selectedOrder.id)}
                    disabled={actionLoading || selectedOrder.status === "DELIVERED"}
                    className={`p-4 rounded-2xl font-extrabold text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${
                      selectedOrder.status === "CONFIRMED"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/25"
                        : selectedOrder.status === "DELIVERED"
                        ? "bg-neutral-800 text-emerald-400 cursor-not-allowed"
                        : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    }`}
                  >
                    <Bike className="w-5 h-5" />
                    <span>
                      {selectedOrder.status === "DELIVERED"
                        ? "DELIVERED & CASH PAID"
                        : "MARK AS DELIVERED"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="m-auto text-center p-12">
                <Inbox className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No Order Selected</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Select an order from the left column to view details and kitchen dispatch.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {viewReceiptOrder && (
        <ThermalReceiptModal
          order={viewReceiptOrder}
          onClose={() => setViewReceiptOrder(null)}
        />
      )}
    </div>
  );
}
