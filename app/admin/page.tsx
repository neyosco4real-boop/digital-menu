"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface MenuItem {
  id: string;
  title: string;
  price: number;
  category: string;
  image_url?: string;
  description?: string;
}

interface CartItem {
  id: string;
  title?: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  table_number: string;
  items: CartItem[];
  total_price: number;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "qrcodes">("orders");

  // Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Modal / Form States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    price: "",
    category: "Restaurant",
    image_url: "",
    description: "",
  });

  const prevOrderCountRef = useRef<number>(0);

  // Sound Alarm Chime using Web Audio API
  const playAlertSound = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.25);
      gain2.gain.setValueAtTime(0.5, ctx.currentTime + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  // Fetch Dashboard Data
  const fetchAllData = async (manualRefresh = false) => {
    if (manualRefresh) setIsRefreshing(true);

    const [ordersRes, menuRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("menu_items").select("*").order("created_at", { ascending: false }),
    ]);

    if (!ordersRes.error && ordersRes.data) {
      if (prevOrderCountRef.current > 0 && ordersRes.data.length > prevOrderCountRef.current) {
        if (soundEnabled) playAlertSound();
      }
      prevOrderCountRef.current = ordersRes.data.length;
      setOrders(ordersRes.data);
    }

    if (!menuRes.error && menuRes.data) {
      setMenuItems(menuRes.data);
    }

    setLoading(false);
    setIsRefreshing(false);
  };

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState) playAlertSound();
  };

  useEffect(() => {
    fetchAllData();

    // Realtime Supabase Subscription
    const channel = supabase
      .channel("realtime-admin-hub")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          setOrders((prev) => [payload.new as Order, ...prev]);
          if (soundEnabled) playAlertSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  // Order Status Updates
  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    }
  };

  // Menu Items CRUD
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      price: parseFloat(formData.price) || 0,
      category: formData.category,
      image_url: formData.image_url || null,
      description: formData.description,
    };

    if (editingItem) {
      const { error } = await supabase.from("menu_items").update(payload).eq("id", editingItem.id);
      if (!error) {
        setMenuItems((prev) =>
          prev.map((item) => (item.id === editingItem.id ? { ...item, ...payload } : item))
        );
      }
    } else {
      const { data, error } = await supabase.from("menu_items").insert([payload]).select("*");
      if (!error && data) {
        setMenuItems((prev) => [data[0], ...prev]);
      }
    }

    closeModal();
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (!error) {
      setMenuItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ title: "", price: "", category: "Restaurant", image_url: "", description: "" });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      price: item.price.toString(),
      category: item.category || "Restaurant",
      image_url: item.image_url || "",
      description: item.description || "",
    });
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="min-h-screen bg-[#030406] text-white font-sans selection:bg-amber-500/30 pb-20">
      
      {/* 5. Switch button & Top Header Control Bar */}
      <header className="sticky top-0 z-40 bg-[#0b0c12]/95 backdrop-blur-xl border-b border-neutral-800/90 px-4 md:px-8 py-4 shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]" />
            <h1 className="text-xl font-black tracking-tight text-white">
              ADMIN CONTROL CENTER
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            
            {/* Switch to Customer Menu Button */}
            <Link
              href="/menu/1"
              target="_blank"
              className="bg-[#12141e] hover:bg-neutral-800 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md flex items-center gap-2"
            >
              <span>🌐</span>
              <span>View Customer Menu</span>
            </Link>

            {/* Sound Notification Toggle */}
            <button
              onClick={toggleSound}
              className={`px-3.5 py-2 text-xs font-black uppercase rounded-xl border transition-all ${
                soundEnabled
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "bg-[#12141e] text-neutral-400 border-neutral-800 hover:text-white"
              }`}
            >
              {soundEnabled ? "🔔 Alarm ON" : "🔕 Sound Off"}
            </button>

            {/* 6. & 8. Refresh Button */}
            <button
              onClick={() => fetchAllData(true)}
              disabled={isRefreshing}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-50 shadow-lg flex items-center gap-2"
            >
              <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6">
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase transition-all ${
              activeTab === "orders"
                ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                : "bg-[#0b0c12] text-neutral-400 border border-neutral-800 hover:text-white"
            }`}
          >
            📋 Live Orders ({orders.filter((o) => o.status !== "Completed").length})
          </button>

          <button
            onClick={() => setActiveTab("menu")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase transition-all ${
              activeTab === "menu"
                ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                : "bg-[#0b0c12] text-neutral-400 border border-neutral-800 hover:text-white"
            }`}
          >
            🍽️ Menu Items ({menuItems.length})
          </button>

          <button
            onClick={() => setActiveTab("qrcodes")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase transition-all ${
              activeTab === "qrcodes"
                ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                : "bg-[#0b0c12] text-neutral-400 border border-neutral-800 hover:text-white"
            }`}
          >
            📱 Table QR Codes (1-10)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-6">
        
        {/* 7. LIVE ORDERS PANEL */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-amber-400">
              LIVE ORDERS PANEL
            </h2>

            {loading ? (
              <div className="text-center py-20 text-amber-500/70 text-xs font-black uppercase tracking-[0.2em] animate-pulse">
                Fetching Realtime Orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 bg-[#0b0c12] border border-neutral-800 rounded-3xl text-neutral-500 text-xs font-bold uppercase tracking-widest">
                No orders registered yet
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#0b0c12]/95 border border-neutral-800 hover:border-amber-500/40 p-6 rounded-3xl shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-xl text-xs font-black uppercase">
                        Table/Suite #{order.table_number || "1"}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                          order.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : order.status === "Preparing"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse"
                        }`}
                      >
                        {order.status || "Pending"}
                      </span>
                    </div>

                    <div className="bg-[#12141e] border border-neutral-800 p-4 rounded-2xl space-y-1.5">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-neutral-200 font-medium">
                            <strong className="text-amber-400 font-bold mr-2">
                              {item.quantity}x
                            </strong>
                            {item.title}
                          </span>
                          <span className="text-neutral-400 font-mono">
                            ₦{((item.price || 0) * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end justify-between gap-4 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block">
                        TOTAL AMOUNT
                      </span>
                      <p className="text-2xl font-black text-amber-400 mt-0.5">
                        ₦{(order.total_price || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, "Preparing")}
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-black uppercase"
                      >
                        Preparing
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, "Completed")}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-black uppercase"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 1. HORIZONTAL MENU ITEMS GRID & 2. EDIT/DELETE & 3. ADD NEW ITEM */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-amber-400">
                MENU ITEMS MANAGEMENT
              </h2>

              {/* 3. Add new menu item Button */}
              <button
                onClick={openAddModal}
                className="bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
              >
                + Add New Item
              </button>
            </div>

            {/* 1. Menu items displayed big and horizontal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#0b0c12]/95 border border-neutral-800 hover:border-amber-500/50 p-5 rounded-3xl flex flex-col justify-between shadow-2xl group transition-all h-full"
                >
                  <div>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-44 rounded-2xl object-cover border border-neutral-800 group-hover:border-amber-500/40 mb-4 shadow-lg"
                      />
                    ) : (
                      <div className="w-full h-44 rounded-2xl bg-[#12141e] border border-neutral-800 group-hover:border-amber-500/40 flex items-center justify-center text-4xl mb-4 shadow-lg">
                        🍽️
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base text-white truncate">
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg shrink-0">
                        {item.category || "Restaurant"}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2 mt-1 min-h-[2rem]">
                        {item.description}
                      </p>
                    )}

                    <p className="font-black text-amber-400 text-xl mt-3">
                      ₦{(item.price || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* 2. Menu_items edit/delete buttons on each item card */}
                  <div className="flex items-center gap-2 mt-5 pt-4 border-t border-neutral-800/80">
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 rounded-xl text-xs font-black uppercase transition-all"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMenuItem(item.id)}
                      className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 py-2 rounded-xl text-xs font-black uppercase transition-all"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. DYNAMIC TABLE QR CODES (TABLE 1-10) */}
        {activeTab === "qrcodes" && (
          <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-amber-400">
              DYNAMIC TABLE QR CODES (TABLES 1 TO 10)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((tableNum) => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  typeof window !== "undefined"
                    ? `${window.location.origin}/menu/${tableNum}`
                    : `https://digital-menu-5rnq.vercel.app/menu/${tableNum}`
                )}&color=f59e0b&bgcolor=0b0c12`;

                return (
                  <div
                    key={tableNum}
                    className="bg-[#0b0c12]/95 border border-neutral-800 p-5 rounded-3xl flex flex-col items-center text-center shadow-xl hover:border-amber-500/40 transition-all"
                  >
                    <span className="text-xs font-black uppercase text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 mb-3">
                      TABLE #{tableNum}
                    </span>

                    <img
                      src={qrUrl}
                      alt={`Table ${tableNum} QR`}
                      className="w-36 h-36 rounded-2xl border border-neutral-800 p-2 bg-[#030406]"
                    />

                    <Link
                      href={`/menu/${tableNum}`}
                      target="_blank"
                      className="mt-4 text-[10px] font-black uppercase text-neutral-400 hover:text-white underline"
                    >
                      Open Menu Link →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* 3. Add/Edit Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0c12] border border-amber-500/40 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-amber-400 uppercase">
              {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
            </h3>

            <form onSubmit={handleSaveMenuItem} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lobster Thermidor"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">
                  Price (₦)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                >
                  <option value="Restaurant">Restaurant</option>
                  <option value="Bar">Bar</option>
                  <option value="Hotel">Hotel</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">
                  Image URL (Unsplash or Placeholder)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-neutral-800 text-neutral-300 py-3 rounded-2xl text-xs font-black uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-2xl text-xs font-black uppercase shadow-lg"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
