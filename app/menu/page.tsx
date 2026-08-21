"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function CustomerMenu() {
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [items, setItems] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [tableNumber, setTableNumber] = useState("1");
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      const { data: storeList } = await supabase.from("stores").select("*").limit(1);
      if (storeList && storeList.length > 0) {
        setStore(storeList[0]);
        const { data: menuData } = await supabase
          .from("menu_items")
          .select("*")
          .eq("store_id", storeList[0].id);

        setItems(menuData || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handlePlaceOrder = async () => {
    if (!store || cart.length === 0) return;

    const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const { error } = await supabase.from("orders").insert([
      {
        store_id: store.id,
        table_number: tableNumber,
        items: cart,
        total_price: totalPrice,
        status: "Pending"
      }
    ]);

    if (!error) {
      setCart([]);
      setIsOrderSuccess(true);
      setTimeout(() => setIsOrderSuccess(false), 5000);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const itemSec = (item.section || item.category || "").toUpperCase();
    const matchesSection = selectedSection === "ALL" || itemSec === selectedSection;
    return matchesSearch && matchesSection;
  });

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090A0C] text-white flex items-center justify-center font-sans">
        <div className="animate-pulse text-amber-500 font-bold">Loading Menu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090A0C] text-white p-4 md:p-8 font-sans pb-28">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-amber-500 tracking-wider uppercase">
            {store?.name || "DIGITAL MENU"}
          </h1>
          <p className="text-xs text-neutral-400">Select items to place your order directly to the kitchen</p>
        </div>

        {/* Section Navigator Tabs */}
        <div className="flex items-center justify-center gap-2 bg-[#121418] p-2 rounded-2xl border border-neutral-800">
          {["ALL", "RESTAURANT", "BAR", "HOTEL"].map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all text-center ${
                selectedSection === sec
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search dishes, drinks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#121418] border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/50"
        />

        {/* Order Success Toast */}
        {isOrderSuccess && (
          <div className="bg-emerald-500 text-black font-black p-4 rounded-2xl text-center text-xs shadow-2xl animate-bounce">
            🎉 ORDER PLACED SUCCESSFULLY! THE KITCHEN HAS RECEIVED YOUR ORDER.
          </div>
        )}

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#121418] border border-neutral-800/80 rounded-2xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300"}
                  alt={item.title}
                  className="w-16 h-16 rounded-xl object-cover border border-neutral-800 flex-shrink-0"
                />
                <div className="truncate">
                  <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                  <span className="text-[9px] bg-neutral-900 border border-neutral-800 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
                    {item.section || item.category || "Restaurant"}
                  </span>
                  <p className="text-xs font-extrabold text-amber-500 mt-1">
                    {store?.currency || "₦"}{item.price?.toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => addToCart(item)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 flex-shrink-0"
              >
                + ADD
              </button>
            </div>
          ))}
        </div>

        {/* Sticky Cart Drawer */}
        {cart.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto bg-[#121418] border border-amber-500/50 p-4 rounded-2xl shadow-2xl space-y-3 z-50">
            <div className="flex justify-between items-center text-xs border-b border-neutral-800 pb-2">
              <span className="font-bold text-amber-500">YOUR CART ({cart.length} ITEMS)</span>
              <div className="flex items-center gap-2">
                <label className="text-neutral-400">TABLE NO:</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-12 bg-black border border-neutral-700 text-center font-bold rounded py-0.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-neutral-300">
                  <span className="truncate max-w-[200px]">{item.title}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.id)} className="px-1.5 bg-neutral-800 rounded font-bold">-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => addToCart(item)} className="px-1.5 bg-neutral-800 rounded font-bold">+</button>
                    <span className="font-bold text-white w-14 text-right">₦{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handlePlaceOrder}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs py-3 rounded-xl uppercase transition-all shadow-lg shadow-amber-500/20"
            >
              SEND ORDER TO KITCHEN • TOTAL: {store?.currency || "₦"}{cartTotal.toLocaleString()}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
