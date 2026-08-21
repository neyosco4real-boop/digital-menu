"use client";

import { useState, useEffect } from "react";
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

export default function CustomerMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get("table");
      if (tableParam) setTableNumber(tableParam);
    }
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    const { data } = await supabase.from("menu_items").select("*");
    if (data) setMenuItems(data);
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const categories = ["All", ...Array.from(new Set(menuItems.map((i) => i.category || "Dishes")))];

  const filteredItems =
    selectedCategory === "All"
      ? menuItems
      : menuItems.filter((i) => (i.category || "Dishes") === selectedCategory);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);

    const formattedItems = cart.map((ci) => ({
      id: ci.id,
      title: ci.title || ci.name || "Menu Item",
      price: ci.price,
      quantity: ci.quantity,
    }));

    // Cleaned payload matching your actual Supabase table columns
    const payload = {
      table_number: String(tableNumber),
      items: formattedItems,
      total_price: Number(totalPrice),
      status: "Pending",
    };

    try {
      const { error } = await supabase.from("orders").insert([payload]);

      if (error) {
        console.error("Supabase Database Error:", error.message);
        alert(`Order error: ${error.message}`);
      } else {
        setCart([]);
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 5000);
      }
    } catch (e: any) {
      console.error("Unexpected submission error:", e);
      alert("An unexpected error occurred while placing your order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-white font-sans relative overflow-hidden selection:bg-amber-500 selection:text-black pb-32">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-80 h-80 bg-amber-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto px-5 py-8 relative z-10 space-y-8">
        {/* Luxury Header */}
        <div className="text-center space-y-3 pt-4 border-b border-neutral-800/80 pb-8 relative">
          <div className="inline-flex items-center gap-1.5 bg-neutral-900/90 border border-amber-500/30 px-3.5 py-1 rounded-full shadow-inner">
            <span className="text-amber-400 text-xs tracking-widest">★ ★ ★ ★ ★</span>
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider ml-1">
              LUXURY DINING
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-sm">
            SUITE & TABLE SELECTION
          </h1>

          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold tracking-widest text-neutral-400 uppercase">
              TABLE #{tableNumber} • LIVE KITCHEN CONNECTED
            </span>
          </div>
        </div>

        {orderSuccess && (
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black p-4 rounded-2xl font-black text-center text-xs tracking-wider uppercase shadow-2xl animate-bounce border border-emerald-300">
            ✨ YOUR ORDER HAS BEEN TRANSMITTED DIRECTLY TO THE KITCHEN!
          </div>
        )}

        {/* Category Filters */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border ${
                  selectedCategory === cat
                    ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20"
                    : "bg-[#12141a] text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const inCart = cart.find((i) => i.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-[#12141a]/90 backdrop-blur-md border border-neutral-800/90 hover:border-amber-500/40 p-4 rounded-3xl transition-all duration-300 flex justify-between gap-4 shadow-xl group"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title || item.name}
                    className="w-20 h-20 rounded-2xl object-cover border border-neutral-800 shrink-0 group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-xs text-neutral-100 group-hover:text-amber-400 transition-colors">
                        {item.title || item.name}
                      </h3>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                        {item.category || "Dishes"}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 font-medium">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/60">
                    <span className="font-black text-sm text-amber-400">
                      ₦{(item.price || 0).toLocaleString()}
                    </span>

                    {inCart ? (
                      <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-1">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-amber-400 font-black text-xs px-1 hover:text-white"
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-white px-1">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          className="text-amber-400 font-black text-xs px-1 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all shadow-md active:scale-95"
                      >
                        + ADD
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-lg bg-[#12141a]/95 backdrop-blur-xl border border-amber-500/50 p-4 rounded-3xl shadow-2xl shadow-amber-500/10 z-50 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                {cart.reduce((a, b) => a + b.quantity, 0)} Selected Items
              </span>
            </div>
            <div className="text-base font-black text-amber-400">
              ₦{totalPrice.toLocaleString()}
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={submitting}
            className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black text-xs tracking-wider uppercase px-6 py-3.5 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <span>{submitting ? "TRANSMITTING..." : "PLACE ORDER NOW"}</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}
    </div>
  );
}
