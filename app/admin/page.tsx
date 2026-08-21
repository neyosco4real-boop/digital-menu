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
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 tone
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

    // Live Orders Subscription
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
    <div className="min-h-screen bg-[#07080a] text-white p-4 md:p-8 font-sans space-y-8">
      {/* Top Header & Navigation Bar */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#12141a] p-6 rounded-3xl border border-neutral-800 shadow-2xl">
        <div>
          <h1 className="text-xl font-black tracking-widest text-amber-500 uppercase">
            ADMIN CONTROL PANEL
          </h1>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Manage Menu, Live Orders, and Table QR Codes
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 1. Navigator button to Customer Menu */}
          <a
            href="/menu/1"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black uppercase px-4 py-3 rounded-2xl border border-neutral-700 transition-all flex items-center gap-2"
          >
            <span>🌐</span> View Customer Menu
          </a>

          {/* 2. QR Code Generator Trigger */}
          <button
            onClick={() => setShowQRModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase px-4 py-3 rounded-2xl transition-all shadow-md"
          >
            📱 Table QR Codes (1-10)
          </button>
        </div>
      </div>

      {/* Main Grid: Orders Section (Left) & Menu Management (Right) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* 4. ORDERS SECTION */}
        <div className="lg:col-span-5 bg-[#12141a] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h2 className="text-sm font-black tracking-widest text-amber-500 uppercase">
                LIVE ORDERS ({orders.length})
              </h2>
            </div>
            {/* Manual Alarm Test */}
            <button
              onClick={playOrderAlarm}
              className="text-[10px] bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-lg border border-neutral-700 hover:text-white"
            >
              🔔 Test Alarm
            </button>
          </div>

          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                No active orders yet
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#090a0f] border border-neutral-800 p-5 rounded-2xl space-y-4 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">
                        TABLE #{order.table_number || "1"}
                      </span>
                      <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    {/* 5. CANCEL / DELETE BUTTON */}
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl transition-all"
                    >
                      Cancel / Delete
                    </button>
                  </div>

                  <div className="divide-y divide-neutral-800/60 border-t border-b border-neutral-800/60 py-2">
                    {Array.isArray(order.items) &&
                      order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1.5"
                        >
                          <span className="text-neutral-300 font-bold">
                            {item.quantity}x {item.title || item.name}
                          </span>
                          <span className="text-neutral-400 font-mono">
                            ₦{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
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
        </div>

        {/* RIGHT SECTION: ADD MENU ITEM & MENU LIST */}
        <div className="lg:col-span-7 space-y-6">
          {/* Add New Item Form */}
          <div className="bg-[#12141a] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <h2 className="text-xs font-black tracking-widest text-amber-500 uppercase">
              ADD NEW MENU ITEM
            </h2>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Item Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Jollof Rice Special"
                  required
                  className="w-full bg-[#090a0f] border border-neutral-800 focus:border-amber-500 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Price (₦)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="3500"
                    required
                    className="w-full bg-[#090a0f] border border-neutral-800 focus:border-amber-500 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#090a0f] border border-amber-500 text-amber-400 text-xs font-black px-3 py-3 rounded-2xl outline-none cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#12141a] text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#090a0f] border border-neutral-800 focus:border-amber-500 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Item details..."
                    className="w-full bg-[#090a0f] border border-neutral-800 focus:border-amber-500 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "+ ADD TO MENU"}
              </button>
            </form>
          </div>

          {/* Menu Items Table List */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#12141a] p-5 rounded-3xl border border-neutral-800">
              <h3 className="text-xs font-black tracking-widest text-amber-500 uppercase">
                EXISTING MENU ITEMS ({filteredItems.length})
              </h3>

              <div className="flex items-center gap-1.5 bg-[#090a0f] p-1.5 rounded-2xl border border-neutral-800">
                {["All", ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                      activeFilter.toLowerCase() === cat.toLowerCase()
                        ? "bg-amber-500 text-black shadow-md"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[450px] overflow-y-auto pr-1">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#12141a] border border-neutral-800 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title || item.name}
                        className="w-10 h-10 rounded-xl object-cover border border-neutral-800 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#090a0f] border border-neutral-800 flex items-center justify-center shrink-0 text-base">
                        🍽️
                      </div>
                    )}

                    <div className="min-w-0">
                      <h4 className="font-black text-xs text-white truncate">
                        {item.title || item.name}
                      </h4>
                      <p className="font-black text-amber-400 text-xs mt-0.5">
                        ₦{(item.price || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <select
                    value={item.category || "Restaurant"}
                    disabled={updatingId === item.id}
                    onChange={(e) =>
                      handleCategoryChange(item.id, e.target.value)
                    }
                    className="bg-[#090a0f] border border-neutral-800 text-amber-400 text-xs font-black py-1.5 px-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#12141a] text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC TABLE 1-10 QR CODE MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-neutral-800 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest">
                SUITE / TABLE QR CODE GENERATOR
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-neutral-400 hover:text-white font-black text-sm px-2"
              >
                ✕
              </button>
            </div>

            {/* Table Selector Grid 1-10 */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Select Table / Suite (1 - 10)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {tables.map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedTable(num)}
                    className={`py-2 rounded-xl text-xs font-black transition-all border ${
                      selectedTable === num
                        ? "bg-amber-500 text-black border-amber-400 shadow-md scale-105"
                        : "bg-[#090a0f] text-neutral-400 border-neutral-800 hover:text-white"
                    }`}
                  >
                    #{num}
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code Graphic */}
            <div className="bg-white p-6 rounded-3xl inline-block shadow-inner mx-auto flex justify-center">
              {baseUrl ? (
                <QRCode value={`${baseUrl}/menu/${selectedTable}`} size={180} />
              ) : (
                <div className="w-[180px] h-[180px] bg-neutral-200 animate-pulse rounded-xl" />
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                TABLE / SUITE #{selectedTable}
              </p>
              <p className="text-[10px] text-neutral-500 font-mono truncate">
                {baseUrl}/menu/{selectedTable}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
