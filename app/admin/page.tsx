"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import QRCode from "react-qr-code";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface MenuItem {
  id: string;
  title?: string;
  name?: string;
  price: number;
  category: string;
  description?: string;
  image_url?: string;
}

interface OrderItem {
  id: string;
  title?: string;
  name?: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  table_number: string | number;
  items: OrderItem[];
  total_amount: number;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("All");

  // QR Generator Modal State
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [baseUrl, setBaseUrl] = useState<string>("");

  // Add Item Form State
  const [title, setTitle] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [category, setCategory] = useState<string>("Restaurant");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const categories = ["Restaurant", "Bar", "Hotel"];
  const tables = Array.from({ length: 10 }, (_, i) => i + 1);

  // Audio Ref for Alarm
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playOrderAlarm = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context playback failed:", e);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }

    fetchMenuItems();
    fetchOrders();

    const subscription = supabase
      .channel("orders_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders((prev) => [newOrder, ...prev]);
          playOrderAlarm();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMenuItems(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setOrders(data);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return alert("Please fill in title and price.");

    setIsSubmitting(true);
    const newItem = {
      title,
      name: title,
      price: parseFloat(price),
      category,
      image_url: imageUrl || null,
      description: description || null,
    };

    const { data, error } = await supabase
      .from("menu_items")
      .insert([newItem])
      .select();

    if (error) {
      alert(`Error adding item: ${error.message}`);
    } else if (data) {
      setMenuItems((prev) => [data[0], ...prev]);
      setTitle("");
      setPrice("");
      setImageUrl("");
      setDescription("");
      setCategory("Restaurant");
    }
    setIsSubmitting(false);
  };

  const handleCategoryChange = async (itemId: string, newCategory: string) => {
    setUpdatingId(itemId);
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, category: newCategory } : item
      )
    );

    const { error } = await supabase
      .from("menu_items")
      .update({ category: newCategory })
      .eq("id", itemId);

    if (error) {
      alert(`Error updating category: ${error.message}`);
      fetchMenuItems();
    }
    setUpdatingId(null);
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to remove this item from the menu?")) return;

    setDeletingId(itemId);
    setMenuItems((prev) => prev.filter((item) => item.id !== itemId));

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      alert(`Error deleting item: ${error.message}`);
      fetchMenuItems();
    }
    setDeletingId(null);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel/delete this order?")) return;

    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      alert(`Error deleting order: ${error.message}`);
      fetchOrders();
    }
  };

  const filteredItems = menuItems.filter(
    (item) =>
      activeFilter === "All" ||
      (item.category || "").toLowerCase() === activeFilter.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-[#030406] text-white p-4 md:p-8 font-sans selection:bg-amber-500 selection:text-black">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Navigation */}
        <header className="relative overflow-hidden bg-gradient-to-r from-[#0d0f17] via-[#131622] to-[#0d0f17] p-6 md:p-8 rounded-3xl border border-neutral-800/80 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <h1 className="text-xl md:text-2xl font-black tracking-widest text-amber-500 uppercase">
                  ADMIN CONTROL DASHBOARD
                </h1>
              </div>
              <p className="text-xs text-neutral-400 font-medium mt-1">
                Real-time Orders, Dynamic Table QR Hub, and Menu Management
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/menu/1"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 bg-[#08090e] hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all shadow-md active:scale-95"
              >
                <span className="group-hover:rotate-12 transition-transform">🌐</span>
                <span>Customer Menu</span>
              </a>

              <button
                onClick={() => setShowQRModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-black uppercase tracking-wider px-5 py-3 rounded-2xl transition-all shadow-lg shadow-amber-500/10 active:scale-95"
              >
                <span>📱</span>
                <span>Table QR Codes (1-10)</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Interface Layout - 12 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: ORDERS & ADD ITEM FORM (5 COLUMNS) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* LIVE ORDERS SECTION */}
            <section className="bg-[#0b0c12] border border-neutral-800/80 rounded-3xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-800/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h2 className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                    LIVE ORDERS ({orders.length})
                  </h2>
                </div>

                <button
                  onClick={playOrderAlarm}
                  className="text-[10px] bg-[#141722] hover:bg-neutral-800 text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl border border-neutral-800 transition-all font-bold flex items-center gap-1.5"
                >
                  <span>🔔</span> Test Alarm
                </button>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {orders.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-neutral-800/80 rounded-2xl bg-[#06070a]">
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">
                      No Active Orders
                    </p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-[#12141e] border border-neutral-800 hover:border-amber-500/30 p-4 rounded-2xl space-y-3 shadow-xl transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl">
                            TABLE #{order.table_number || "1"}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl transition-all active:scale-95"
                        >
                          Cancel / Delete
                        </button>
                      </div>

                      <div className="divide-y divide-neutral-800/60 border-t border-b border-neutral-800/60 py-2">
                        {Array.isArray(order.items) &&
                          order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs py-1"
                            >
                              <span className="text-neutral-200 font-bold">
                                {item.quantity}x {item.title || item.name}
                              </span>
                              <span className="text-neutral-400 font-mono text-[11px]">
                                ₦{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>

                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                          Total
                        </span>
                        <span className="text-sm font-black text-amber-400">
                          ₦{(order.total_amount || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* ADD ITEM FORM */}
            <section className="bg-[#0b0c12] border border-neutral-800/80 rounded-3xl p-6 shadow-2xl space-y-5">
              <div className="border-b border-neutral-800/60 pb-3">
                <h2 className="text-xs font-black tracking-widest text-amber-500 uppercase">
                  ADD NEW MENU ITEM
                </h2>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Item Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Jollof Rice Special"
                    required
                    className="w-full bg-[#12141e] border border-neutral-800 focus:border-amber-500/80 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      Price (₦)
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="3500"
                      required
                      className="w-full bg-[#12141e] border border-neutral-800 focus:border-amber-500/80 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600 focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#12141e] border border-amber-500/40 text-amber-400 text-xs font-black px-3 py-3 rounded-2xl outline-none cursor-pointer focus:border-amber-400 transition-all"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-[#0b0c12] text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#12141e] border border-neutral-800 focus:border-amber-500/80 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600 focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      Description
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Item details..."
                      className="w-full bg-[#12141e] border border-neutral-800 focus:border-amber-500/80 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600 focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/10 active:scale-98 disabled:opacity-50 mt-1"
                >
                  {isSubmitting ? "Adding..." : "+ ADD TO MENU"}
                </button>
              </form>
            </section>
          </div>

          {/* RIGHT SIDE: EXISTING MENU ITEMS WITH DELETE BUTTON */}
          <section className="lg:col-span-7 bg-[#0b0c12] border border-neutral-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800/60 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-base">🍽️</span>
                  <h3 className="text-sm font-black tracking-widest text-amber-500 uppercase">
                    EXISTING MENU ITEMS
                  </h3>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Showing {filteredItems.length} available items across categories
                </p>
              </div>

              {/* Filter Switcher */}
              <div className="flex items-center gap-1.5 bg-[#12141e] p-1.5 rounded-2xl border border-neutral-800">
                {["All", ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all ${
                      activeFilter.toLowerCase() === cat.toLowerCase()
                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Item Grid Cards with Delete Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[850px] overflow-y-auto pr-1.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#12141e] border border-neutral-800/90 hover:border-amber-500/40 p-4 rounded-2xl flex flex-col justify-between gap-4 shadow-xl hover:shadow-2xl hover:shadow-amber-500/5 transition-all group relative"
                >
                  <div className="flex items-start gap-3.5">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title || item.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-neutral-800 shrink-0 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-[#08090e] border border-neutral-800 flex items-center justify-center shrink-0 text-2xl group-hover:scale-105 transition-transform">
                        🍽️
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="font-black text-sm text-white truncate group-hover:text-amber-400 transition-colors">
                        {item.title || item.name}
                      </h4>
                      {item.description && (
                        <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      <p className="font-black text-amber-400 text-sm pt-0.5">
                        ₦{(item.price || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-800/60 pt-3 mt-1">
                    {/* Inline Category Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Cat:
                      </span>
                      <select
                        value={item.category || "Restaurant"}
                        disabled={updatingId === item.id}
                        onChange={(e) =>
                          handleCategoryChange(item.id, e.target.value)
                        }
                        className="bg-[#08090e] border border-neutral-800 focus:border-amber-500 text-amber-400 text-xs font-black py-1.5 px-2.5 rounded-xl outline-none cursor-pointer transition-all"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat} className="bg-[#0b0c12] text-white">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ITEM DELETE BUTTON */}
                    <button
                      onClick={() => handleDeleteMenuItem(item.id)}
                      disabled={deletingId === item.id}
                      className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                    >
                      <span>🗑️</span> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* DYNAMIC TABLE 1-10 QR CODE MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0c12] border border-neutral-800 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-800/60 pb-4">
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest">
                SUITE / TABLE QR CODE GENERATOR
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-neutral-400 hover:text-white font-black text-sm p-1 rounded-lg hover:bg-neutral-800 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Select Table / Suite Number (1 - 10)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {tables.map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedTable(num)}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all border ${
                      selectedTable === num
                        ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20 scale-105"
                        : "bg-[#12141e] text-neutral-400 border-neutral-800 hover:text-white"
                    }`}
                  >
                    #{num}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-2xl flex justify-center mx-auto max-w-[220px]">
              {baseUrl ? (
                <QRCode value={`${baseUrl}/menu/${selectedTable}`} size={180} />
              ) : (
                <div className="w-[180px] h-[180px] bg-neutral-200 animate-pulse rounded-xl" />
              )}
            </div>

            <div className="text-center space-y-1 bg-[#12141e] p-4 rounded-2xl border border-neutral-800/60">
              <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                TABLE / SUITE #{selectedTable}
              </p>
              <p className="text-[10px] text-neutral-400 font-mono truncate">
                {baseUrl}/menu/{selectedTable}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
