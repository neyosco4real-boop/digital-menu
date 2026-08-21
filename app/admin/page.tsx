"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminPage() {
  const slug = "luxury-lounge";
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "qr" | "settings">("orders");
  const [store, setStore] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("₦");

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [tableNum, setTableNum] = useState("1");

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    setLoading(true);
    try {
      let { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!storeData) {
        const { data: altStore } = await supabase.from("stores").select("*").limit(1).single();
        storeData = altStore;
      }

      if (storeData) {
        setStore(storeData);
        setPhone(storeData.whatsapp_number || storeData.phone || "");
        setCurrency(storeData.currency || "₦");

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
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
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
          title: newItemTitle,
          price: parseFloat(newItemPrice),
          description: newItemDesc,
          is_available: true
        }
      ])
      .select();

    if (!error && data) {
      setItems([...items, ...data]);
      setNewItemTitle("");
      setNewItemPrice("");
      setNewItemDesc("");
    } else {
      alert("Error adding item: " + (error?.message || "Unknown error"));
    }
  };

  const toggleItemAvailability = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !currentStatus })
      .eq("id", id);

    if (!error) {
      setItems(items.map(item => item.id === id ? { ...item, is_available: !currentStatus } : item));
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (!error) {
      setItems(items.filter(item => item.id !== id));
    }
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
        <p className="text-gray-400 animate-pulse">Loading Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900/80 p-6 rounded-2xl border border-neutral-800 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-orange-500">
              {store?.name || "LUXURY LOUNGE"} — ADMIN
            </h1>
            <p className="text-xs text-neutral-400 mt-1">Manage live orders, menu items, and table QR codes</p>
          </div>
          <a
            href="/"
            target="_blank"
            className="bg-neutral-800 hover:bg-neutral-700 text-orange-400 text-xs font-semibold px-4 py-2.5 rounded-xl border border-neutral-700 transition"
          >
            View Live Menu ↗
          </a>
        </div>

        <div className="flex gap-2 border-b border-neutral-800 pb-3 overflow-x-auto">
          {[
            { id: "orders", label: `Live Orders (${orders.length})` },
            { id: "menu", label: `Menu Items (${items.length})` },
            { id: "qr", label: "Table QR Generator" },
            { id: "settings", label: "Store Settings" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-orange-500 text-black font-bold"
                  : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-neutral-900/50 p-8 rounded-2xl border border-neutral-800 text-center text-neutral-500">
                No orders placed yet. Customer orders will appear here in real-time.
              </div>
            ) : (
              orders.map(order => (
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

        {activeTab === "menu" && (
          <div className="space-y-6">
            <form onSubmit={handleAddItem} className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-neutral-300">Add New Menu Item</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Item Title (e.g. Club Sandwich)"
                  value={newItemTitle}
                  onChange={e => setNewItemTitle(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Base Price (e.g. 3500)"
                  value={newItemPrice}
                  onChange={e => setNewItemPrice(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  value={newItemDesc}
                  onChange={e => setNewItemDesc(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
              >
                + Add Item
              </button>
            </form>

            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-neutral-300">Current Menu Items ({items.length})</h2>
              {items.length === 0 ? (
                <p className="text-xs text-neutral-500">No menu items found. Create one above.</p>
              ) : (
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-black/60 rounded-xl border border-neutral-800/80">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-orange-400 font-bold">{currency}{item.price}</p>
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

        {activeTab === "qr" && (
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
            <h2 className="text-sm font-bold text-neutral-300">Generate Table QR Code</h2>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <input
                type="text"
                placeholder="Table Number (e.g. 5)"
                value={tableNum}
                onChange={e => setTableNum(e.target.value)}
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

        {activeTab === "settings" && (
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
            <h2 className="text-sm font-bold text-neutral-300">Store Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">WhatsApp Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 w-full"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
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
