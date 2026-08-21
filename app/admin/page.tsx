"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function AdminControlPanel() {
  const [activeTab, setActiveTab] = useState<"items" | "orders" | "qr">("items");
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

  // Form state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [section, setSection] = useState("Restaurant");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    fetchData();

    // Supabase Realtime Subscription for New Orders
    const channel = supabase
      .channel("orders_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          setOrders((prev) => [payload.new, ...prev]);
          playOrderSound();
          setNewOrderAlert(`🔔 NEW ORDER RECEIVED FOR TABLE ${payload.new.table_number || "1"}!`);
          setTimeout(() => setNewOrderAlert(null), 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const playOrderSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: storeList } = await supabase.from("stores").select("*").limit(1);
      if (storeList && storeList.length > 0) {
        setStore(storeList[0]);
        const sId = storeList[0].id;

        const [itemRes, catRes, orderRes] = await Promise.all([
          supabase.from("menu_items").select("*").eq("store_id", sId),
          supabase.from("categories").select("*").eq("store_id", sId),
          supabase.from("orders").select("*").eq("store_id", sId).order("created_at", { ascending: false })
        ]);

        setItems(itemRes.data || []);
        setCategories(catRes.data || []);
        setOrders(orderRes.data || []);
        if (catRes.data?.[0]) setCategoryId(catRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setTitle("");
    setPrice("");
    setSection("Restaurant");
    setImageUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setTitle(item.title);
    setPrice(item.price.toString());
    setSection(item.section || "Restaurant");
    setCategoryId(item.category_id || "");
    setImageUrl(item.image_url || "");
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    const payload = {
      store_id: store.id,
      title,
      price: parseFloat(price),
      section: section,
      category_id: categoryId || null,
      image_url: imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300"
    };

    if (editingItem) {
      const { error } = await supabase.from("menu_items").update(payload).eq("id", editingItem.id);
      if (!error) fetchData();
    } else {
      const { error } = await supabase.from("menu_items").insert([payload]);
      if (!error) fetchData();
    }
    setIsModalOpen(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (!error) setItems(items.filter((i) => i.id !== id));
  };

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090A0C] text-white flex items-center justify-center font-sans">
        <div className="animate-pulse text-neutral-400">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090A0C] text-white p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Realtime Order Alarm Banner */}
        {newOrderAlert && (
          <div className="bg-amber-500 text-black font-black p-4 rounded-2xl text-center text-sm shadow-2xl animate-pulse">
            {newOrderAlert}
          </div>
        )}

        {/* Top Navigation Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-amber-500 tracking-wide uppercase">
              ADMIN CONTROL PANEL
            </h1>
            <p className="text-xs text-neutral-400 mt-1">Manage Menu Items & Prices</p>
          </div>

          <div className="flex items-center gap-2 bg-[#121418] p-1.5 rounded-2xl border border-neutral-800">
            <button
              onClick={() => setActiveTab("qr")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "qr" ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
              }`}
            >
              Menu QR Code
            </button>

            <button
              onClick={() => setActiveTab("items")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase transition-all ${
                activeTab === "items" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10" : "text-neutral-400 hover:text-white"
              }`}
            >
              MENU ITEMS
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "orders" ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
              }`}
            >
              LIVE ORDERS ({orders.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Menu Items Grid View */}
        {activeTab === "items" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">
                ALL MENU ITEMS ({filteredItems.length})
              </h2>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#121418] border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <button
                  onClick={handleOpenAddModal}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all shadow-lg shadow-amber-500/10"
                >
                  <span className="text-base font-bold">+</span> ADD NEW ITEM
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#121418] border border-neutral-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300"}
                      alt={item.title}
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-800 flex-shrink-0"
                    />
                    <div className="truncate">
                      <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                      <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                        {item.section || "Restaurant"}
                      </span>
                      <p className="text-xs font-extrabold text-amber-500 mt-1">
                        {store?.currency || "₦"}{item.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-neutral-400 hover:text-amber-500 flex items-center justify-center transition-all"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-red-900/50 text-neutral-400 hover:text-red-500 flex items-center justify-center transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Orders View */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">
              LIVE KITCHEN ORDERS ({orders.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-[#121418] border border-amber-500/30 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                    <span className="text-xs font-black text-amber-500">TABLE #{order.table_number || "1"}</span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase">
                      {order.status || "Pending"}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {Array.isArray(order.items) &&
                      order.items.map((i: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-neutral-300">
                          <span>{i.quantity}x {i.title} <span className="text-[10px] text-neutral-500">({i.section || "Restaurant"})</span></span>
                          <span className="font-bold">{store?.currency || "₦"}{(i.price * i.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                  <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-xs font-bold">
                    <span>Total:</span>
                    <span className="text-amber-500">{store?.currency || "₦"}{order.total_price?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: QR Code Generator */}
        {activeTab === "qr" && (
          <div className="bg-[#121418] p-8 rounded-2xl border border-neutral-800 text-center max-w-sm mx-auto space-y-4">
            <h3 className="text-sm font-bold text-white">Table QR Code</h3>
            <div className="bg-white p-4 rounded-xl inline-block">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://digital-menu-5rnq.vercel.app/menu`)}`} alt="QR Code" className="w-40 h-40" />
            </div>
          </div>
        )}

      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveItem} className="bg-[#121418] border border-neutral-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-amber-500 uppercase">
              {editingItem ? "Edit Menu Item" : "Add New Item"}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 mb-1 block">Item Title</label>
                <input type="text" placeholder="e.g. Peppered Goat Meat" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500" required />
              </div>

              <div>
                <label className="text-neutral-400 mb-1 block">Price (₦)</label>
                <input type="number" placeholder="3500" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500" required />
              </div>

              <div>
                <label className="text-neutral-400 mb-1 block">Category Section (Bar, Restaurant, Hotel)</label>
                <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500">
                  <option value="Restaurant">Restaurant</option>
                  <option value="Bar">Bar</option>
                  <option value="Hotel">Hotel</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 mb-1 block">Image URL</label>
                <input type="url" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-amber-500 text-black font-extrabold text-xs py-3 rounded-xl hover:bg-amber-400">
                Save Item
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="bg-neutral-800 text-neutral-300 text-xs px-4 rounded-xl">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
