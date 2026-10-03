"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Search,
  DollarSign,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { MenuItem } from "@/types";

export default function MenuManagerPage() {
  const router = useRouter();
  const { user, loading: authLoading, hasRole } = useAuth();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [updating, setUpdating] = useState(false);

  // Add Dish State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDishName, setNewDishName] = useState("");
  const [newDishCategory, setNewDishCategory] = useState("Pizza");
  const [customCategory, setCustomCategory] = useState("");
  const [newDishPrice, setNewDishPrice] = useState("");
  const [newDishDesc, setNewDishDesc] = useState("");
  const [newDishIsVeg, setNewDishIsVeg] = useState(true);
  const [addingDish, setAddingDish] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole(["MANAGER", "OWNER"]))) {
      router.replace("/orders");
    }
  }, [user, authLoading, hasRole, router]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<MenuItem[]>("/menu/items");
      setItems(data);
    } catch {
      // Catch offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const updated = await apiFetch<{ id: string; is_available: boolean }>(
        `/staff/menu/items/${item.id}/availability`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_available: !item.is_available }),
        }
      );
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: updated.is_available } : i))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle availability.");
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert("Please enter a valid price amount.");
      return;
    }

    setUpdating(true);
    try {
      const result = await apiFetch<{ id: string; new_price: number }>(
        `/staff/menu/items/${editingItem.id}/price`,
        {
          method: "PATCH",
          body: JSON.stringify({
            new_price: parsedPrice,
            reason: priceReason.trim() || "Shift price update",
          }),
        }
      );

      setItems((prev) =>
        prev.map((i) => (i.id === editingItem.id ? { ...i, base_price: result.new_price } : i))
      );
      setEditingItem(null);
      setNewPrice("");
      setPriceReason("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update price.");
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim()) {
      alert("Please enter a dish name.");
      return;
    }
    const price = parseFloat(newDishPrice);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price amount.");
      return;
    }

    const resolvedCategory =
      newDishCategory === "OTHER" ? customCategory.trim() || "General" : newDishCategory;

    setAddingDish(true);
    try {
      const created = await apiFetch<MenuItem>("/staff/menu/items", {
        method: "POST",
        body: JSON.stringify({
          name: newDishName.trim(),
          category_name: resolvedCategory,
          base_price: price,
          description: newDishDesc.trim() || null,
          is_veg: newDishIsVeg,
        }),
      });

      setItems((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewDishName("");
      setNewDishPrice("");
      setNewDishDesc("");
      setCustomCategory("");
      alert(`"${created.name}" added to menu successfully!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add dish.");
    } finally {
      setAddingDish(false);
    }
  };

  const handleDeleteDish = async (item: MenuItem) => {
    const ok = confirm(
      `Are you sure you want to permanently delete "${item.name}" from the menu?\n\nThis will remove it from both the Counter POS and the customer website.`
    );
    if (!ok) return;

    setDeletingId(item.id);
    try {
      await apiFetch(`/staff/menu/items/${item.id}`, {
        method: "DELETE",
      });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete dish.");
    } finally {
      setDeletingId(null);
    }
  };

  const defaultCategories = [
    "Pizza",
    "Garlic Bread",
    "Burger",
    "Maggi",
    "Chinese",
    "Momos",
    "Shakes",
    "Tea & Coffee",
  ];
  const categories = Array.from(
    new Set([...defaultCategories, ...items.map((i) => i.category_name || "General")])
  );

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat =
      categoryFilter === "ALL" || (item.category_name || "General") === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="p-3.5 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-4 sm:space-y-6 pb-28 lg:pb-8">
          {/* Page Title */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                <UtensilsCrossed className="w-6 h-6 text-amber-500" />
                <span>Menu Operations</span>
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Add new dishes, toggle Sold-Out availability, edit prices, or remove items in real time.
              </p>
            </div>
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-black stroke-[3]" />
                <span>Add New Dish</span>
              </button>
              <button
                onClick={fetchMenu}
                className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-amber-500" />
                <span>Refresh Menu</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search food item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setCategoryFilter("ALL")}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  categoryFilter === "ALL"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                All Dishes
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    categoryFilter === cat
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Table / Cards */}
          {loading ? (
            <div className="py-20 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
              <p className="text-xs text-neutral-500">Loading restaurant dishes...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center space-y-2 bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
              <p className="text-sm font-bold text-white">No dishes found</p>
              <p className="text-xs text-neutral-500">Try changing your search or category filter.</p>
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="divide-y divide-neutral-800">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-neutral-950/40 transition-colors"
                  >
                    {/* Item Details */}
                    <div className="flex items-center space-x-3.5 min-w-[220px]">
                      <div
                        className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 ${
                          item.is_veg
                            ? "border-emerald-500/80 bg-emerald-500/10"
                            : "border-red-500/80 bg-red-500/10"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.is_veg ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{item.name}</h4>
                        <span className="text-[11px] text-neutral-400">
                          {item.category_name || "General"}
                        </span>
                      </div>
                    </div>

                    {/* Price with Edit & Delete Button */}
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-xs text-neutral-400 block font-medium">Price</span>
                        <span className="text-sm font-black text-amber-400">
                          ₹{item.base_price.toFixed(0)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setNewPrice(item.base_price.toString());
                        }}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title="Edit Price"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDish(item)}
                        disabled={deletingId === item.id}
                        className="p-2 bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                        title="Delete Dish Permanently"
                      >
                        {deletingId === item.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Availability Switch */}
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded-full ${
                          item.is_available
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {item.is_available ? "AVAILABLE" : "SOLD OUT"}
                      </span>

                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative ${
                          item.is_available ? "bg-emerald-600" : "bg-neutral-800"
                        }`}
                      >
                        <div
                          className={`w-5.5 h-5.5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-md ${
                            item.is_available ? "translate-x-5.5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Edit Modal */}
          {editingItem && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <h3 className="text-base font-extrabold text-white">Update Price</h3>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="text-neutral-400 hover:text-white"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Dish</span>
                  <p className="font-bold text-white text-sm">{editingItem.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Current: ₹{editingItem.base_price.toFixed(2)}
                  </p>
                </div>

                <form onSubmit={handleUpdatePrice} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      New Price (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-xs text-neutral-400 font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="1"
                        placeholder="250"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      Reason for Price Change (Audit Log)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vendor price increase"
                      value={priceReason}
                      onChange={(e) => setPriceReason(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-2xl text-xs font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updating}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                    >
                      {updating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>Save New Price</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add New Dish Modal */}
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-amber-500 stroke-[3]" />
                      <span>Add New Dish to Menu</span>
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      This dish will immediately appear on the Counter POS and Customer Website.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateDish} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Dish Name (Hindi / English) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Paneer Makhani Pizza (पनीर मखनी पिज्जा)"
                      value={newDishName}
                      onChange={(e) => setNewDishName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Category *
                      </label>
                      <select
                        value={newDishCategory}
                        onChange={(e) => setNewDishCategory(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {defaultCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="OTHER">+ Custom / New Category</option>
                      </select>
                      {newDishCategory === "OTHER" && (
                        <input
                          type="text"
                          placeholder="Enter category name..."
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          className="mt-2 w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Base Price (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-xs text-neutral-400 font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="1"
                          required
                          placeholder="150"
                          value={newDishPrice}
                          onChange={(e) => setNewDishPrice(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-8 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Food Type
                    </label>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setNewDishIsVeg(true)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                          newDishIsVeg
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Pure Veg (शाकाहारी)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewDishIsVeg(false)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                          !newDishIsVeg
                            ? "bg-red-500/20 border-red-500 text-red-400"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Non-Veg</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Description / Ingredients (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Fresh cottage cheese, special makhani sauce, capsicum, onion"
                      value={newDishDesc}
                      onChange={(e) => setNewDishDesc(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingDish}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {addingDish ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <span>Add Dish to Menu</span>
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
