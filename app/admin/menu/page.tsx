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

export default function AdminMenuManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const categories = ["Restaurant", "Bar", "Hotel"];

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setMenuItems(data);
    if (error) console.error("Error fetching menu items:", error);
  };

  const handleCategoryChange = async (itemId: string, newCategory: string) => {
    setUpdatingId(itemId);

    // Optimistic UI update
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, category: newCategory } : item
      )
    );

    const { error } = await supabase
      .from("menu_items")
      .update({ category: newCategory })
      .eq("id", itemId);

    if (error) {
      console.error("Failed to update category:", error);
      alert(`Error updating category: ${error.message}`);
      fetchMenuItems(); // Rollback on error
    }

    setUpdatingId(null);
  };

  const filteredItems = menuItems.filter(
    (item) =>
      activeFilter === "All" ||
      (item.category || "").toLowerCase() === activeFilter.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-[#07080a] text-white p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#12141a] p-6 rounded-3xl border border-neutral-800 shadow-2xl">
          <div>
            <h1 className="text-xl font-black tracking-widest text-amber-500 uppercase">
              ADMIN MENU MANAGER
            </h1>
            <p className="text-xs text-neutral-400 font-medium mt-1">
              Switch item categories instantly between Restaurant, Bar, and Hotel.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 bg-[#090a0f] p-1.5 rounded-2xl border border-neutral-800">
            {["All", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                  activeFilter.toLowerCase() === cat.toLowerCase()
                    ? "bg-amber-500 text-black shadow-md"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#12141a] border border-neutral-800 hover:border-neutral-700 p-5 rounded-3xl flex items-center justify-between gap-4 shadow-xl transition-all"
            >
              <div className="flex items-center gap-4 min-w-0">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title || item.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-neutral-800 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#090a0f] border border-neutral-800 flex items-center justify-center shrink-0 text-xl">
                    🍽️
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="font-black text-xs text-white truncate">
                    {item.title || item.name}
                  </h3>
                  <p className="font-black text-amber-400 text-xs mt-0.5">
                    ₦{(item.price || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate mt-1">
                    Current:{" "}
                    <span className="text-amber-300 font-bold uppercase">
                      {item.category || "Unassigned"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Inline Category Switcher Dropdown */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-neutral-400">
                  Category
                </label>
                <select
                  value={item.category || "Restaurant"}
                  disabled={updatingId === item.id}
                  onChange={(e) =>
                    handleCategoryChange(item.id, e.target.value)
                  }
                  className="bg-[#090a0f] border border-amber-500/40 text-amber-400 hover:border-amber-400 text-xs font-black py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#12141a] text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
