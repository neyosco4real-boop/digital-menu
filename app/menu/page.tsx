"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface MenuItem {
  id: string;
  title?: string;
  name?: string;
  price: number;
  category: string;
  description?: string;
  image_url?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

function CustomerMenuContent() {
  const searchParams = useSearchParams();
  const tableNum = searchParams.get("table") || "1";

  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("menu_items").select("*");
      if (error) {
        console.error("Error fetching menu items:", error);
      } else {
        setItems(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category || "General")))];

  const filteredItems = selectedCategory === "All"
    ? items
    : items.filter((i) => (i.category || "General") === selectedCategory);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.id === item.id);
      if (existing) {
        return prev.map((ci) => (ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const cartTotal = cart.reduce((acc, ci) => acc + (ci.price || 0) * ci.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    const formattedItems = cart.map((ci) => ({
      id: ci.id,
      title: ci.title || ci.name || "Menu Item",
      price: ci.price,
      quantity: ci.quantity,
    }));

    try {
      const { error } = await supabase.from("orders").insert([
        {
          table_number: String(tableNum),
          items: formattedItems,
          total_price: cartTotal,
          status: "Pending",
        },
      ]);

      if (error) {
        console.error("Order submit failed:", error);
      } else {
        setCart([]);
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 6000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-white font-sans p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      
      {/* Luxury Hotel Header Card with Orbiting Light Beam */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#121318] via-[#0d0e12] to-[#08090c] border border-amber-500/30 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(217,119,6,0.12)] backdrop-blur-2xl transition-all">
        
        {/* Orbiting Moving Light Orb Element */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-amber-400 rounded-full blur-2xl opacity-60 animate-[spin_8s_linear_infinite] origin-[180px_180px]" />
          <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-yellow-300 rounded-full blur-2xl opacity-50 animate-[spin_10s_linear_infinite_reverse] origin-[-180px_-180px]" />
        </div>

        {/* Outer Traveling Border Light Flare */}
        <div className="absolute inset-[1px] rounded-3xl pointer-events-none overflow-hidden">
          <div className="absolute w-20 h-full bg-gradient-to-r from-transparent via-amber-300/40 to-transparent blur-md -skew-x-12 animate-[shimmer_4s_infinite]" />
        </div>

        {/* Ambient Moving Gold Background Glows */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-amber-500/20 via-yellow-600/10 to-transparent rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-amber-600/15 via-amber-400/5 to-transparent rounded-full blur-3xl animate-pulse pointer-events-none" />

        <div className="relative z-10 space-y-4">
          
          {/* Hotel VIP Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <span className="text-[10px] tracking-widest text-amber-300 uppercase font-serif">✦ 5-STAR CONCIERGE ✦</span>
          </div>

          {/* Luxury Serif Title */}
          <h1 className="text-3xl md:text-5xl font-serif tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 drop-shadow-sm">
            In-Room & Dining Service
          </h1>

          <p className="text-xs md:text-sm text-neutral-300 max-w-lg leading-relaxed font-light tracking-wide">
            Select your gourmet dishes or suite amenities. Your request will be transmitted directly to kitchen & concierge service for{" "}
            <span className="text-amber-300 font-semibold underline decoration-amber-400/40 underline-offset-4">
              Table / Suite #{tableNum}
            </span>.
          </p>

          {/* Elegant Divider Line */}
          <div className="pt-2">
            <div className="h-[1px] w-24 bg-gradient-to-r from-amber-400/60 to-transparent" />
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {orderSuccess && (
        <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 p-4 rounded-2xl text-center text-xs font-serif tracking-widest uppercase animate-bounce shadow-xl">
          ✦ Request Received. Our Concierge is preparing your order for Suite #{tableNum}.
        </div>
      )}

      {/* Category Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-serif tracking-wider whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/20 font-bold"
                : "bg-[#121318] text-neutral-400 hover:text-amber-300 border border-neutral-800/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Item Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-neutral-500 font-serif tracking-widest uppercase">
          Preparing Menu Experience...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#121318] border border-neutral-800 rounded-3xl p-10 text-center text-xs text-neutral-400 font-serif">
          No items available in this section.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#121318] border border-neutral-800/80 hover:border-amber-500/40 rounded-3xl p-5 flex gap-4 transition-all shadow-lg hover:shadow-2xl hover:shadow-amber-500/5 group"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title || item.name}
                  className="w-22 h-22 rounded-2xl object-cover border border-neutral-800 shrink-0 group-hover:scale-105 transition-transform duration-300"
                />
              )}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-serif font-semibold text-amber-100 group-hover:text-amber-300 transition-colors">
                    {item.title || item.name}
                  </h3>
                  {item.description && (
                    <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 font-light leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-serif font-bold text-amber-400">
                    ₦{(item.price || 0).toLocaleString()}
                  </span>
                  <button
                    onClick={() => addToCart(item)}
                    className="bg-amber-500/10 hover:bg-gradient-to-r hover:from-amber-400 hover:to-amber-500 text-amber-300 hover:text-black border border-amber-500/30 text-[10px] font-serif font-bold tracking-widest px-3.5 py-1.5 rounded-xl transition-all active:scale-95"
                  >
                    + ADD
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Bottom Order Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto bg-[#121318]/95 border border-amber-500/40 p-4 rounded-3xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4 z-50">
          <div>
            <span className="text-[10px] font-serif tracking-widest text-amber-300/80 uppercase block">
              Suite #{tableNum} Selection ({cart.reduce((a, b) => a + b.quantity, 0)})
            </span>
            <span className="text-sm font-serif font-bold text-amber-300">
              ₦{cartTotal.toLocaleString()}
            </span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-serif font-bold text-xs px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 tracking-wider"
          >
            {isSubmitting ? "TRANSMITTING..." : "CONFIRM ORDER ✦"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CustomerMenuPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-neutral-500 font-serif">Loading Concierge Menu...</div>}>
      <CustomerMenuContent />
    </Suspense>
  );
}
