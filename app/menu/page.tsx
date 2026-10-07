"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
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
  Camera,
  Upload,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { uploadFoodPhotoToSupabase } from "@/lib/supabase-storage";
import { MenuItem } from "@/types";

export default function MenuManagerPage() {
  const router = useRouter();
  const { user, loading: authLoading, hasRole } = useAuth();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Edit Dish Modal State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editIsVeg, setEditIsVeg] = useState(true);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [updatingDish, setUpdatingDish] = useState(false);

  // Add Dish Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDishName, setNewDishName] = useState("");
  const [newDishCategory, setNewDishCategory] = useState("Pizza");
  const [customCategory, setCustomCategory] = useState("");
  const [newDishPrice, setNewDishPrice] = useState("");
  const [newDishDesc, setNewDishDesc] = useState("");
  const [newDishIsVeg, setNewDishIsVeg] = useState(true);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [addingDish, setAddingDish] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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

  // Real-Time Menu WebSocket Synchronization for Owner Dashboard
  useEffect(() => {
    const wsUrl = (
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/orders"
    ).replace("/ws/orders", "/ws/menu");

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "AVAILABILITY_CHANGED") {
              setItems((prev) =>
                prev.map((i) =>
                  i.id === data.item_id ? { ...i, is_available: data.is_available } : i
                )
              );
            } else if (data.type === "PRICE_CHANGED") {
              setItems((prev) =>
                prev.map((i) =>
                  i.id === data.item_id ? { ...i, base_price: data.new_price } : i
                )
              );
            } else if (data.type === "MENU_ITEM_UPDATED" && data.item) {
              setItems((prev) =>
                prev.map((i) => (i.id === data.item.id ? { ...i, ...data.item } : i))
              );
            } else if (data.type === "MENU_ITEM_CREATED" && data.item) {
              setItems((prev) => {
                if (prev.some((i) => i.id === data.item.id)) return prev;
                return [data.item, ...prev];
              });
            } else if (data.type === "MENU_ITEM_DELETED") {
              setItems((prev) => prev.filter((i) => i.id !== data.item_id));
            }
          } catch {
            // Ignore non-json
          }
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connectWs, 5000);
        };
      } catch {
        // Fallback
      }
    };

    connectWs();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Quick Sold Out / Available toggle
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

  // Open Edit Dish Modal
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category_name || "General");
    setEditPrice(item.base_price.toString());
    setEditDesc(item.description || "");
    setEditIsVeg(item.is_veg);
    setEditImageUrl(item.image_url || "");
    setEditPhotoFile(null);
    setEditPhotoPreview(item.image_url || null);
  };

  // Handle Photo Pick for Add Dish
  const handlePhotoSelectAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPhotoFile(file);
      const preview = URL.createObjectURL(file);
      setNewPhotoPreview(preview);
    }
  };

  // Handle Photo Pick for Edit Dish
  const handlePhotoSelectEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditPhotoFile(file);
      const preview = URL.createObjectURL(file);
      setEditPhotoPreview(preview);
    }
  };

  // Save Dish Edits
  const handleSaveEditDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const parsedPrice = parseFloat(editPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert("Please enter a valid price amount.");
      return;
    }

    setUpdatingDish(true);
    try {
      let finalImageUrl = editImageUrl;

      // If a new photo was selected, upload directly to Supabase Storage
      if (editPhotoFile) {
        finalImageUrl = await uploadFoodPhotoToSupabase(editPhotoFile);
      }

      const result = await apiFetch<MenuItem>(`/staff/menu/items/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName.trim(),
          category_name: editCategory.trim(),
          base_price: parsedPrice,
          description: editDesc.trim() || null,
          is_veg: editIsVeg,
          image_url: finalImageUrl || null,
        }),
      });

      setItems((prev) =>
        prev.map((i) => (i.id === editingItem.id ? { ...i, ...result } : i))
      );
      setEditingItem(null);
      alert(`"${result.name}" updated successfully! Changes are live on customer website.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update dish.");
    } finally {
      setUpdatingDish(false);
    }
  };

  // Create New Dish
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
      let uploadedImageUrl: string | null = null;

      // If owner took or selected a photo, upload it to Supabase Storage
      if (newPhotoFile) {
        uploadedImageUrl = await uploadFoodPhotoToSupabase(newPhotoFile);
      }

      const created = await apiFetch<MenuItem>("/staff/menu/items", {
        method: "POST",
        body: JSON.stringify({
          name: newDishName.trim(),
          category_name: resolvedCategory,
          base_price: price,
          description: newDishDesc.trim() || null,
          is_veg: newDishIsVeg,
          image_url: uploadedImageUrl,
        }),
      });

      setItems((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewDishName("");
      setNewDishPrice("");
      setNewDishDesc("");
      setCustomCategory("");
      setNewPhotoFile(null);
      setNewPhotoPreview(null);
      alert(`"${created.name}" added to menu and live on customer website!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add dish.");
    } finally {
      setAddingDish(false);
    }
  };

  // Delete Dish
  const handleDeleteDish = async (item: MenuItem) => {
    const ok = confirm(
      `Are you sure you want to permanently delete "${item.name}" from the menu?\n\nThis will remove it instantly from both the Counter POS and the customer website.`
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
          {/* Page Title & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                <UtensilsCrossed className="w-6 h-6 text-amber-500" />
                <span>Live Menu Operations</span>
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Upload real photos, edit prices & details, or toggle Sold-Out status. All changes reflect in real time on customer website.
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
              <p className="text-xs text-neutral-500">Loading live restaurant dishes...</p>
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
                    {/* Item Thumbnail & Details */}
                    <div className="flex items-center space-x-3.5 min-w-[240px]">
                      {/* Real Image Thumbnail or Placeholder */}
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 border border-neutral-700/60 shrink-0 flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-neutral-500" />
                        )}
                        {/* Veg / Non-Veg Dot */}
                        <div
                          className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-xs border flex items-center justify-center bg-black/60 ${
                            item.is_veg ? "border-emerald-500" : "border-red-500"
                          }`}
                        >
                          <div
                            className={`w-1 h-1 rounded-full ${
                              item.is_veg ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-white">{item.name}</h4>
                          {!item.image_url && (
                            <span className="text-[9px] bg-neutral-800 text-amber-400 px-1.5 py-0.5 rounded-md font-medium border border-amber-500/20">
                              No photo
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-400 block">
                          {item.category_name || "General"}
                        </span>
                      </div>
                    </div>

                    {/* Price, Edit & Delete */}
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-xs text-neutral-400 block font-medium">Price</span>
                        <span className="text-sm font-black text-amber-400">
                          ₹{item.base_price.toFixed(0)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                        title="Edit Dish & Photo"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] font-semibold hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDish(item)}
                        disabled={deletingId === item.id}
                        className="p-2 bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                        title="Delete Dish"
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

          {/* EDIT DISH MODAL (With Photo Upload) */}
          {editingItem && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                    <Edit2 className="w-4 h-4 text-amber-500" />
                    <span>Edit Dish & Photo</span>
                  </h3>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditDish} className="space-y-4">
                  {/* Photo Upload & Preview */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Food Photo (Supabase Cloud Storage)
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="relative w-20 h-20 rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                        {editPhotoPreview ? (
                          <img
                            src={editPhotoPreview}
                            alt="Dish Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-7 h-7 text-neutral-600" />
                        )}
                        {editPhotoPreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditPhotoFile(null);
                              setEditPhotoPreview(null);
                              setEditImageUrl("");
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full transition-colors"
                            title="Remove Photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <input
                          type="file"
                          ref={editFileInputRef}
                          accept="image/*"
                          onChange={handlePhotoSelectEdit}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 border border-neutral-700 transition-colors cursor-pointer w-full justify-center"
                        >
                          <Camera className="w-4 h-4 text-amber-400" />
                          <span>{editPhotoPreview ? "Change Photo / Take New" : "Upload Photo / Camera"}</span>
                        </button>
                        <p className="text-[10px] text-neutral-400">
                          Takes photo from mobile camera or gallery. Automatically uploaded to Supabase.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dish Name */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Dish Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Category & Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Category *
                      </label>
                      <input
                        type="text"
                        required
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
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
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-8 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Veg / Non-Veg */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Dietary Type
                    </label>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditIsVeg(true)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                          editIsVeg
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Pure Veg (शाकाहारी)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditIsVeg(false)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                          !editIsVeg
                            ? "bg-red-500/20 border-red-500 text-red-400"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Non-Veg</span>
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Description / Ingredients
                    </label>
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingDish}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {updatingDish ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-black" />
                          <span>Saving & Uploading...</span>
                        </>
                      ) : (
                        <span>Save & Push Live</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ADD NEW DISH MODAL (With Photo Upload) */}
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-amber-500 stroke-[3]" />
                      <span>Add New Dish to Menu</span>
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      This dish will appear in real time on the customer website and counter POS.
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
                  {/* Photo Upload & Preview */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Food Photo (Upload from device or take photo)
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="relative w-20 h-20 rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                        {newPhotoPreview ? (
                          <img
                            src={newPhotoPreview}
                            alt="Dish Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-7 h-7 text-neutral-600" />
                        )}
                        {newPhotoPreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewPhotoFile(null);
                              setNewPhotoPreview(null);
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full transition-colors"
                            title="Remove Photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <input
                          type="file"
                          ref={addFileInputRef}
                          accept="image/*"
                          onChange={handlePhotoSelectAdd}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => addFileInputRef.current?.click()}
                          className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 border border-neutral-700 transition-colors cursor-pointer w-full justify-center"
                        >
                          <Camera className="w-4 h-4 text-amber-400" />
                          <span>{newPhotoPreview ? "Change Photo" : "Upload Photo / Camera"}</span>
                        </button>
                        <p className="text-[10px] text-neutral-400">
                          Takes photo from camera or gallery. Stored on Supabase Storage.
                        </p>
                      </div>
                    </div>
                  </div>

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
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-black" />
                          <span>Uploading & Adding...</span>
                        </>
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
