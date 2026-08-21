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

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => (ci.id === id ? { ...ci, quantity: ci.quantity + delta } : ci))
        .filter((ci) => ci.quantity > 0)
    );
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
    <div className="min-h-screen bg-[#0d0e12] text-white font-sans p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Animated Eye-Catching Header Banner */}
      <div className="relative overflow-hidden bg-neutral-900/90 border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl group">
        
        {/* Animated Moving Background Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
        
        {/* Moving Light Shimmer Overlay Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent -translate-x-full animate-[shimmer_4s_infinite]" />

        <div className="relative z-10 space-y-3">
          {/* Pulsing Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
              DIGITAL SERVICE
            </span>
          </div>

          {/* Heading with Moving Gradient Text Effect */}
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-500 bg-[length:200%_auto] animate-[gradient_6s_ease_infinite]">
            Order directly from your phone
          </h1>

          <p className="text-xs md:text-sm text-neutral-300 max-w-lg leading-relaxed">
            Browse our menu, select your dishes or hotel services, and place your order straight to{" "}
            <span className="text-amber-400 font-bold underline decoration-amber-500/50">
              Table #{tableNum}
            </span>.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {orderSuccess && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl text-center text-xs font-bold animate-bounce shadow-lg">
          ✓ Order sent to kitchen! Our staff is preparing it for Table #{tableNum}.
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black"
                : "bg-[#16181e] text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-neutral-500 font-bold uppercase tracking-wider">
          Loading Menu...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#16181e] border border-neutral-800 rounded-2xl p-8 text-center text-xs text-neutral-400">
          No items found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#16181e] border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-4 flex gap-4 transition-all"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title || item.name}
                  className="w-20 h-20 rounded-xl object-cover border border-neutral-800 shrink-0"
                />
              )}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{item.title || item.name}</h3>
                  {item.description && (
                    <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-black text-amber-400">
                    ₦{(item.price || 0).toLocaleString()}
                  </span>
                  <button
                    onClick={() => addToCart(item)}
                    className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95"
                  >
                    + ADD
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto bg-[#16181e]/95 border border-amber-500/40 p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 z-50">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
              Table #{tableNum} Order ({cart.reduce((a, b) => a + b.quantity, 0)} items)
            </span>
            <span className="text-sm font-black text-amber-400">
              ₦{cartTotal.toLocaleString()}
            </span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-5 py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? "SENDING..." : "CONFIRM ORDER 🚀"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CustomerMenuPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-neutral-500">Loading Menu...</div>}>
      <CustomerMenuContent />
    </Suspense>
  );
}
