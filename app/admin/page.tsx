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
  const [categories, setCategories] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: storeList } = await supabase.from("stores").select("*").limit(1);
      if (storeList && storeList.length > 0) {
        setStore(storeList[0]);
        const sId = storeList[0].id;

        const [itemRes, catRes] = await Promise.all([
          supabase.from("menu_items").select("*").eq("store_id", sId),
          supabase.from("categories").select("*").eq("store_id", sId)
        ]);

        setItems(itemRes.data || []);
        setCategories(catRes.data || []);
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
    setImageUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setTitle(item.title);
    setPrice(item.price.toString());
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
              Menu QR Code
            </button>

            <button
              onClick={() => setActiveTab("items")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase transition-all ${
                activeTab === "items" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10" : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>🍴</span> MENU ITEMS
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "orders" ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>🛍️</span> LIVE ORDERS
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
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-72">
                  <svg className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#121418] border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                {/* Add New Item Button */}
                <button
                  onClick={handleOpenAddModal}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all shadow-lg shadow-amber-500/10"
                >
                  <span className="text-base font-bold">+</span> ADD NEW ITEM
                </button>
              </div>
            </div>

            {/* Grid display */}
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
                      <p className="text-xs font-extrabold text-amber-500 mt-0.5">
                        {store?.currency || "₦"}{item.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Edit and Delete Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-neutral-400 hover:text-amber-500 flex items-center justify-center transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-red-900/50 text-neutral-400 hover:text-red-500 flex items-center justify-center transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Orders View */}
        {activeTab === "orders" && (
          <div className="bg-[#121418] p-8 rounded-2xl border border-neutral-800 text-center">
            <p className="text-neutral-400 text-xs">Live orders display module connected to kitchen.</p>
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

      {/* Modal Dialog for Adding / Editing Items */}
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
                <label className="text-neutral-400 mb-1 block">Category</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
