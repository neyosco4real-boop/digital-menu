"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

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
    <div className="min-h-screen bg-[#030406] text-white p-4 md:p-8 font-sans pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-[#0b0c12] border border-neutral-800 p-5 rounded-3xl shadow-xl">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
              TABLE / SUITE #{tableNumber}
            </span>
            <h1 className="text-xl font-black text-white mt-2">OUR MENU</h1>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchMenuItems(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-[#12141e] hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-800 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            <span className={`text-sm ${isRefreshing ? "animate-spin" : ""}`}>
              🔄
            </span>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </header>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase transition-all whitespace-nowrap ${
                activeCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                  : "bg-[#0b0c12] text-neutral-400 border border-neutral-800 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items List */}
        {loading ? (
          <div className="text-center py-16 text-neutral-500 text-xs font-bold uppercase tracking-widest">
            Loading Menu...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-[#0b0c12] border border-neutral-800 rounded-3xl text-neutral-500 text-xs font-bold uppercase tracking-widest">
            No items available
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#0b0c12] border border-neutral-800/90 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-xl"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-16 h-16 rounded-2xl object-cover border border-neutral-800 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#12141e] border border-neutral-800 flex items-center justify-center text-2xl shrink-0">
                      🍽️
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-white truncate">
                      {item.title}
                    </h3>
                    <p className="font-black text-amber-400 text-xs mt-1">
                      ₦{(item.price || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
