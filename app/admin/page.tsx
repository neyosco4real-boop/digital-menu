"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function AdvancedAdminControlPanel() {
  const [activeTab, setActiveTab] = useState<"orders" | "kitchen" | "menu" | "categories" | "qr" | "settings">("orders");
  const [store, setStore] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sound Alarm
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form States
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [variantName, setVariantName] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [selectedItemIdForVariant, setSelectedItemIdForVariant] = useState("");

  const [newCatName, setNewCatName] = useState("");
  const [newCatSection, setNewCatSection] = useState("Main");
  const [newCatImg, setNewCatImg] = useState("");

  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("₦");
  const [tableNum, setTableNum] = useState("1");

  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    fetchData();

    const channel = supabase
      .channel("admin_orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => [payload.new, ...prev]);
        if (audioEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [audioEnabled]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: storeList } = await supabase.from("stores").select("*").limit(1);
      if (!storeList || storeList.length === 0) return;
      const s = storeList[0];
      setStore(s);
      setPhone(s.whatsapp_number || "");
      setCurrency(s.currency || "₦");

      const [catRes, menuRes, ordRes, varRes] = await Promise.all([
        supabase.from("categories").select("*").eq("store_id", s.id).order("created_at"),
        supabase.from("menu_items").select("*").eq("store_id", s.id),
        supabase.from("orders").select("*").eq("store_id", s.id).order("created_at", { ascending: false }),
        supabase.from("item_variants").select("*")
      ]);

      setCategories(catRes.data || []);
      setItems(menuRes.data || []);
      setOrders(ordRes.data || []);
      setVariants(varRes.data || []);
      if (catRes.data?.[0]) setNewItemCategory(catRes.data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      const { error } = await supabase
        .from("menu_items")
        .update({ title: newItemTitle, price: parseFloat(newItemPrice), description: newItemDesc, category_id: newItemCategory })
        .eq("id", editingItem.id);
      if (!error) {
        setEditingItem(null);
        fetchData();
      }
    } else {
      const { data, error } = await supabase
        .from("menu_items")
        .insert([{ store_id: store.id, title: newItemTitle, price: parseFloat(newItemPrice), description: newItemDesc, category_id: newItemCategory }])
        .select();
      if (!error && data) setItems([...items, ...data]);
    }
    setNewItemTitle(""); setNewItemPrice(""); setNewItemDesc("");
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !store) return;
    const { data, error } = await supabase
      .from("categories")
      .insert([{ store_id: store.id, name: newCatName, section: newCatSection || "Main", image_url: newCatImg || null }])
      .select();

    if (!error && data) {
      setCategories([...categories, ...data]);
      setNewCatName(""); setNewCatImg("");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) setCategories(categories.filter((c) => c.id !== id));
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (!error) setItems(items.filter((i) => i.id !== id));
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemIdForVariant || !variantName) return;
    const { data, error } = await supabase
      .from("item_variants")
      .insert([{ menu_item_id: selectedItemIdForVariant, name: variantName, price_extra: parseFloat(variantPrice || "0") }])
      .select();
    if (!error && data) {
      setVariants([...variants, ...data]);
      setVariantName(""); setVariantPrice("");
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ kitchen_status: status }).eq("id", orderId);
    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, kitchen_status: status } : o));
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const { error } = await supabase
      .from("stores")
      .update({ whatsapp_number: phone, currency: currency })
      .eq("id", store.id);
    if (!error) alert("Settings saved!");
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans animate-pulse">Loading Panel...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-sans transition-all duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900 p-6 rounded-3xl border border-neutral-800 shadow-xl">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-orange-500">{store?.name || "LUXURY LOUNGE"} Dashboard</h1>
            <p className="text-xs text-neutral-400 mt-1">Live POS, Kitchen & Menu Control Engine</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all transform active:scale-95 border ${
                audioEnabled ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-lg shadow-amber-500/10" : "bg-neutral-800 text-neutral-400 border-neutral-700"
              }`}
            >
              🔔 {audioEnabled ? "Alarm Active" : "Enable Alarm Sound"}
            </button>
            <a href="/menu" target="_blank" className="bg-orange-500 hover:bg-orange-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all shadow-lg shadow-orange-500/20">
              Live Customer Menu ↗
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-neutral-800 pb-3 overflow-x-auto">
          {[
            { id: "orders", label: `Live Orders (${orders.length})` },
            { id: "kitchen", label: `Kitchen Display` },
            { id: "menu", label: `Menu Items (${items.length})` },
            { id: "categories", label: `Categories (${categories.length})` },
            { id: "qr", label: "QR Code" },
            { id: "settings", label: "Settings" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id ? "bg-orange-500 text-black shadow-md shadow-orange-500/20" : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: LIVE ORDERS */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-neutral-900/50 p-12 rounded-3xl border border-neutral-800 text-center">
                <p className="text-neutral-500 text-sm">No live orders. New incoming orders will alert automatically.</p>
              </div>
            ) : (
              orders.map((ord) => (
                <div key={ord.id} className="bg-neutral-900 p-5 rounded-3xl border border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-500/20 text-orange-400 font-bold text-xs px-2.5 py-1 rounded-lg border border-orange-500/30">
                        Table {ord.table_number || "1"}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(ord.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-neutral-200 mt-2">{ord.items_summary}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-emerald-400">{currency}{ord.total_amount}</p>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider">{ord.kitchen_status || "Received"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: KITCHEN DISPLAY */}
        {activeTab === "kitchen" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {orders.map((ord) => (
              <div key={ord.id} className="bg-neutral-900 p-5 rounded-3xl border border-neutral-800 space-y-4 shadow-lg">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                  <span className="bg-orange-500 text-black font-black text-xs px-3 py-1 rounded-xl">Table {ord.table_number || "1"}</span>
                  <span className="text-[10px] text-neutral-400">{new Date(ord.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm font-semibold text-neutral-200">{ord.items_summary}</p>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => updateOrderStatus(ord.id, "Preparing")} className="flex-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs py-2 rounded-xl font-bold hover:bg-amber-500/30">Preparing</button>
                  <button onClick={() => updateOrderStatus(ord.id, "Ready")} className="flex-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs py-2 rounded-xl font-bold hover:bg-emerald-500/30">Ready</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: MENU & VARIANTS MANAGER */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            <form onSubmit={handleSaveItem} className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-orange-400">{editingItem ? "Edit Menu Item" : "Add Menu Item"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="text" placeholder="Title" value={newItemTitle} onChange={e=>setNewItemTitle(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" required />
                <input type="number" placeholder="Price" value={newItemPrice} onChange={e=>setNewItemPrice(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" required />
                <select value={newItemCategory} onChange={e=>setNewItemCategory(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="text" placeholder="Description" value={newItemDesc} onChange={e=>setNewItemDesc(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-emerald-500 text-black font-bold text-xs px-5 py-2.5 rounded-xl">{editingItem ? "Update Item" : "+ Save Item"}</button>
                {editingItem && <button type="button" onClick={() => { setEditingItem(null); setNewItemTitle(""); setNewItemPrice(""); setNewItemDesc(""); }} className="bg-neutral-800 text-neutral-400 text-xs px-4 py-2.5 rounded-xl">Cancel</button>}
              </div>
            </form>

            {/* Add Variant Form */}
            <form onSubmit={handleAddVariant} className="bg-neutral-900/60 p-6 rounded-3xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-amber-400">Add Variant / Modifier (Size, Toppings, Portion)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select value={selectedItemIdForVariant} onChange={e=>setSelectedItemIdForVariant(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white">
                  <option value="">Select Target Item</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
                </select>
                <input type="text" placeholder="Variant Name (e.g. Large, Extra Cheese)" value={variantName} onChange={e=>setVariantName(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" required />
                <input type="number" placeholder="Extra Price (e.g. 500)" value={variantPrice} onChange={e=>setVariantPrice(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" />
              </div>
              <button type="submit" className="bg-amber-500 text-black font-bold text-xs px-5 py-2.5 rounded-xl">+ Add Variant Option</button>
            </form>

            {/* Item List with Edit/Delete Controls */}
            <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-3">
              {items.map(item => (
                <div key={item.id} className="bg-black/60 p-4 rounded-2xl border border-neutral-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white">{item.title} — {currency}{item.price}</h3>
                    <div className="flex gap-2 mt-1">
                      {variants.filter(v => v.menu_item_id === item.id).map(v => (
                        <span key={v.id} className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md">{v.name} (+{currency}{v.price_extra})</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(item); setNewItemTitle(item.title); setNewItemPrice(item.price); setNewItemDesc(item.description); setNewItemCategory(item.category_id); }} className="bg-neutral-800 hover:bg-orange-500 hover:text-black text-neutral-300 text-xs px-3 py-1.5 rounded-xl transition-all">
                      Edit Item
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="bg-neutral-800 hover:bg-red-900/50 text-neutral-400 hover:text-red-400 text-xs px-3 py-1.5 rounded-xl transition-all">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CATEGORIES */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <form onSubmit={handleAddCategory} className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-neutral-300">Add New Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" placeholder="Category Name" value={newCatName} onChange={e=>setNewCatName(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" required />
                <input type="text" placeholder="Section (e.g. Food, Drinks)" value={newCatSection} onChange={e=>setNewCatSection(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" />
                <input type="url" placeholder="Image URL (Optional)" value={newCatImg} onChange={e=>setNewCatImg(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" />
              </div>
              <button type="submit" className="bg-emerald-500 text-black font-bold text-xs px-5 py-2.5 rounded-xl">+ Save Category</button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden flex flex-col justify-between">
                  {cat.image_url && <img src={cat.image_url} alt={cat.name} className="w-full h-28 object-cover" />}
                  <div className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-neutral-200">{cat.name}</p>
                      <span className="text-[10px] text-neutral-500 uppercase">{cat.section || "Main"}</span>
                    </div>
                    <button onClick={() => deleteCategory(cat.id)} className="bg-neutral-800 hover:bg-red-900/50 text-neutral-400 hover:text-red-400 text-xs px-2.5 py-1 rounded-lg">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: QR GENERATOR */}
        {activeTab === "qr" && (
          <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-4 max-w-md">
            <h2 className="text-sm font-bold text-neutral-300">Generate Table QR Code</h2>
            <input type="text" value={tableNum} onChange={e => setTableNum(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" placeholder="Table Number" />
            <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center space-y-2">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://digital-menu-5rnq.vercel.app/menu?table=${tableNum}`)}`} alt="QR Code" className="w-48 h-48" />
              <p className="text-black text-xs font-bold uppercase">Table {tableNum}</p>
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === "settings" && (
          <form onSubmit={handleUpdateSettings} className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-4 max-w-md">
            <h2 className="text-sm font-bold text-neutral-300">Store Settings</h2>
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">WhatsApp Notification Phone</label>
              <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">Currency Symbol</label>
              <input type="text" value={currency} onChange={e=>setCurrency(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" required />
            </div>
            <button type="submit" className="bg-orange-500 text-black font-bold text-xs px-5 py-2.5 rounded-xl">Save Settings</button>
          </form>
        )}

      </div>
    </div>
  );
}
