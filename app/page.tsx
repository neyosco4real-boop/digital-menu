"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DirectMenuPage() {
  const [store, setStore] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchStoreAndMenu();
  }, []);

  const fetchStoreAndMenu = async () => {
    try {
      // 1. Try fetching 'luxury-lounge'
      let { data: storeData, error: storeErr } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", "luxury-lounge")
        .single();

      // 2. Fallback to any store if slug isn't found exact match
      if (!storeData) {
        const { data: altStore } = await supabase
          .from("stores")
          .select("*")
          .limit(1)
          .single();
        storeData = altStore;
      }

      if (!storeData) {
        setErrorMsg("No restaurant store found in database.");
        setLoading(false);
        return;
      }

      setStore(storeData);

      // 3. Fetch menu items for this store id
      const { data: menuData, error: menuErr } = await supabase
        .from("menu_items")
        .select("*")
        .eq("store_id", storeData.id);

      if (menuErr) {
        setErrorMsg(menuErr.message);
      } else {
        setItems(menuData || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load menu data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <p className="text-gray-400 animate-pulse">Loading Menu...</p>
      </div>
    );
  }

  if (errorMsg || !store) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans p-6">
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl text-center max-w-md w-full space-y-2">
          <h2 className="text-red-500 font-bold text-lg">Menu Unavailable</h2>
          <p className="text-xs text-neutral-400">{errorMsg || "Failed to load venue menu data."}</p>
        </div>
      </div>
    );
  }

  const currency = store.currency || "₦";

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-neutral-900/80 p-6 rounded-2xl border border-neutral-800 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-orange-500">
            {store.name}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">Digital Menu & Ordering</p>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 text-center text-neutral-500">
              No menu items available right now. Please check back later.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 flex justify-between items-center gap-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-neutral-400 mt-0.5">{item.description}</p>
                  )}
                  <p className="text-xs text-orange-400 font-bold mt-1">
                    {currency}{item.price}
                  </p>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    item.is_available
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {item.is_available ? "Available" : "Sold Out"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
