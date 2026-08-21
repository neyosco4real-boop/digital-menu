"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function CustomerMenu() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table") || "1";

  const [items, setItems] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("Restaurant");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      const { data: storeList } = await supabase.from("stores").select("*").limit(1);
      if (storeList && storeList.length > 0) {
        setStore(storeList[0]);
        const sId = storeList[0].id;

        const { data: menuData } = await supabase
          .from("menu_items")
          .select("*")
          .eq("store_id", sId);

        setItems(menuData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[itemId] > 1) {
        updated[itemId] -= 1;
      } else {
        delete updated[itemId];
      }
      return updated;
    });
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const itemSec = (item.section || item.category || "").toLowerCase();
    const currentSec = activeSection.toLowerCase();
    const matchesSection = currentSec === "all" || itemSec === currentSec;
    return matchesSearch && matchesSection;
  });

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const qty = cart[item.id] || 0;
      return total + item.price * qty;
    }, 0);
  };

  const handlePlaceOrder = async () => {
    if (totalCartCount === 0 || !store) return;
    setIsOrdering(true);

    const cartItems = items
      .filter((i) => cart[i.id])
      .map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        quantity: cart[i.id],
      }));

    try {
      const { error } = await supabase.from("orders").insert([
        {
          store_id: store.id,
          table_number: parseInt(tableParam) || 1,
          items: cartItems,
          total_price: calculateTotal(),
          status: "Pending",
        },
      ]);

      if (!error) {
        setCart({});
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 5000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] text-white flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 bg-[#111318] px-6 py-4 rounded-2xl border border-neutral-800 shadow-xl">
          <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-amber-500 font-bold text-xs tracking-wider uppercase">Loading Luxury Menu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080a] text-white p-4 md:p-8 font-sans selection:bg-amber-500 selection:text-black">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#111216] via-[#16181f] to-[#111216] border border-amber-500/30 p-6 shadow-2xl">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <svg className="w-48 h-48 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </div>

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-amber-400 tracking-wide uppercase">
                {store?.name || "LUXURY LOUNGE"}
              </h1>
              <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xs">
                ★
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-500/90 tracking-wider">
              <span>⚡</span>
              <span>VIP INSTANT TABLE ORDER</span>
              <span className="bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full text-amber-400 text-[10px] ml-auto">
                TABLE #{tableParam}
              </span>
            </div>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <div className="bg-[#101216] p-1.5 rounded-2xl border border-neutral-800/80 flex items-center justify-between gap-1 shadow-inner">
          {["All", "Restaurant", "Bar", "Hotel"].map((category) => {
            const isActive = activeSection.toLowerCase() === category.toLowerCase();
            return (
              <button
                key={category}
                onClick={() => setActiveSection(category)}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black shadow-lg shadow-amber-500/20"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/40"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Section Title & Search Input */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xs font-black tracking-wider text-amber-500 uppercase">
              {activeSection.toUpperCase()} SELECTION ({filteredItems.length})
            </h2>
          </div>

          <div className="relative flex-1 max-w-[200px]">
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#101216] border border-neutral-800/90 rounded-xl px-3.5 py-2 pl-8 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 transition-all"
            />
            <span className="absolute left-2.5 top-2.5 text-xs text-neutral-500">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Order Success Banner */}
        {orderSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-xs font-bold text-center animate-in fade-in slide-in-from-top duration-300">
            🎉 Order sent to the kitchen! Table #{tableParam} will be served shortly.
          </div>
        )}

        {/* Menu Items List */}
        <div className="space-y-3.5">
          {filteredItems.map((item, idx) => {
            const qty = cart[item.id] || 0;
            const isPopular = item.is_popular || idx === 0 || idx === 3;

            return (
              <div
                key={item.id}
                className="group bg-[#101216] hover:bg-[#14161c] border border-neutral-800/90 hover:border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-black/50"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300"}
                    alt={item.title}
                    className="w-16 h-16 rounded-xl object-cover border border-neutral-800/90 flex-shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="space-y-1 min-w-0">
                    {isPopular && (
                      <span className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                        🔥 POPULAR
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-medium truncate">
                      {item.description || "Chef's special"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="bg-[#08090c] border border-amber-500/30 px-3 py-2 rounded-xl text-xs font-black text-amber-500 shadow-inner">
                    {store?.currency || "₦"}{item.price?.toLocaleString()}
                  </div>

                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(item.id)}
                      className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-amber-500/10 active:scale-95 flex items-center gap-1"
                    >
                      + ADD
                    </button>
                  ) : (
                    <div className="flex items-center bg-[#08090c] border border-neutral-800 rounded-xl p-1 gap-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 rounded-lg bg-neutral-800 text-white font-black text-xs flex items-center justify-center hover:bg-neutral-700 active:scale-95"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-amber-400 w-4 text-center">
                        {qty}
                      </span>
                      <button
                        onClick={() => addToCart(item.id)}
                        className="w-6 h-6 rounded-lg bg-amber-500 text-black font-black text-xs flex items-center justify-center hover:bg-amber-400 active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 bg-[#101216] rounded-2xl border border-neutral-800/80 space-y-2">
              <p className="text-sm text-neutral-400 font-bold">No items found</p>
              <p className="text-xs text-neutral-600">Try searching for another dish or selection.</p>
            </div>
          )}
        </div>

        {/* Floating Checkout Bar */}
        {totalCartCount > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-xl px-4 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="bg-gradient-to-r from-[#111216] via-[#181a20] to-[#111216] border border-amber-500/50 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 backdrop-blur-lg">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {totalCartCount} ITEM{totalCartCount > 1 ? "S" : ""} ADDED (TABLE #{tableParam})
                </p>
                <p className="text-base font-black text-amber-500">
                  {store?.currency || "₦"}{calculateTotal().toLocaleString()}
                </p>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isOrdering}
                className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isOrdering ? "CONFIRMING..." : "PLACE ORDER ⚡"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
