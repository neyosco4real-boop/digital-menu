"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface OrderItem {
  id?: string;
  title?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

interface Order {
  id: string;
  table_number?: string;
  table?: string;
  items?: OrderItem[] | any;
  total_price?: number;
  total?: number;
  amount?: number;
  status: string;
  created_at?: string;
}

interface MenuItem {
  id: string;
  title?: string;
  name?: string;
  price: number;
  category: string;
  description?: string;
  image_url?: string;
  available?: boolean;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"orders" | "items" | "qr">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form State for Adding / Editing Menu Items
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Dishes");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemImage, setNewItemImage] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNotificationSound = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.51, now + 0.2);
      gain2.gain.setValueAtTime(0.4, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.8);

    } catch (e) {
      console.error("Audio play failed:", e);
    }
  };

  const enableAudio = () => {
    playNotificationSound();
    setSoundEnabled(true);
  };

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();

    const channel = supabase
      .channel("admin-orders-live-alarm")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as Order;
          const tableNum = newOrder.table_number || newOrder.table || "1";

          playNotificationSound();

          setNewOrderAlert(`🔔 NEW ORDER RECEIVED FOR TABLE #${tableNum}!`);
          setTimeout(() => setNewOrderAlert(null), 8000);

          fetchOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
      } else {
        setOrders(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const fetchMenuItems = async () => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase.from("menu_items").select("*");
      if (error) {
        console.error("Error fetching menu items:", error);
      } else {
        setMenuItems(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: "Completed" | "Cancelled") => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) {
        console.error("Failed to update order status:", error);
      } else {
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);

      if (error) {
        console.error("Failed to delete order:", error);
      } else {
        setOrders((prev) => prev.filter((ord) => ord.id !== orderId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle || !newItemPrice) return;

    const payload = {
      title: newItemTitle,
      name: newItemTitle,
      price: parseFloat(newItemPrice),
      category: newItemCategory,
      description: newItemDesc,
      image_url: newItemImage,
    };

    if (editingItemId) {
      const { error } = await supabase
        .from("menu_items")
        .update(payload)
        .eq("id", editingItemId);

      if (!error) {
        setMenuItems((prev) =>
          prev.map((i) => (i.id === editingItemId ? { ...i, ...payload } : i))
        );
        resetMenuForm();
      }
    } else {
      const { data, error } = await supabase.from("menu_items").insert([payload]).select();
      if (!error && data) {
        setMenuItems((prev) => [...prev, data[0]]);
        resetMenuForm();
      }
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItemId(item.id);
    setNewItemTitle(item.title || item.name || "");
    setNewItemPrice(String(item.price));
    setNewItemCategory(item.category || "Dishes");
    setNewItemDesc(item.description || "");
    setNewItemImage(item.image_url || "");
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
    if (!error) {
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  };

  const resetMenuForm = () => {
    setEditingItemId(null);
    setNewItemTitle("");
    setNewItemPrice("");
    setNewItemCategory("Dishes");
    setNewItemDesc("");
    setNewItemImage("");
  };

  const pendingOrders = orders.filter((o) => o.status === "Pending" || !o.status);

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white font-sans p-6 md:p-10 space-y-8">
      {newOrderAlert && (
        <div className="bg-amber-500 text-black font-black text-sm p-4 rounded-2xl shadow-2xl flex items-center justify-between border-2 border-amber-300 animate-bounce">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔔</span>
            <span>{newOrderAlert}</span>
          </div>
          <button
            onClick={() => setNewOrderAlert(null)}
            className="bg-black text-white px-3 py-1 rounded-xl text-xs font-bold"
          >
            DISMISS
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-black tracking-tight uppercase text-amber-500">
              ADMIN CONTROL PANEL
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Manage Menu Items, Live Orders & Real-time Kitchen Alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-[#16181e] border border-neutral-800 p-1.5 rounded-2xl">
          <button
            onClick={fetchOrders}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 transition-all flex items-center gap-1.5 border border-neutral-700 active:scale-95 disabled:opacity-50"
          >
            <span className={`inline-block ${isRefreshing ? "animate-spin" : ""}`}>🔄</span>
            <span>{isRefreshing ? "SYNCING..." : "REFRESH"}</span>
          </button>

          <button
            onClick={enableAudio}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              soundEnabled
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500 text-black shadow-lg shadow-amber-500/20 animate-pulse"
            }`}
          >
            <span>{soundEnabled ? "🔊 ALARM ACTIVE" : "🔇 ENABLE SOUND"}</span>
          </button>

          <a
            href="/menu"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            CUSTOMER MENU &rarr;
          </a>

          <button
            onClick={() => setActiveTab("qr")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "qr" ? "bg-amber-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            QR CODE
          </button>

          <button
            onClick={() => setActiveTab("items")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "items" ? "bg-amber-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            MENU ITEMS ({menuItems.length})
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "orders" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-neutral-400 hover:text-white"
            }`}
          >
            LIVE ORDERS ({pendingOrders.length})
          </button>
        </div>
      </div>

      {/* LIVE ORDERS TAB */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black tracking-widest text-neutral-400 uppercase">
              LIVE KITCHEN ORDERS ({pendingOrders.length})
            </h2>
            <button
              onClick={fetchOrders}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <span className={`inline-block ${isRefreshing ? "animate-spin" : ""}`}>🔄</span>
              <span>{isRefreshing ? "SYNCING..." : "REFRESH ORDERS"}</span>
            </button>
          </div>

          {loadingOrders ? (
            <div className="py-12 text-center text-xs text-neutral-500 font-bold uppercase tracking-wider">
              Syncing live orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-[#16181e] border border-neutral-800/80 rounded-3xl p-12 text-center text-neutral-500 text-xs font-bold">
              No live kitchen orders at the moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {orders.map((order) => {
                const tableNum = order.table_number || order.table || "1";
                const totalAmt = order.total_price || order.total || order.amount || 0;
                const itemsList: OrderItem[] = Array.isArray(order.items) ? order.items : [];

                const isCompleted = order.status === "Completed";
                const isCancelled = order.status === "Cancelled";

                return (
                  <div
                    key={order.id}
                    className={`bg-[#16181e] border rounded-3xl p-5 flex flex-col justify-between gap-5 transition-all shadow-xl ${
                      isCompleted
                        ? "border-emerald-500/30 opacity-75"
                        : isCancelled
                        ? "border-red-500/30 opacity-60"
                        : "border-amber-500/40 hover:border-amber-500/80"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                        <span className="text-xs font-black tracking-wider text-amber-500 uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                          TABLE #{tableNum}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                            isCompleted
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : isCancelled
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                          }`}
                        >
                          {order.status || "PENDING"}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {itemsList.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-neutral-200 font-medium truncate max-w-[200px]">
                              <strong className="text-amber-400 mr-1">{item.quantity || 1}x</strong>
                              {item.title || item.name || "Menu Item"}
                            </span>
                            <span className="text-neutral-400 font-bold">
                              ₦{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-neutral-800 text-xs">
                        <span className="font-bold text-neutral-400 uppercase">Total:</span>
                        <span className="font-black text-amber-400 text-sm">
                          ₦{totalAmt.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80">
                      {!isCompleted ? (
                        <button
                          onClick={() => handleUpdateStatus(order.id, "Completed")}
                          disabled={updatingId === order.id}
                          className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-400 hover:text-black font-black text-xs py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                        >
                          ✓ COMPLETE
                        </button>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] py-2.5 rounded-xl flex items-center justify-center">
                          ✓ COMPLETED
                        </div>
                      )}

                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={updatingId === order.id}
                        className="bg-red-500/10 hover:bg-red-500 border border-red-500/40 text-red-400 hover:text-white font-black text-xs py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        🗑 DELETE CARD
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MENU ITEMS MANAGEMENT TAB */}
      {activeTab === "items" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add / Edit Form */}
          <div className="bg-[#16181e] border border-neutral-800 rounded-3xl p-6 space-y-4 h-fit">
            <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider">
              {editingItemId ? "EDIT MENU ITEM" : "ADD NEW MENU ITEM"}
            </h2>

            <form onSubmit={handleSaveMenuItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 font-bold mb-1">ITEM TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jollof Rice Special"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl p-3 text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-bold mb-1">PRICE (₦)</label>
                  <input
                    type="number"
                    required
                    placeholder="3500"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl p-3 text-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1">CATEGORY</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dishes, Drinks"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl p-3 text-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">IMAGE URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newItemImage}
                  onChange={(e) => setNewItemImage(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl p-3 text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">DESCRIPTION</label>
                <textarea
                  rows={3}
                  placeholder="Item details..."
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl p-3 text-white focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black py-3 rounded-xl transition-all shadow-lg active:scale-95"
                >
                  {editingItemId ? "SAVE CHANGES" : "+ ADD TO MENU"}
                </button>
                {editingItemId && (
                  <button
                    type="button"
                    onClick={resetMenuForm}
                    className="px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl"
                  >
                    CANCEL
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Menu Items List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-black text-neutral-400 uppercase tracking-wider">
              CURRENT MENU ITEMS ({menuItems.length})
            </h2>

            {loadingItems ? (
              <div className="text-xs text-neutral-500">Loading items...</div>
            ) : menuItems.length === 0 ? (
              <div className="bg-[#16181e] border border-neutral-800 rounded-3xl p-8 text-center text-xs text-neutral-500">
                No menu items created yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#16181e] border border-neutral-800 rounded-2xl p-4 flex gap-4 justify-between"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title || item.name}
                        className="w-16 h-16 rounded-xl object-cover border border-neutral-800 shrink-0"
                      />
                    )}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-white">{item.title || item.name}</h3>
                          <span className="text-[10px] font-bold text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-400 font-bold mt-1">
                          ₦{(item.price || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2 mt-3 pt-2 border-t border-neutral-800">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-[10px] font-bold bg-neutral-800 hover:bg-neutral-700 text-amber-400 px-3 py-1 rounded-lg"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleDeleteMenuItem(item.id)}
                          className="text-[10px] font-bold bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-3 py-1 rounded-lg transition-colors"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR CODE GENERATOR TAB */}
      {activeTab === "qr" && (
        <div className="bg-[#16181e] border border-neutral-800 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-6">
          <h2 className="text-sm font-black text-amber-500 uppercase tracking-widest">
            SUITE / TABLE QR CODE GENERATOR
          </h2>
          <p className="text-xs text-neutral-400">
            Generate printable direct QR codes for table ordering.
          </p>
          <div className="bg-white p-6 rounded-2xl inline-block shadow-2xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                typeof window !== "undefined" ? `${window.location.origin}/menu?table=1` : ""
              )}`}
              alt="Table QR Code"
              className="w-48 h-48 mx-auto"
            />
          </div>
          <div className="text-xs font-bold text-amber-400">TABLE / SUITE #1</div>
        </div>
      )}
    </div>
  );
}
