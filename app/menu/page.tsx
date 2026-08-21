"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function CustomerMenuView() {
  const [activeSection, setActiveSection] = useState<"Restaurant" | "Bar" | "Hotel">("Restaurant");
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<{ item: any; quantity: number }[]>([]);
  const [store, setStore] = useState<any>(null);
  const [tableNumber, setTableNumber] = useState("1");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const { data: menuData } = await supabase
          .from("menu_items")
          .select("*")
          .eq("store_id", storeList[0].id);
        setItems(menuData || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const totalAmount = cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !store) return;
    setIsSubmitting(true);

    try {
      const orderPayload = {
        store_id: store.id,
        table_number: tableNumber,
        total_price: totalAmount,
        status: "pending",
        items: cart.map((c) => ({
          id: c.item.id,
          title: c.item.title,
          price: c.item.price,
          quantity: c.quantity,
          section: c.item.section || "Restaurant",
        })),
      };

      const { error } = await supabase.from("orders").insert([orderPayload]);
      if (!error) {
        setCart([]);
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 4000);
      }
    } catch (e) {
      console.error("Order submission failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(
    (item) => (item.section || "Restaurant").toLowerCase() === activeSection.toLowerCase()
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090A0C] text-white flex items-center justify-center font-sans">
        <div className="animate-pulse text-amber-500 font-bold">Loading Menu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090A0C] text-white p-4 md:p-8 font-sans pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-amber-500 uppercase tracking-wide">
            {store?.name || "EXECUTIVE MENU"}
          </h1>
          <p className="text-xs text-neutral-400">Select a section to explore items</p>
        </div>

        {/* Section Switcher Buttons */}
        <div className="grid grid-cols-3 gap-2 bg-[#121418] p-1.5 rounded-2xl border border-neutral-800">
          {(["Restaurant", "Bar", "Hotel"] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeSection === sec
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>{sec === "Restaurant" ? "🍽️" : sec === "Bar" ? "🍹" : "🏨"}</span>
              {sec}
            </button>
          ))}
        </div>

        {/* Success Alert */}
        {orderSuccess && (
          <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 p-4 rounded-2xl text-center text-xs font-bold animate-bounce">
            ✅ Your order has been sent directly to the kitchen!
          </div>
        )}

        {/* Item List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-12 text-neutral-500 text-xs">
              No items available under {activeSection}.
            </div>
          ) : (
            filteredItems.map((item) => {
              const inCart = cart.find((i) => i.item.id === item.id);
              return (
                <div
                  key={item.id}
                  className="bg-[#121418] border border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300"}
                      alt={item.title}
                      className="w-14 h-14 rounded-xl object-cover border border-neutral-800 flex-shrink-0"
                    />
                    <div className="truncate">
                      <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                      <p className="text-xs font-extrabold text-amber-500 mt-1">
                        {store?.currency || "₦"}{item.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {inCart ? (
                      <div className="flex items-center bg-black border border-neutral-800 rounded-xl">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 flex items-center justify-center text-amber-500 font-bold"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold px-2">{inCart.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 flex items-center justify-center text-amber-500 font-bold"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-3 py-2 rounded-xl transition-all"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Cart Summary Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto bg-[#121418] border border-amber-500/50 p-4 rounded-2xl shadow-2xl flex items-center justify-between z-40 backdrop-blur-md">
          <div>
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">
              Table / Room #
            </span>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="bg-black border border-neutral-800 rounded-lg px-2 py-1 text-xs w-16 text-white text-center font-bold"
            />
          </div>

          <div>
            <span className="text-[10px] text-neutral-400 block font-bold">Total</span>
            <span className="text-sm font-black text-amber-500">
              {store?.currency || "₦"}{totalAmount.toLocaleString()}
            </span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Place Order 🚀"}
          </button>
        </div>
      )}
    </div>
  );
}
