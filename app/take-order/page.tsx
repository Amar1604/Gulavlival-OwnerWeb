"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardPenLine,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Utensils,
  ShoppingBag,
  Bike,
  RefreshCw,
  Receipt,
  X,
  ChevronRight,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ThermalReceiptModal } from "@/components/orders/thermal-receipt-modal";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { MenuItem, Order, OrderType } from "@/types";

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export default function TakeOrderPOSPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [dishes, setDishes] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Active Ticket state
  const [ticketItems, setTicketItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [tableNumber, setTableNumber] = useState<string>("1");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cookingNotes, setCookingNotes] = useState("");

  // Mobile Bottom Sheet state
  const [isMobileTicketOpen, setIsMobileTicketOpen] = useState(false);

  // Modal after order placement
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const fetchDishes = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<MenuItem[]>("/menu/items");
      setDishes(data);
    } catch {
      // offline catch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDishes();
  }, []);

  const handleAddItem = (dish: MenuItem) => {
    if (!dish.is_available) return;
    setTicketItems((prev) => {
      const existing = prev.find((item) => item.menuItem.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItem.id === dish.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem: dish, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (dishId: string, delta: number) => {
    setTicketItems((prev) =>
      prev
        .map((item) => {
          if (item.menuItem.id === dishId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (dishId: string) => {
    setTicketItems((prev) => prev.filter((item) => item.menuItem.id !== dishId));
  };

  const handleClearTicket = () => {
    if (ticketItems.length === 0) return;
    if (confirm("Clear current order ticket?")) {
      setTicketItems([]);
      setCookingNotes("");
    }
  };

  const subtotal = ticketItems.reduce(
    (sum, item) => sum + item.menuItem.base_price * item.quantity,
    0
  );
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const grandTotal = subtotal + tax;
  const totalItemCount = ticketItems.reduce((acc, i) => acc + i.quantity, 0);

  const handleSubmitOrder = async () => {
    if (ticketItems.length === 0) {
      alert("Please add at least one item to the order ticket.");
      return;
    }

    if (orderType === "DINE_IN" && !tableNumber.trim()) {
      alert("Please enter a valid table number.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_type: orderType,
        table_number: orderType === "DINE_IN" ? tableNumber.trim() : null,
        customer_name: customerName.trim() || "Walk-in Guest",
        customer_phone: customerPhone.trim() || "9876543210",
        special_instructions: cookingNotes.trim() || null,
        items: ticketItems.map((item) => ({
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
        })),
      };

      const createdOrder = await apiFetch<Order>("/staff/orders/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Clear ticket and show Digital Receipt Slip
      setTicketItems([]);
      setCookingNotes("");
      setIsMobileTicketOpen(false);
      setCompletedOrder(createdOrder);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to place order.");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = Array.from(new Set(dishes.map((d) => d.category_name || "General")));

  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat =
      selectedCategory === "ALL" || (dish.category_name || "General") === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const renderTicketContent = (isMobileSheet = false) => (
    <>
      {/* Mobile Top Drag Indicator */}
      {isMobileSheet && (
        <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto my-2.5 shrink-0" />
      )}

      {/* Ticket Header & Order Type Switcher */}
      <div className="p-3.5 sm:p-4 border-b border-neutral-800 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isMobileSheet && (
              <button
                type="button"
                onClick={() => setIsMobileTicketOpen(false)}
                className="p-1 -ml-1 text-neutral-400 hover:text-white"
                aria-label="Close ticket"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <span className="text-xs font-extrabold text-white uppercase tracking-wider">
              Current Ticket ({totalItemCount})
            </span>
          </div>

          <button
            onClick={handleClearTicket}
            disabled={ticketItems.length === 0}
            className="text-xs text-neutral-400 hover:text-red-400 disabled:opacity-30 font-medium px-2 py-1 rounded"
          >
            Clear Ticket
          </button>
        </div>

        {/* Order Type Toggle */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
          {(["DINE_IN", "TAKEAWAY", "DELIVERY"] as OrderType[]).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center justify-center space-x-1 ${
                orderType === type
                  ? "bg-amber-500 text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {type === "DINE_IN" && <Utensils className="w-3 h-3" />}
              {type === "TAKEAWAY" && <ShoppingBag className="w-3 h-3" />}
              {type === "DELIVERY" && <Bike className="w-3 h-3" />}
              <span>{type === "DINE_IN" ? "Dine-In" : type === "TAKEAWAY" ? "Takeaway" : "Delivery"}</span>
            </button>
          ))}
        </div>

        {/* Dine-in Table Selector */}
        {orderType === "DINE_IN" && (
          <div className="flex items-center space-x-2 pt-0.5">
            <span className="text-xs font-bold text-neutral-400 shrink-0">Table:</span>
            <div className="flex-1 flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTableNumber(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold shrink-0 border transition-all ${
                    tableNumber === t
                      ? "bg-amber-500 text-black border-amber-400 shadow-sm"
                      : "bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  T-{t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Items List */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 min-h-[140px]">
        {ticketItems.length === 0 ? (
          <div className="py-12 sm:py-20 text-center space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-neutral-600" />
            <p className="text-xs text-neutral-400 font-semibold">Ticket is empty</p>
            <p className="text-[11px] text-neutral-500">
              Tap dishes to add to the order ticket.
            </p>
          </div>
        ) : (
          ticketItems.map((item) => (
            <div
              key={item.menuItem.id}
              className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between shadow-sm"
            >
              <div className="min-w-0 pr-2">
                <h4 className="text-xs font-bold text-white truncate">
                  {item.menuItem.name}
                </h4>
                <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
                  ₹{(item.menuItem.base_price * item.quantity).toFixed(0)}
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {/* Quantity Stepper */}
                <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-0.5">
                  <button
                    onClick={() => handleUpdateQuantity(item.menuItem.id, -1)}
                    className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white active:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-extrabold text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(item.menuItem.id, 1)}
                    className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white active:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => handleRemoveItem(item.menuItem.id)}
                  className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cooking Notes Input */}
      <div className="px-3.5 sm:px-4 py-2 border-t border-neutral-800 shrink-0 bg-neutral-900/40">
        <input
          type="text"
          placeholder="Kitchen cooking instructions (optional)..."
          value={cookingNotes}
          onChange={(e) => setCookingNotes(e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Calculations & Submit Action */}
      <div className="p-3.5 sm:p-4 border-t border-neutral-800 bg-neutral-950 space-y-3 shrink-0 pb-safe">
        <div className="space-y-1.5 text-xs text-neutral-400">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST (5%)</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm sm:text-base font-black text-white pt-1.5 border-t border-neutral-800">
            <span>Total (Cash)</span>
            <span className="text-amber-400">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleSubmitOrder}
          disabled={submitting || ticketItems.length === 0}
          className="w-full py-3.5 sm:py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center space-x-2 transition-all shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-40"
        >
          {submitting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>SUBMIT ORDER & PRINT RECEIPT</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <div className="flex-1 flex min-h-0 relative">
          {/* Dish Catalog Grid (Full width on mobile, left on desktop) */}
          <section className="flex-1 flex flex-col border-r-0 lg:border-r border-neutral-800 bg-neutral-950 overflow-hidden">
            {/* Search & Category Pills */}
            <div className="p-3 sm:p-4 border-b border-neutral-800 space-y-2.5 sm:space-y-3 bg-neutral-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center space-x-2">
                      <ClipboardPenLine className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                      <span>Take Order (POS)</span>
                    </h2>
                    <p className="text-[11px] text-neutral-400">
                      Tap dishes to add to ticket.
                    </p>
                  </div>

                  {/* Mobile Quick Ticket Counter Button */}
                  <button
                    type="button"
                    onClick={() => setIsMobileTicketOpen(true)}
                    className="lg:hidden flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-700 hover:border-amber-500/50 rounded-xl text-xs font-bold text-amber-400 active:scale-95 transition-all"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Ticket ({totalItemCount})</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5 sm:top-3" />
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedCategory === "ALL"
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  All Items
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      selectedCategory === cat
                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                        : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Dishes Grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-28 lg:pb-6">
              {loading ? (
                <div className="py-20 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                  <p className="text-xs text-neutral-500">Loading food catalog...</p>
                </div>
              ) : filteredDishes.length === 0 ? (
                <div className="py-20 text-center text-xs text-neutral-500">
                  No food items found matching criteria.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                  {filteredDishes.map((dish) => {
                    const cartItem = ticketItems.find((i) => i.menuItem.id === dish.id);
                    return (
                      <button
                        key={dish.id}
                        disabled={!dish.is_available}
                        onClick={() => handleAddItem(dish)}
                        className={`p-3 sm:p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.97] relative group ${
                          !dish.is_available
                            ? "bg-neutral-900/40 border-neutral-800/40 opacity-50 cursor-not-allowed"
                            : cartItem
                            ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10"
                            : "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
                        }`}
                      >
                        {/* Veg / Non-Veg Indicator & Sold-out Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              dish.is_veg
                                ? "border-emerald-500/80 bg-emerald-500/10"
                                : "border-red-500/80 bg-red-500/10"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                dish.is_veg ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            />
                          </div>

                          {!dish.is_available ? (
                            <span className="text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                              Sold Out
                            </span>
                          ) : cartItem ? (
                            <span className="text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500 text-black">
                              {cartItem.quantity} in ticket
                            </span>
                          ) : null}
                        </div>

                        {/* Title & Category */}
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                            {dish.name}
                          </h4>
                          <span className="text-[10px] text-neutral-400 block truncate">
                            {dish.category_name || "General"}
                          </span>
                        </div>

                        {/* Price */}
                        <div className="mt-2.5 sm:mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                          <span className="text-xs font-extrabold text-amber-400">
                            ₹{dish.base_price.toFixed(0)}
                          </span>
                          <span className="w-6 h-6 rounded-lg bg-neutral-800 group-hover:bg-amber-500 group-hover:text-black text-neutral-300 flex items-center justify-center text-xs font-bold transition-colors">
                            +
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Desktop Persistent Ticket Aside */}
          <aside className="hidden lg:flex w-96 xl:w-[400px] bg-neutral-900 border-l border-neutral-800 flex-col shrink-0">
            {renderTicketContent(false)}
          </aside>

          {/* Mobile Floating Action Bar (When items in ticket) */}
          {ticketItems.length > 0 && (
            <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in slide-in-from-bottom-2 duration-200">
              <button
                type="button"
                onClick={() => setIsMobileTicketOpen(true)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black px-4 py-3 rounded-2xl font-extrabold text-sm flex items-center justify-between shadow-2xl shadow-amber-500/40 active:scale-[0.98] transition-all border border-amber-400 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span className="bg-black text-amber-400 px-2 py-0.5 rounded-lg text-xs font-black">
                    {totalItemCount}
                  </span>
                  <span>View Ticket & Fire</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-base font-black">₹{grandTotal.toFixed(0)}</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            </div>
          )}

          {/* Mobile Bottom Sheet Modal */}
          {isMobileTicketOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
              <div
                className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
                onClick={() => setIsMobileTicketOpen(false)}
                aria-hidden="true"
              />
              <div className="relative w-full max-h-[88vh] bg-neutral-900 border-t border-neutral-800 rounded-t-3xl flex flex-col shadow-2xl z-10 overflow-hidden animate-in slide-in-from-bottom duration-300">
                {renderTicketContent(true)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completed Order Thermal Receipt Modal */}
      {completedOrder && (
        <ThermalReceiptModal
          order={completedOrder}
          onClose={() => setCompletedOrder(null)}
        />
      )}
    </div>
  );
}
