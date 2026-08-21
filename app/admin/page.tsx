"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CompleteAdminDashboard() {
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "categories" | "qr" | "settings">("orders");
  const [store, setStore] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Store Settings state
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("₦");

  // New Menu Item state
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");

  // New Category state
  const [newCategoryName, setNewCategoryName] = useState("");

  // Table QR state
  const [tableNum, setTableNum] = useState("1");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize notification chime
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch store
      let { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", "luxury-lounge")
        .single();

      if (!storeData) {
        const { data: altStore } = await supabase.from("stores").select("*").limit(1).single();
        storeData = altStore;
      }

      if (storeData) {
        setStore(storeData);
        setPhone(storeData.whatsapp_number || storeData.phone || "");
        setCurrency(storeData.currency || "₦");

        // 2. Fetch categories
        const { data: catData } = await supabase
          .from("categories")
          .select("*")
          .eq("store_id", storeData.id)
          .order("created_at", { ascending: true });
        setCategories(catData || []);
        if (catData && catData.length > 0) setNewItemCategory(catData[0].id);

        // 3. Fetch menu items
        const { data: menuData } = await supabase
          .from("menu_items")
          .select("*, categories(name)")
          .eq("store_id", storeData.id);
        setItems(menuData || []);

        // 4. Fetch existing orders
        const { data: orderData } = await supabase
          .from("orders")
          .select("*")
          .eq("store_id", storeData.id)
          .order("created_at", { ascending: false });
        setOrders(orderData || []);

        // 5. Setup Supabase Realtime Subscription for incoming orders
        const channel = supabase
          .channel("realtime-orders")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "orders",
              filter: `store_id=eq.${storeData.id}`
            },
            (payload) => {
              setOrders((prevOrders) => [payload.new, ...prevOrders]);
              if (audioEnabled && audioRef.current) {
                audioRef.current.play().catch(() => {});
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    } catch (err) {
      console.error("Dashboard initialization error:", err);
    } finally {
      setLoading(false);
    }
  };

  const playChimeTest = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setAudioEnabled(true);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle || !newItemPrice || !store) return;

    const { data, error } = await supabase
      .from("menu_items")
      .insert([
        {
          store_id: store.id,
          category_id: newItemCategory || null,
          title: newItemTitle,
          price: parseFloat(newItemPrice),
          description: newItemDesc,
          is_available: true
        }
      ])
      .select("*, categories(name)");

    if (!error && data) {
      setItems([...items, ...data]);
      setNewItemTitle("");
      setNewItemPrice("");
      setNewItemDesc("");
    } else {
      alert("Error adding item: " + (error?.message || "Unknown error"));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName || !store) return;

    const { data, error } = await supabase
      .from("categories")
      .insert([{ store_id: store.id, name: newCategoryName }])
      .select();

    if (!error && data) {
      setCategories([...categories, ...data]);
      setNewCategoryName("");
    } else {
      alert("Error adding category: " + (error?.message || "Unknown error"));
    }
  };

  const toggleItemAvailability = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !currentStatus })
      .eq("id", id);

    if (!error) {
      setItems(items.map((item) => (item.id === id ? { ...item, is_available: !currentStatus } : item)));
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (!error) setItems(items.filter((item) => item.id !== id));
  };

  const saveSettings = async () => {
    if (!store) return;
    const { error } = await supabase
      .from("stores")
      .update({ whatsapp_number: phone, currency: currency })
      .eq("id", store.id);

    if (error) alert("Error saving settings: " + error.message);
    else alert("Store settings updated successfully!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <p className="text-gray-400 animate-pulse font-medium">Restoring Admin Dashboard...</p>
      </div>
    );
  }

  const filteredItems = selectedCategory === "all"
    ? items
    : items.filter((item) => item.category_id === selectedCategory);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900/90 p-6 rounded-2xl border border-neutral-800 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-orange-500">
              {store?.name || "LUXURY LOUNGE"} — ADMIN
            </h1>
            <p className="text-xs text-neutral-400 mt-1">Realtime Order Monitor, Menu Management & QR Setup</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={playChimeTest}
              className={`text-xs px-3 py-2 rounded-xl border font-semibold transition ${
                audioEnabled
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white"
              }`}
            >
              {audioEnabled ? "🔔 Order Chime Active" : "🔕 Enable Order Sound"}
            </button>
            <a
              href="/"
              target="_blank"
              className="bg-neutral-800 hover:bg-neutral-700 text-orange-400 text-xs font-semibold px-4 py-2.5 rounded-xl border border-neutral-700 transition"
            >
              View Live Menu ↗
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
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

        {/* TAB 1: LIVE ORDERS */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-neutral-900/50 p-8 rounded-2xl border border-neutral-800 text-center text-neutral-500">
                No orders placed yet. New customer orders will pop up here live.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="bg-orange-500/10 text-orange-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-500/20">
                        Table #{order.table_number || "Takeout"}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-neutral-200 mt-2">{order.items_summary || "Order details"}</p>
                    <p className="text-xs text-orange-400 font-bold mt-1">{currency}{order.total_amount}</p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {order.status || "Received"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: MENU ITEMS */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            <form onSubmit={handleAddItem} className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-neutral-300">Add New Menu Item</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Item Title"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Base Price"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  required
                />
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
              >
                + Save Item
              </button>
            </form>

            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <h2 className="text-sm font-bold text-neutral-300">Current Menu Items ({filteredItems.length})</h2>
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                      selectedCategory === "all" ? "bg-orange-500 text-black font-bold" : "bg-black text-neutral-400 border-neutral-800"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                        selectedCategory === cat.id ? "bg-orange-500 text-black font-bold" : "bg-black text-neutral-400 border-neutral-800"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <p className="text-xs text-neutral-500">No menu items found for this filter.</p>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-black/60 rounded-xl border border-neutral-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          {item.categories?.name && (
                            <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md border border-neutral-700">
                              {item.categories.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-orange-400 font-bold mt-0.5">{currency}{item.price}</p>
                        {item.description && <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleItemAvailability(item.id, item.is_available)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                            item.is_available
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {item.is_available ? "Available" : "Unavailable"}
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="bg-neutral-800 hover:bg-red-900/50 text-neutral-400 hover:text-red-400 text-xs px-3 py-1.5 rounded-lg border border-neutral-700 transition"
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

        {/* TAB 3: CATEGORIES */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <form onSubmit={handleAddCategory} className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex gap-3">
              <input
                type="text"
                placeholder="Category Name (e.g. Cocktails, Grills, Desserts)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 flex-1"
                required
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
              >
                + Add Category
              </button>
            </form>

            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-3">
              <h2 className="text-sm font-bold text-neutral-300">Existing Categories</h2>
              {categories.length === 0 ? (
                <p className="text-xs text-neutral-500">No categories created yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <div key={cat.id} className="bg-black/60 p-4 rounded-xl border border-neutral-800 text-sm font-medium text-neutral-200">
                      {cat.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TABLE QR GENERATOR */}
        {activeTab === "qr" && (
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
            <h2 className="text-sm font-bold text-neutral-300">Generate Table QR Code</h2>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <input
                type="text"
                placeholder="Table Number"
                value={tableNum}
                onChange={(e) => setTableNum(e.target.value)}
                className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 w-full md:w-48"
              />
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent("https://digital-menu-5rnq.vercel.app?table=" + tableNum)}`}
                target="_blank"
                download={`Table-${tableNum}-QR.png`}
                className="bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs px-5 py-2.5 rounded-xl transition w-full md:w-auto text-center"
              >
                Download Table #{tableNum} QR Code
              </a>
            </div>
          </div>
        )}

        {/* TAB 5: STORE SETTINGS */}
        {activeTab === "settings" && (
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
            <h2 className="text-sm font-bold text-neutral-300">Store Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">WhatsApp Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 w-full"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 w-full"
                />
              </div>
            </div>
            <button
              onClick={saveSettings}
              className="bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs px-6 py-2.5 rounded-xl transition"
            >
              Save Settings
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
