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
    <div className="min-h-screen bg-[#030406] text-white font-sans pb-28 flex flex-col items-center relative overflow-hidden selection:bg-amber-500/30">
      
      {/* Background Luxury Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-600/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-amber-500/5 blur-[150px] pointer-events-none rounded-full" />

      {/* Embedded CSS Animations for Orbit & Glowing Effects */}
      <style jsx global>{`
        @keyframes orbitSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes orbitReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes luxuryPulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        .animate-orbit {
          animation: orbitSpin 12s linear infinite;
        }
        .animate-orbit-reverse {
          animation: orbitReverse 16s linear infinite;
        }
        .animate-luxury-pulse {
          animation: luxuryPulse 3s ease-in-out infinite;
        }
      `}</style>

      {/* Top Banner with Moving Orbit Animation */}
      <header className="w-full bg-gradient-to-b from-[#0e0f17] via-[#090a0f] to-[#030406] border-b border-amber-500/20 py-10 px-4 relative flex flex-col items-center justify-center shadow-2xl">
        
        {/* Moving Orbit Container */}
        <div className="relative w-48 h-20 flex items-center justify-center">
          
          {/* Outer Orbit Ring */}
          <div className="absolute inset-0 border border-amber-500/30 rounded-full animate-orbit border-t-amber-400 border-r-transparent border-b-amber-500/10 border-l-transparent shadow-[0_0_15px_rgba(245,158,11,0.2)]" />
          
          {/* Outer Orbit Satellite Planet */}
          <div className="absolute inset-0 animate-orbit">
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_12px_#f59e0b] border border-black" />
          </div>

          {/* Inner Counter Orbit Ring */}
          <div className="absolute w-36 h-14 border border-amber-300/40 rounded-full animate-orbit-reverse border-b-amber-400 border-t-transparent border-l-amber-500/20 border-r-transparent" />
          
          {/* Inner Satellite Planet */}
          <div className="absolute w-36 h-14 animate-orbit-reverse">
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-200 rounded-full shadow-[0_0_8px_#fde68a]" />
          </div>

          {/* Central LUXURY LOUNGE Text */}
          <div className="relative z-10 text-center animate-luxury-pulse">
            <span className="text-[9px] font-black tracking-[0.4em] uppercase text-amber-500/80 block mb-0.5">
              ✦ EXCLUSIVE EXPERIENCE ✦
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 drop-shadow-[0_0_18px_rgba(245,158,11,0.6)]">
              LUXURY LOUNGE
            </h1>
          </div>
        </div>

      </header>

      {/* Main Centered Container */}
      <main className="w-full max-w-2xl px-4 md:px-6 mt-6 space-y-6 flex flex-col items-center relative z-10">
        
        {/* Sub-Header Card: Table Number & Refresh */}
        <div className="w-full flex items-center justify-between bg-[#0b0c12]/90 backdrop-blur-xl border border-neutral-800/90 p-4 md:p-5 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-amber-600" />
          
          <div className="text-left pl-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
              TABLE / SUITE #{tableNumber}
            </span>
            <h2 className="text-lg font-black tracking-tight text-white mt-2">
              OUR MENU
            </h2>
          </div>

          {/* Refresh Button with Micro Interaction */}
          <button
            onClick={() => fetchMenuItems(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-[#12141e] hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-800 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 shadow-lg"
          >
            <span className={`text-sm ${isRefreshing ? "animate-spin" : ""}`}>
              🔄
            </span>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Category Filters (Centered Pills with Glow) */}
        <div className="w-full flex items-center justify-center gap-2.5 overflow-x-auto py-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase transition-all duration-300 whitespace-nowrap ${
                activeCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105"
                  : "bg-[#0b0c12]/80 text-neutral-400 border border-neutral-800/80 hover:text-white hover:border-neutral-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items List */}
        <div className="w-full space-y-3.5">
          {loading ? (
            <div className="text-center py-20 text-amber-500/70 text-xs font-black uppercase tracking-[0.2em] animate-pulse">
              Preparing Menu Experience...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-[#0b0c12]/80 border border-neutral-800 rounded-3xl text-neutral-500 text-xs font-bold uppercase tracking-widest">
              No items available in this category
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="w-full bg-[#0b0c12]/90 border border-neutral-800/80 hover:border-amber-500/50 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(245,158,11,0.12)] group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-16 h-16 rounded-2xl object-cover border border-neutral-800 group-hover:border-amber-500/40 shrink-0 shadow-md transition-all duration-300"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#12141e] border border-neutral-800 group-hover:border-amber-500/40 flex items-center justify-center text-2xl shrink-0 transition-all duration-300">
                      🍽️
                    </div>
                  )}

                  <div className="min-w-0 text-left">
                    <h3 className="font-bold text-sm text-white truncate group-hover:text-amber-200 transition-colors">
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

      </main>
    </div>
  );
}
