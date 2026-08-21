"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface MenuItem {
  id: string;
  title?: string;
  price: number;
  category: string;
  image_url?: string;
}

export default function CustomerMenu() {
  const params = useParams();
  const tableNumber = params?.slug || "1";

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = ["All", "Restaurant", "Bar", "Hotel"];

  const fetchMenuItems = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);

    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMenuItems(data);
    }
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const filteredItems = menuItems.filter(
    (item) =>
      activeCategory === "All" ||
      (item.category || "").toLowerCase() === activeCategory.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-[#030406] text-white font-sans pb-24 flex flex-col items-center">
      {/* Animated Luxury Lounge Banner */}
      <div className="w-full bg-gradient-to-r from-amber-950 via-neutral-900 to-amber-950 border-b border-amber-500/20 py-3 overflow-hidden shadow-2xl relative">
        <div className="flex whitespace-nowrap animate-marquee items-center gap-8 justify-center">
          <span className="text-xs tracking-[0.3em] uppercase font-black text-amber-400/90 animate-pulse">
            ✦ WELCOME TO LUXURY LOUNGE ✦
          </span>
          <span className="text-xs tracking-[0.3em] uppercase font-black text-amber-200 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]">
            LUXURY LOUNGE
          </span>
          <span className="text-xs tracking-[0.3em] uppercase font-black text-amber-400/90 animate-pulse">
            ✦ EXCLUSIVE EXPERIENCES ✦
          </span>
          <span className="text-xs tracking-[0.3em] uppercase font-black text-amber-200 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]">
            LUXURY LOUNGE
          </span>
        </div>
      </div>

      {/* Main Centered Container */}
      <div className="w-full max-w-2xl px-4 md:px-6 mt-6 space-y-6 flex flex-col items-center">
        
        {/* Header Card */}
        <header className="w-full flex items-center justify-between bg-[#0b0c12] border border-neutral-800/80 p-5 rounded-3xl shadow-2xl backdrop-blur-md">
          <div className="text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
              TABLE / SUITE #{tableNumber}
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white mt-2">
              OUR MENU
            </h1>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchMenuItems(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-[#12141e] hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-800 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 shadow-lg"
          >
            <span className={`text-sm ${isRefreshing ? "animate-spin" : ""}`}>
              🔄
            </span>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </header>

        {/* Category Filters (Centered) */}
        <div className="w-full flex items-center justify-center gap-2 overflow-x-auto py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase transition-all whitespace-nowrap ${
                activeCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25 scale-105"
                  : "bg-[#0b0c12] text-neutral-400 border border-neutral-800 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items List (Centered Column) */}
        <div className="w-full space-y-3.5">
          {loading ? (
            <div className="text-center py-20 text-neutral-500 text-xs font-bold uppercase tracking-widest">
              Loading Luxury Menu...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-[#0b0c12] border border-neutral-800 rounded-3xl text-neutral-500 text-xs font-bold uppercase tracking-widest">
              No items available in this category
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="w-full bg-[#0b0c12] border border-neutral-800/90 hover:border-amber-500/40 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-xl transition-all duration-300 hover:scale-[1.01]"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-16 h-16 rounded-2xl object-cover border border-neutral-800 shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#12141e] border border-neutral-800 flex items-center justify-center text-2xl shrink-0">
                      🍽️
                    </div>
                  )}

                  <div className="min-w-0 text-left">
                    <h3 className="font-bold text-sm text-white truncate">
                      {item.title}
                    </h3>
                    <p className="font-black text-amber-400 text-sm mt-1">
                      ₦{(item.price || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
