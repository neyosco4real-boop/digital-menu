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

export default function AdminDashboard() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("All");

  // Form State
  const [title, setTitle] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [category, setCategory] = useState<string>("Restaurant");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [description, setDescription] = useState<string>("");

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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return alert("Please fill in title and price.");

    setIsSubmitting(true);
    const newItem = {
      title,
      name: title,
      price: parseFloat(price),
      category,
      image_url: imageUrl || null,
      description: description || null,
    };

    const { data, error } = await supabase
      .from("menu_items")
      .insert([newItem])
      .select();

    if (error) {
      console.error("Error adding item:", error);
      alert(`Error adding item: ${error.message}`);
    } else if (data) {
      setMenuItems((prev) => [data[0], ...prev]);
      setTitle("");
      setPrice("");
      setImageUrl("");
      setDescription("");
      setCategory("Restaurant");
    }
    setIsSubmitting(false);
  };

  const handleCategoryChange = async (itemId: string, newCategory: string) => {
    setUpdatingId(itemId);

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
      fetchMenuItems();
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
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Add New Menu Item Form */}
          <div className="lg:col-span-5 bg-[#12141a] border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-sm font-black tracking-widest text-amber-500 uppercase">
                ADD NEW MENU ITEM
              </h2>
            </div>

            <form onSubmit={handleAddItem} className="space-y-5">
              {/* Item Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Item Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Jollof Rice Special"
                  required
                  className="w-full bg-[#090a0f] border border-neutral-800 focus:border-amber-500 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600"
                />
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Price (₦)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="3500"
                    required
                    className="w-full bg-[#090a0f] border border-neutral-800 focus:border-amber-500 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#090a0f] border border-amber-500 text-amber-400 text-xs font-black px-3 py-3 rounded-2xl outline-none cursor-pointer focus:ring-1 focus:ring-amber-500 transition-all"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#12141a] text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#090a0f] border border-neutral-800 focus:border-amber-500 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Item details..."
                  className="w-full bg-[#090a0f] border border-neutral-800 focus:border-amber-500 text-xs font-bold text-white px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-neutral-600 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "+ ADD TO MENU"}
              </button>
            </form>
          </div>

          {/* RIGHT: Menu Items List & Category Switcher */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#12141a] p-6 rounded-3xl border border-neutral-800">
              <div>
                <h3 className="text-xs font-black tracking-widest text-amber-500 uppercase">
                  EXISTING MENU ITEMS
                </h3>
                <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                  Filter or update category inline
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[#090a0f] p-1.5 rounded-2xl border border-neutral-800">
                {["All", ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
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

            <div className="grid grid-cols-1 gap-3 max-h-[650px] overflow-y-auto pr-1">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#12141a] border border-neutral-800 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-md hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title || item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-neutral-800 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#090a0f] border border-neutral-800 flex items-center justify-center shrink-0 text-lg">
                        🍽️
                      </div>
                    )}

                    <div className="min-w-0">
                      <h4 className="font-black text-xs text-white truncate">
                        {item.title || item.name}
                      </h4>
                      <p className="font-black text-amber-400 text-xs mt-0.5">
                        ₦{(item.price || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <select
                      value={item.category || "Restaurant"}
                      disabled={updatingId === item.id}
                      onChange={(e) =>
                        handleCategoryChange(item.id, e.target.value)
                      }
                      className="bg-[#090a0f] border border-neutral-800 text-amber-400 text-xs font-black py-1.5 px-2.5 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all"
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
      </div>
    </div>
  );
}
