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
  title: string;
  price: number;
  section?: string;
  category?: string;
  image_url?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

function CustomerMenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table") || "1";

  const [items, setItems] = useState<MenuItem[]>([]);
  const [store, setStore] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const totalCartAmount = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !store) return;
    setOrderSubmitting(true);
    try {
      const orderPayload = {
        store_id: store.id,
        table_number: tableParam,
        items: cart.map((i) => ({ id: i.id, title: i.title, price: i.price, quantity: i.quantity })),
        total_price: totalCartAmount,
        status: "Pending"
      };

      const { error } = await supabase.from("orders").insert([orderPayload]);
      if (!error) {
        setCart([]);
        setIsCartOpen(false);
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 5000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const itemSec = (item.section || item.category || "").toUpperCase();
    const matchesSection = selectedSection === "ALL" || itemSec === selectedSection;
    return matchesSearch && matchesSection;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] text-white flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 bg-[#101216] px-6 py-4 rounded-2xl border border-neutral-800 shadow-xl">
          <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-amber-500 font-bold text-xs tracking-wider uppercase">Loading Menu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080a] text-white font-sans pb-24">
      {/* Header Banner */}
      <div className="sticky top-0 z-40 bg-[#07080a]/90 backdrop-blur-md border-b border-neutral-800/80 px-4 py-4 md:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
              TABLE #{tableParam}
            </span>
            <h1 className="text-lg md:text-xl font-black text-white tracking-tight uppercase mt-1">
              {store?.name || "DIGITAL MENU"}
            </h1>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <span>MY ORDER</span>
            {totalCartCount > 0 && (
              <span className="bg-black text-amber-400 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {orderSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-center text-xs font-bold animate-fade-in">
            ✓ Your order has been sent directly to the kitchen for Table #{tableParam}!
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search food, drinks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#101216] border border-neutral-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-all"
          />

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {["ALL", "RESTAURANT", "BAR", "HOTEL"].map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all whitespace-nowrap active:scale-95 ${
                  selectedSection === sec
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "bg-[#101216] border border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#101216] border border-neutral-800/80 rounded-2xl p-4 flex gap-4 items-center justify-between shadow-lg hover:border-amber-500/30 transition-all"
            >
              <img
                src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300"}
                alt={item.title}
                className="w-20 h-20 rounded-xl object-cover border border-neutral-800/90 flex-shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                <p className="text-xs font-black text-amber-500">
                  {store?.currency || "₦"}{item.price?.toLocaleString()}
                </p>
                <button
                  onClick={() => addToCart(item)}
                  className="mt-2 bg-[#181a20] border border-neutral-700 hover:border-amber-500/60 text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                >
                  + Add to Order
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-over Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="bg-[#101216] border-l border-neutral-800 w-full max-w-md h-full p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <h2 className="text-sm font-black uppercase text-amber-500 tracking-wider">YOUR TABLE ORDER</h2>
                  <p className="text-xs text-neutral-400">Table #{tableParam}</p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-neutral-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                  Your basket is empty
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#07080a] border border-neutral-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white truncate">{item.title}</p>
                        <p className="text-amber-500 font-black">
                          {store?.currency || "₦"}{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-[#101216] border border-neutral-800 rounded-lg p-1">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-6 h-6 rounded bg-neutral-800 text-neutral-300 font-bold flex items-center justify-center hover:bg-neutral-700"
                        >
                          -
                        </button>
                        <span className="font-bold text-white px-1">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-6 h-6 rounded bg-amber-500 text-black font-black flex items-center justify-center hover:bg-amber-400"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-neutral-800 pt-4 space-y-4">
                <div className="flex justify-between items-center text-sm font-black">
                  <span className="text-neutral-400 uppercase">Total:</span>
                  <span className="text-amber-500 text-base">
                    {store?.currency || "₦"}{totalCartAmount.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={orderSubmitting}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                >
                  {orderSubmitting ? "SENDING TO KITCHEN..." : "CONFIRM & SUBMIT ORDER"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07080a] text-white flex items-center justify-center">
          <div className="text-amber-500 font-bold text-xs">Loading Menu...</div>
        </div>
      }
    >
      <CustomerMenuContent />
    </Suspense>
  );
}
