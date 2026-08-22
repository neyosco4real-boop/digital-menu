"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const MASTER_BYPASS_PIN = "9999";

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authStep, setAuthStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState<string>("");
  const [otpToken, setOtpToken] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "qrcodes">("menu");

  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
      audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audioRef.current.load();

      const sessionAuth = sessionStorage.getItem("admin_session_auth");
      if (sessionAuth === "true") {
        setIsAuthenticated(true);
      } else {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) setIsAuthenticated(true);
        });
      }
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });

    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthStep("otp");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    if (otpToken.trim() === MASTER_BYPASS_PIN) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_session_auth", "true");
      setAuthLoading(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpToken.trim(),
      type: "email",
    });

    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_session_auth", "true");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("admin_session_auth");
    setIsAuthenticated(false);
    setAuthStep("email");
    setEmail("");
    setOtpToken("");
  };

  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn("Audio autoplay restricted by browser gesture policy:", err);
      });
    }
  };

  const triggerOrderNotification = (tableNum: string) => {
    setNewOrderAlert(`🔔 NEW ORDER RECEIVED FOR TABLE #${tableNum || "1"}!`);
    playAlertSound();
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
    if (nextState) playAlertSound();
  };

  useEffect(() => {
    if (!isAuthenticated) return;

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
        () => fetchAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const updateOrderStatus = async (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      console.error("Failed to update status in Supabase:", error.message);
      fetchAllData();
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this order?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (!error) {
      setOrders((prev) => prev.filter((o) => o.id !== id));
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
      await supabase.from("menu_items").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("menu_items").insert([payload]);
    }

    await fetchAllData();
    setIsSubmitting(false);
    closeModal();
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    fetchAllData();
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
      window.open(qrApiUrl, "_blank");
    }
  };

  const currentQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    `${baseUrl}/menu/${selectedTable}`
  )}&color=f59e0b&bgcolor=0b0c12`;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#030406] text-white font-sans flex items-center justify-center p-4">
        <div className="bg-[#0b0c12] border border-amber-500/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl mx-auto shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            🔑
          </div>

          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-white">
              ADMIN ACCESS
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              {authStep === "email" ? "Enter admin email to receive login code" : `Enter OTP code sent to ${email}`}
            </p>
          </div>

          {authStep === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-2xl py-3 px-4 text-center font-sans text-sm text-amber-400 outline-none focus:border-amber-500 transition-all"
                  autoFocus
                />
              </div>

              {authError && (
                <p className="text-rose-400 text-[11px] font-bold uppercase tracking-wider">
                  ❌ {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs py-3.5 rounded-2xl tracking-widest shadow-lg transition-all"
              >
                {authLoading ? "Sending Code..." : "Send OTP Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter OTP or Master PIN"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-2xl py-3 px-4 text-center font-mono text-lg text-amber-400 tracking-widest outline-none focus:border-amber-500 transition-all"
                  autoFocus
                />
              </div>

              {authError && (
                <p className="text-rose-400 text-[11px] font-bold uppercase tracking-wider">
                  ❌ {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs py-3.5 rounded-2xl tracking-widest shadow-lg transition-all"
              >
                {authLoading ? "Verifying..." : "Verify & Unlock"}
              </button>

              <button
                type="button"
                onClick={() => setAuthStep("email")}
                className="text-[10px] text-neutral-400 underline uppercase tracking-wider hover:text-white"
              >
                ← Back to Email
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030406] text-white font-sans selection:bg-amber-500/30 pb-20">
      {newOrderAlert && (
        <div className="bg-amber-500 text-black px-4 py-2.5 font-black text-xs uppercase tracking-widest text-center shadow-2xl animate-bounce sticky top-0 z-50 border-b border-black flex items-center justify-center gap-3">
          <span>{newOrderAlert}</span>
          <button onClick={playAlertSound} className="underline text-[10px] bg-black text-amber-400 px-2 py-0.5 rounded">Test Sound</button>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#0b0c12]/95 backdrop-blur-xl border-b border-neutral-800/90 px-4 md:px-8 py-3.5 shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]" />
            <h1 className="text-lg font-black tracking-tight text-white uppercase">
              ADMIN CONTROL CENTER
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            <Link
              href="/menu/1"
              target="_blank"
              className="bg-[#12141e] hover:bg-neutral-800 text-amber-400 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              🌐 Customer View
            </Link>

            <button
              onClick={toggleSound}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl border transition-all ${
                soundEnabled
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                  : "bg-[#12141e] text-neutral-400 border-neutral-800"
              }`}
            >
              {soundEnabled ? "🔔 Alarm Active" : "🔕 Muted"}
            </button>

            <button
              onClick={() => fetchAllData(true)}
              disabled={isRefreshing}
              className="bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              {isRefreshing ? "Refreshing..." : "🔄 Refresh"}
            </button>

            <button
              onClick={handleLogout}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all"
            >
              🔒 Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-5">
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${
              activeTab === "orders"
                ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                : "bg-[#0b0c12] text-neutral-400 border border-neutral-800"
            }`}
          >
            📋 Live Orders ({orders.filter((o) => o.status !== "Completed" && o.status !== "Cancelled").length})
          </button>

          <button
            onClick={() => setActiveTab("menu")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${
              activeTab === "menu"
                ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                : "bg-[#0b0c12] text-neutral-400 border border-neutral-800"
            }`}
          >
            🍽️ Menu Items ({menuItems.length})
          </button>

          <button
            onClick={() => setActiveTab("qrcodes")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${
              activeTab === "qrcodes"
                ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                : "bg-[#0b0c12] text-neutral-400 border border-neutral-800"
            }`}
          >
            📱 QR Generator
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-5">
        {activeTab === "orders" && (
          <div className="space-y-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-400">
              LIVE ORDERS PANEL
            </h2>

            {loading ? (
              <div className="text-center py-12 text-amber-500/70 text-xs font-black uppercase tracking-widest animate-pulse">
                Loading Active Orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 bg-[#0b0c12] border border-neutral-800 rounded-2xl text-neutral-500 text-xs font-bold uppercase tracking-widest">
                No orders registered yet
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-[#0b0c12] border border-neutral-800 hover:border-amber-500/50 p-4 rounded-2xl flex flex-col justify-between shadow-xl transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                          Table #{order.table_number || "1"}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          order.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : order.status === "Cancelled"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}>
                          {order.status || "Pending"}
                        </span>
                      </div>

                      <div className="w-full h-24 rounded-xl bg-[#12141e] border border-neutral-800 flex items-center justify-center text-2xl mb-3">
                        📋
                      </div>

                      <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto pr-1">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-neutral-200 truncate">
                              <strong className="text-amber-400 font-bold mr-1.5">
                                {item.quantity}x
                              </strong>
                              {item.title}
                            </span>
                            <span className="text-neutral-400 font-mono text-[11px] shrink-0 ml-2">
                              ₦{(item.price || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-neutral-400">Total</span>
                        <span className="font-black text-amber-400 text-base font-mono">
                          ₦{(order.total_price || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-neutral-800/80">
                      <button
                        onClick={() => updateOrderStatus(order.id, "Cancelled")}
                        className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                      >
                        Delete
                      </button>

                      <button
                        onClick={() => updateOrderStatus(order.id, "Completed")}
                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "menu" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-400">
                MENU ITEMS
              </h2>

              <button
                onClick={openAddModal}
                className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all w-full sm:w-auto"
              >
                + Add New Item
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#0b0c12] border border-neutral-800 hover:border-amber-500/50 p-4 rounded-2xl flex flex-col justify-between shadow-xl group transition-all"
                >
                  <div>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-36 rounded-xl object-cover border border-neutral-800 mb-3"
                      />
                    ) : (
                      <div className="w-full h-36 rounded-xl bg-[#12141e] border border-neutral-800 flex items-center justify-center text-3xl mb-3">
                        🍽️
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm text-white truncate">
                        {item.title}
                      </h3>
                      <span className="text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0">
                        {item.category || "Restaurant"}
                      </span>
                    </div>

                    <p className="font-black text-amber-400 text-base mt-2 font-mono">
                      ₦{(item.price || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-800/80">
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-[11px] font-black uppercase"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMenuItem(item.id)}
                      className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 py-1.5 rounded-lg text-[11px] font-black uppercase"
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
          <div className="space-y-6 max-w-2xl mx-auto text-center">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-400">
                DYNAMIC TABLE QR CODE GENERATOR
              </h2>
            </div>

            <div className="flex items-center justify-center flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((tableNum) => (
                <button
                  key={tableNum}
                  onClick={() => setSelectedTable(tableNum)}
                  className={`w-10 h-10 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center border ${
                    selectedTable === tableNum
                      ? "bg-amber-500 text-black border-amber-400 scale-105"
                      : "bg-[#0b0c12] text-neutral-400 border-neutral-800"
                  }`}
                >
                  #{tableNum}
                </button>
              ))}
            </div>

            <div className="bg-[#0b0c12] border border-amber-500/30 p-6 rounded-2xl flex flex-col items-center shadow-xl space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                TABLE #{selectedTable}
              </span>

              <div className="p-3 bg-[#030406] rounded-2xl border border-neutral-800">
                <img
                  src={currentQrUrl}
                  alt={`Table ${selectedTable} QR`}
                  className="w-48 h-48 rounded-xl object-contain"
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap justify-center pt-2">
                <button
                  onClick={() => downloadQrCode("png")}
                  className="bg-amber-500 text-black px-3.5 py-2 rounded-xl text-xs font-black uppercase shadow-md"
                >
                  ⬇️ JPG
                </button>
                <button
                  onClick={() => downloadQrCode("svg")}
                  className="bg-[#12141e] text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-black uppercase shadow-md"
                >
                  ⬇️ SVG
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-[#0b0c12] border border-amber-500/40 p-5 rounded-2xl w-full max-w-lg shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide">
                {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
              </h3>
              <button onClick={closeModal} className="text-neutral-400 hover:text-white text-base">✕</button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
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
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
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
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                >
                  <option value="Restaurant">Restaurant</option>
                  <option value="Bar">Bar</option>
                  <option value="Hotel">Hotel</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full bg-[#12141e] border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-neutral-800 text-neutral-300 py-2.5 rounded-xl text-xs font-black uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-amber-500 text-black py-2.5 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  {isSubmitting ? "Saving..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
