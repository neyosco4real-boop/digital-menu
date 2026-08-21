"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function AdminControlPanel() {
  const [activeTab, setActiveTab] = useState<"items" | "orders" | "qr">("items");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
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
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    fetchData();

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
      console.error(e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: storeList } = await supabase.from("stores").select("*").limit(1);
      if (storeList && storeList.length > 0) {
        setStore(storeList[0]);
        const sId = storeList[0].id;

        const [itemRes, orderRes] = await Promise.all([
          supabase.from("menu_items").select("*").eq("store_id", sId),
          supabase.from("orders").select("*").eq("store_id", sId).order("created_at", { ascending: false })
        ]);

        setItems(itemRes.data || []);
        setOrders(orderRes.data || []);
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
    setSection(item.section || item.category || "Restaurant");
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
      category: section.toLowerCase(),
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

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const itemSec = (item.section || item.category || "").toUpperCase();
    const matchesSection = selectedSection === "ALL" || itemSec === selectedSection;
    return matchesSearch && matchesSection;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] text-white flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 bg-[#111318] px-6 py-4 rounded-2xl border border-neutral-800 shadow-xl">
          <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-amber-500 font-bold text-xs tracking-wider uppercase">Loading Control Panel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080a] text-white p-6 md:p-10 font-sans selection:bg-amber-500 selection:text-black">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {newOrderAlert && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black p-4 rounded-2xl text-center text-xs tracking-wide shadow-2xl shadow-amber-500/20 animate-pulse flex items-center justify-center gap-2">
            <span>{newOrderAlert}</span>
          </div>
        )}

        {/* Top Header Navigation */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-neutral-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 tracking-tight uppercase">
                ADMIN CONTROL PANEL
              </h1>
            </div>
            <p className="text-xs text-neutral-400 mt-1 font-medium">Manage Menu Items, Live Orders & QR Codes</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-[#101216] p-1.5 rounded-2xl border border-neutral-800/90 shadow-inner">
            <a
              href="https://digital-menu-5rnq.vercel.app/menu"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-neutral-900 to-neutral-800 border border-neutral-700 text-amber-400 hover:text-amber-300 hover:border-amber-500/80 flex items-center gap-1.5 transition-all shadow-md hover:shadow-amber-500/10 active:scale-95"
            >
              🌐 CUSTOMER MENU ↗
            </a>

            <button
              onClick={() => setActiveTab("qr")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                activeTab === "qr" ? "bg-amber-500 text-black font-black shadow-lg shadow-amber-500/20" : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              Menu QR Code
            </button>

            <button
              onClick={() => setActiveTab("items")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all active:scale-95 ${
                activeTab === "items" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              MENU ITEMS
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                activeTab === "orders" ? "bg-amber-500 text-black font-black shadow-lg shadow-amber-500/20" : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              LIVE ORDERS ({orders.length})
            </button>
          </div>
        </div>

        {/* Quick Stats Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#101216] border border-neutral-800/80 p-4 rounded-2xl space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Total Dishes</p>
            <p className="text-xl font-black text-amber-500">{items.length}</p>
          </div>
          <div className="bg-[#101216] border border-neutral-800/80 p-4 rounded-2xl space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Restaurant Items</p>
            <p className="text-xl font-black text-white">{items.filter(i => (i.section || i.category || "").toLowerCase() === "restaurant").length}</p>
          </div>
          <div className="bg-[#101216] border border-neutral-800/80 p-4 rounded-2xl space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Bar Drinks</p>
            <p className="text-xl font-black text-white">{items.filter(i => (i.section || i.category || "").toLowerCase() === "bar").length}</p>
          </div>
          <div className="bg-[#101216] border border-neutral-800/80 p-4 rounded-2xl space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Hotel Services</p>
            <p className="text-xl font-black text-white">{items.filter(i => (i.section || i.category || "").toLowerCase() === "hotel").length}</p>
          </div>
        </div>

        {activeTab === "items" && (
          <div className="space-y-6">
            
            {/* Filter & Controls Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              
              {/* Section Category Tabs */}
              <div className="flex items-center gap-1.5 bg-[#101216] p-1.5 rounded-2xl border border-neutral-800/90">
                {["ALL", "RESTAURANT", "BAR", "HOTEL"].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setSelectedSection(sec)}
                    className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all active:scale-95 ${
                      selectedSection === sec
                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-800/40"
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>

              {/* Search & Add Button */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#101216] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-xs text-neutral-400 hover:text-white">✕</button>
                  )}
                </div>

                <button
                  onClick={handleOpenAddModal}
                  className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <span className="text-sm font-black">+</span> ADD ITEM
                </button>
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-[#101216] hover:bg-[#14161c] border border-neutral-800/90 hover:border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-black/50"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300"}
                      alt={item.title}
                      className="w-14 h-14 rounded-xl object-cover border border-neutral-800/90 flex-shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="truncate space-y-1">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">{item.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] bg-neutral-900 border border-neutral-800 text-amber-400 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
                          {item.section || item.category || "Restaurant"}
                        </span>
                      </div>
                      <p className="text-xs font-black text-amber-500">
                        {store?.currency || "₦"}{item.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      title="Edit Item"
                      className="w-9 h-9 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-amber-500/50 text-neutral-400 hover:text-amber-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      title="Delete Item"
                      className="w-9 h-9 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-red-800/50 text-neutral-400 hover:text-red-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12 bg-[#101216] rounded-2xl border border-neutral-800/80 space-y-2">
                <p className="text-sm text-neutral-400 font-bold">No menu items found</p>
                <p className="text-xs text-neutral-600">Try changing your search term or category section filter.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400">
              LIVE KITCHEN ORDERS ({orders.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-[#101216] border border-amber-500/30 p-5 rounded-2xl space-y-3 shadow-xl">
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                    <span className="text-xs font-black text-amber-500">TABLE #{order.table_number || "1"}</span>
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase">
                      {order.status || "Pending"}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {Array.isArray(order.items) &&
                      order.items.map((i: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-neutral-300">
                          <span>{i.quantity}x {i.title}</span>
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

        {activeTab === "qr" && (
          <div className="bg-[#101216] p-8 rounded-2xl border border-neutral-800/90 text-center max-w-sm mx-auto space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Table QR Code</h3>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-xl">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://digital-menu-5rnq.vercel.app/menu`)}`} alt="QR Code" className="w-44 h-44" />
            </div>
            <p className="text-xs text-neutral-400">Scans directly open customer menu: <br/><span className="text-amber-500 font-bold">digital-menu-5rnq.vercel.app/menu</span></p>
          </div>
        )}

      </div>

      {/* Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveItem} className="bg-[#101216] border border-neutral-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-wider">
                {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-white text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 mb-1 block font-bold">Item Title</label>
                <input type="text" placeholder="e.g. Peppered Goat Meat" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[#07080a] border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 transition-all" required />
              </div>

              <div>
                <label className="text-neutral-400 mb-1 block font-bold">Price (₦)</label>
                <input type="number" placeholder="3500" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-[#07080a] border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 transition-all" required />
              </div>

              <div>
                <label className="text-neutral-400 mb-1 block font-bold">Category Section</label>
                <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full bg-[#07080a] border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 transition-all">
                  <option value="Restaurant">Restaurant</option>
                  <option value="Bar">Bar</option>
                  <option value="Hotel">Hotel</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 mb-1 block font-bold">Image URL</label>
                <input type="url" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full bg-[#07080a] border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 transition-all" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-xs py-3 rounded-xl hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20 active:scale-95">
                Save Item
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="bg-neutral-800 text-neutral-300 font-bold text-xs px-4 rounded-xl hover:bg-neutral-700 transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
