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
  image_url?: string | null;
  description?: string | null;
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
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "qrcodes">("menu");

  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [baseUrl, setBaseUrl] = useState<string>("https://digital-menu-5rnq.vercel.app");
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    title: "",
    price: "",
    category: "Restaurant",
    image_url: "",
    description: "",
  });

  const prevOrderCountRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playAlertSound = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

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

  const triggerOrderNotification = (tableNum: string) => {
    setNewOrderAlert(`🔔 NEW ORDER RECEIVED FOR TABLE #${tableNum || "1"}!`);
    if (soundEnabled) playAlertSound();
    setTimeout(() => setNewOrderAlert(null), 8000);
  };

  const fetchAllData = async (manualRefresh = false) => {
    if (manualRefresh) setIsRefreshing(true);

    const [ordersRes, menuRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("menu_items").select("*").order("created_at", { ascending: false }),
    ]);

    if (!ordersRes.error && ordersRes.data) {
      if (prevOrderCountRef.current > 0 && ordersRes.data.length > prevOrderCountRef.current) {
        const latestOrder = ordersRes.data[0];
        triggerOrderNotification(latestOrder?.table_number);
      }
      prevOrderCountRef.current = ordersRes.data.length;
      setOrders(ordersRes.data as Order[]);
    }

    if (!menuRes.error && menuRes.data) {
      setMenuItems(menuRes.data as MenuItem[]);
    }

    setLoading(false);
    setIsRefreshing(false);
  };

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState) {
      getAudioContext();
      playAlertSound();
    }
  };

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel("realtime-admin-hub")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrd = payload.new as Order;
          setOrders((prev) => [newOrd, ...prev]);
          triggerOrderNotification(newOrd.table_number);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          fetchAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      price: parseFloat(formData.price) || 0,
      category: formData.category,
      image_url: formData.image_url.trim() ? formData.image_url.trim() : null,
      description: formData.description.trim() ? formData.description.trim() : null,
    };

    if (editingItem) {
      const { error } = await supabase.from("menu_items").update(payload).eq("id", editingItem.id);
      if (error) {
        alert(`Error updating item: ${error.message}`);
      }
    } else {
      const { error } = await supabase.from("menu_items").insert([payload]);
      if (error) {
        alert(`Error adding item to database: ${error.message}`);
      }
    }

    await fetchAllData();
    setIsSubmitting(false);
    closeModal();
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      alert(`Error deleting item: ${error.message}`);
    } else {
      fetchAllData();
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

  const downloadQrCode = async (format: "png" | "svg") => {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
      `${baseUrl}/menu/${selectedTable}`
    )}&color=f59e0b&bgcolor=0b0c12&format=${format}`;

    try {
      const response = await fetch(qrApiUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `table-${selectedTable}-qr.${format === "png" ? "jpg" : "svg"}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(qrApiUrl, "_blank");
    }
  };

  const currentQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    `${baseUrl}/menu/${selectedTable}`
  )}&color=f59e0b&bgcolor=0b0c12`;

  return (
    <div className="min-h-screen bg-[#030406] text-white font-sans selection:bg-amber-500/30 pb-20">
      {newOrderAlert && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black px-4 py-3 font-black text-xs uppercase tracking-widest text-center shadow-2xl animate-bounce sticky top-0 z-50 border-b border-black">
          {newOrderAlert}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#0b0c12]/95 backdrop-blur-xl border-b border-neutral-800/90 px-4 md:px-8 py-4 shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]" />
            <h1 className="text-xl font-black tracking-tight text-white">
              ADMIN CONTROL CENTER
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            <Link
              href="/menu/1"
              target="_blank"
              className="bg-[#12141e] hover:bg-neutral-800 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md flex items-center gap-2"
            >
              <span>🌐</span>
              <span>View Customer Menu</span>
            </Link>

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

      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6">
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase whitespace-nowrap transition-all ${
              activeTab === "orders"
                ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                : "bg-[#0b0c12] text-neutral-400 border border-neutral-800 hover:text-white"
            }`}
          >
            📋 Live Orders ({orders.filter((o) => o.status !== "Completed").length})
          </button>

          <button
            onClick={() => setActiveTab("menu")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase whitespace-nowrap transition-all ${
              activeTab === "menu"
                ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                : "bg-[#0b0c12] text-neutral-400 border border-neutral-800 hover:text-white"
            }`}
          >
            🍽️ Menu Items ({menuItems.length})
          </button>

          <button
            onClick={() => setActiveTab("qrcodes")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase whitespace-nowrap transition-all ${
              activeTab === "qrcodes"
                ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                : "bg-[#0b0c12] text-neutral-400 border border-neutral-800 hover:text-white"
            }`}
          >
            📱 Dynamic QR Code Generator
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-6">
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

        {activeTab === "menu" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-amber-400">
                MENU ITEMS MANAGEMENT
              </h2>

              <button
                onClick={openAddModal}
                className="bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] w-full sm:w-auto"
              >
                + Add New Item
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {activeTab === "qrcodes" && (
          <div className="space-y-8 max-w-2xl mx-auto text-center">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-amber-400">
                DYNAMIC TABLE QR CODE GENERATOR
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Select a table number below to display and download its unique menu QR code.
              </p>
            </div>

            <div className="flex items-center justify-center flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((tableNum) => (
                <button
                  key={tableNum}
                  onClick={() => setSelectedTable(tableNum)}
                  className={`w-12 h-12 rounded-2xl text-xs font-black uppercase transition-all flex items-center justify-center border ${
                    selectedTable === tableNum
                      ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105"
                      : "bg-[#0b0c12] text-neutral-400 border-neutral-800 hover:border-amber-500/50 hover:text-white"
                  }`}
                >
                  #{tableNum}
                </button>
              ))}
            </div>

            <div className="bg-[#0b0c12]/95 border border-amber-500/30 p-8 rounded-3xl flex flex-col items-center shadow-2xl space-y-5">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-xl border border-amber-500/20">
                CURRENTLY VIEWING: TABLE #{selectedTable}
              </span>

              <div className="p-4 bg-[#030406] rounded-3xl border border-neutral-800 shadow-inner">
                <img
                  src={currentQrUrl}
                  alt={`Table ${selectedTable} QR`}
                  className="w-56 h-56 rounded-2xl object-contain"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
                <button
                  onClick={() => downloadQrCode("png")}
                  className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                >
                  <span>⬇️ Download JPG</span>
                </button>

                <button
                  onClick={() => downloadQrCode("svg")}
                  className="bg-[#12141e] hover:bg-neutral-800 text-amber-400 border border-amber-500/30 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                >
                  <span>⬇️ Download SVG</span>
                </button>

                <Link
                  href={`/menu/${selectedTable}`}
                  target="_blank"
                  className="bg-[#12141e] hover:bg-neutral-800 text-neutral-300 border border-neutral-800 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <span>🌐 Open Link</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0b0c12] border border-amber-500/40 p-5 sm:p-6 rounded-3xl w-full max-w-lg shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base sm:text-lg font-black text-amber-400 uppercase tracking-wide">
                {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-neutral-400 hover:text-white text-lg px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                    Item Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lobster Thermidor"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                    Price (₦) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="e.g. 15000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none transition-colors"
                >
                  <option value="Restaurant">Restaurant</option>
                  <option value="Bar">Bar</option>
                  <option value="Hotel">Hotel</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                  Image URL (Unsplash or direct image link)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of ingredients or taste..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-3 rounded-2xl text-xs font-black uppercase transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingItem ? "Update Item" : "Save & Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
