"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function AdvancedAdminControlPanel() {
  const [activeTab, setActiveTab] = useState<"orders" | "kitchen" | "menu" | "categories" | "qr" | "settings">("menu");
  const [store, setStore] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sound Alarm
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form States - Menu Items
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemImgUrl, setNewItemImgUrl] = useState("");
  const [newItemImgPlaceholder, setNewItemImgPlaceholder] = useState("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300");
  const [newItemDesc, setNewItemDesc] = useState("");

  // Form States - Category & Variants
  const [newCatName, setNewCatName] = useState("");
  const [newCatSection, setNewCatSection] = useState("Restaurant");
  const [newCatImg, setNewCatImg] = useState("");

  const [variantName, setVariantName] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [selectedItemIdForVariant, setSelectedItemIdForVariant] = useState("");

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
    const finalImage = newItemImgUrl || newItemImgPlaceholder;

    if (editingItem) {
      const { error } = await supabase
        .from("menu_items")
        .update({
          title: newItemTitle,
          price: parseFloat(newItemPrice),
          description: newItemDesc,
          category_id: newItemCategory,
          image_url: finalImage
        })
        .eq("id", editingItem.id);
      if (!error) {
        setEditingItem(null);
        fetchData();
      }
    } else {
      const { data, error } = await supabase
        .from("menu_items")
        .insert([{
          store_id: store.id,
          title: newItemTitle,
          price: parseFloat(newItemPrice),
          description: newItemDesc,
          category_id: newItemCategory,
          image_url: finalImage
        }])
        .select();
      if (!error && data) setItems([...items, ...data]);
    }
    setNewItemTitle(""); setNewItemPrice(""); setNewItemDesc(""); setNewItemImgUrl("");
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !store) return;
    const { data, error } = await supabase
      .from("categories")
      .insert([{ store_id: store.id, name: newCatName, section: newCatSection, image_url: newCatImg || null }])
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

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans animate-pulse">Loading Panel...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-sans transition-all duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900 p-6 rounded-3xl border border-neutral-800 shadow-xl">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-orange-500">{store?.name || "LUXURY LOUNGE"} Dashboard</h1>
            <p className="text-xs text-neutral-400 mt-1">Live POS, Kitchen & Menu Control Engine</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                audioEnabled ? "bg-amber-500/20 text-amber-400 border-amber-500/50" : "bg-neutral-800 text-neutral-400 border-neutral-700"
              }`}
            >
              🔔 {audioEnabled ? "Alarm Active" : "Enable Alarm Sound"}
            </button>
            <a href="/menu" target="_blank" className="bg-orange-500 text-black font-extrabold text-xs px-4 py-2.5 rounded-2xl">
              Live Customer Menu ↗
            </a>
          </div>
        </div>

        {/* Tabs */}
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
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap ${
                activeTab === tab.id ? "bg-orange-500 text-black" : "bg-neutral-900 text-neutral-400 border border-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: MENU ITEMS */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            <form onSubmit={handleSaveItem} className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-orange-400">{editingItem ? "Edit Menu Item" : "Add Menu Item"}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" placeholder="Title" value={newItemTitle} onChange={e=>setNewItemTitle(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" required />
                <input type="number" placeholder="Price" value={newItemPrice} onChange={e=>setNewItemPrice(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" required />
                
                <select value={newItemCategory} onChange={e=>setNewItemCategory(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" required>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.section})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="url" placeholder="Image URL (e.g. https://...)" value={newItemImgUrl} onChange={e=>setNewItemImgUrl(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" />
                <input type="url" placeholder="Fallback Image Placeholder URL" value={newItemImgPlaceholder} onChange={e=>setNewItemImgPlaceholder(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" />
              </div>

              <textarea placeholder="Description" value={newItemDesc} onChange={e=>setNewItemDesc(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white h-20" />

              <div className="flex gap-2">
                <button type="submit" className="bg-emerald-500 text-black font-bold text-xs px-5 py-2.5 rounded-xl">{editingItem ? "Update Item" : "+ Save Item"}</button>
                {editingItem && <button type="button" onClick={() => { setEditingItem(null); setNewItemTitle(""); setNewItemPrice(""); setNewItemDesc(""); setNewItemImgUrl(""); }} className="bg-neutral-800 text-neutral-400 text-xs px-4 py-2.5 rounded-xl">Cancel</button>}
              </div>
            </form>

            {/* Existing Menu Items */}
            <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-3">
              {items.map(item => (
                <div key={item.id} className="bg-black/60 p-4 rounded-2xl border border-neutral-800 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <img src={item.image_url || newItemImgPlaceholder} alt={item.title} className="w-12 h-12 object-cover rounded-xl border border-neutral-800" />
                    <div>
                      <h3 className="text-sm font-bold text-white">{item.title} — {currency}{item.price}</h3>
                      <p className="text-xs text-neutral-400">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(item); setNewItemTitle(item.title); setNewItemPrice(item.price); setNewItemDesc(item.description || ""); setNewItemCategory(item.category_id); setNewItemImgUrl(item.image_url || ""); }} className="bg-neutral-800 text-neutral-300 text-xs px-3 py-1.5 rounded-xl">
                      Edit
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="bg-neutral-800 text-red-400 text-xs px-3 py-1.5 rounded-xl">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: CATEGORIES */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <form onSubmit={handleAddCategory} className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-neutral-300">Add New Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" placeholder="Category Name (e.g., Cocktails, Starters)" value={newCatName} onChange={e=>setNewCatName(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" required />
                
                {/* 3 Main Sections Selection */}
                <select value={newCatSection} onChange={e=>setNewCatSection(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white">
                  <option value="Bar">Bar</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Hotel">Hotel</option>
                </select>

                <input type="url" placeholder="Image URL (Optional)" value={newCatImg} onChange={e=>setNewCatImg(e.target.value)} className="bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white" />
              </div>
              <button type="submit" className="bg-emerald-500 text-black font-bold text-xs px-5 py-2.5 rounded-xl">+ Save Category</button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-white">{cat.name}</p>
                    <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">{cat.section}</span>
                  </div>
                  <button onClick={() => deleteCategory(cat.id)} className="bg-neutral-800 text-neutral-400 hover:text-red-400 text-xs px-2.5 py-1 rounded-lg">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
