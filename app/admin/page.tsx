"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CompleteAdminDashboard() {
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "categories" | "qr" | "settings">("categories");
  const [store, setStore] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("₦");

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySection, setNewCategorySection] = useState("Main");
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState("");

  const [tableNum, setTableNum] = useState("1");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: storeList } = await supabase.from("stores").select("*").limit(1);
      if (!storeList || storeList.length === 0) return;

      const storeData = storeList[0];
      setStore(storeData);
      setPhone(storeData.whatsapp_number || storeData.phone || "");
      setCurrency(storeData.currency || "₦");

      const { data: catData } = await supabase
        .from("categories")
        .select("*")
        .eq("store_id", storeData.id)
        .order("created_at", { ascending: true });
      setCategories(catData || []);
      if (catData && catData.length > 0) setNewItemCategory(catData[0].id);

      const { data: menuData } = await supabase
        .from("menu_items")
        .select("*")
        .eq("store_id", storeData.id);
      setItems(menuData || []);

      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", storeData.id)
        .order("created_at", { ascending: false });
      setOrders(orderData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName || !store) return;

    const { data, error } = await supabase
      .from("categories")
      .insert([
        { 
          store_id: store.id, 
          name: newCategoryName,
          section: newCategorySection || "Main",
          image_url: newCategoryImageUrl || null 
        }
      ])
      .select();

    if (!error && data) {
      setCategories([...categories, ...data]);
      setNewCategoryName("");
      setNewCategoryImageUrl("");
    } else {
      alert("Error adding category: " + (error?.message || "Unknown error"));
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) setCategories(categories.filter((c) => c.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <p className="text-gray-400 animate-pulse font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900/90 p-6 rounded-2xl border border-neutral-800">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-orange-500">
              {store?.name || "LUXURY LOUNGE"} — ADMIN
            </h1>
            <p className="text-xs text-neutral-400 mt-1">Realtime Order Monitor & Menu Setup</p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-neutral-800 pb-3 overflow-x-auto">
          {[
            { id: "orders", label: `Live Orders (${orders.length})` },
            { id: "menu", label: `Menu Items (${items.length})` },
            { id: "categories", label: `Categories (${categories.length})` },
            { id: "qr", label: "Table QR Generator" },
            { id: "settings", label: "Store Settings" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-orange-500 text-black font-bold"
                  : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "categories" && (
          <div className="space-y-6">
            <form onSubmit={handleAddCategory} className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-neutral-300">Add New Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Category Name (e.g. Cocktails, Grills)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Section (e.g. Drinks, Food)"
                  value={newCategorySection}
                  onChange={(e) => setNewCategorySection(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
                <input
                  type="url"
                  placeholder="Image URL (Optional)"
                  value={newCategoryImageUrl}
                  onChange={(e) => setNewCategoryImageUrl(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
              >
                + Save Category
              </button>
            </form>

            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-neutral-300">Existing Categories ({categories.length})</h2>
              {categories.length === 0 ? (
                <p className="text-xs text-neutral-500">No categories created yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="bg-black/60 rounded-xl border border-neutral-800 overflow-hidden flex flex-col justify-between">
                      {cat.image_url ? (
                        <img 
                          src={cat.image_url} 
                          alt={cat.name} 
                          className="w-full h-32 object-cover" 
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <div className="w-full h-32 bg-neutral-900 border-b border-neutral-800 flex items-center justify-center text-xs text-neutral-600">
                          No Image
                        </div>
                      )}
                      <div className="p-4 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-semibold text-neutral-200">{cat.name}</p>
                          <span className="text-[10px] text-neutral-500 uppercase">{cat.section || "Main"}</span>
                        </div>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="bg-neutral-800 hover:bg-red-900/50 text-neutral-400 hover:text-red-400 text-xs px-2.5 py-1 rounded-lg border border-neutral-700 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
