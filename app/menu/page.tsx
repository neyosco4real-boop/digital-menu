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
  description?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

function CustomerMenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table") || "1";

  const [items, setItems] = useState<MenuItem[]>([]);
  const [store, setStore] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

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
    setOrderError(null);

    try {
      const orderPayload = {
        store_id: store.id,
        table_number: tableParam.toString(),
        items: cart.map((i) => ({
          id: i.id,
          title: i.title,
          price: i.price,
          quantity: i.quantity,
        })),
        total_price: totalCartAmount,
        status: "Pending",
      };

      const { data, error } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select();

      if (error) {
        console.error("Supabase Order Error:", error);
        setOrderError(error.message || "Failed to submit order. Please try again.");
      } else {
        setCart([]);
        setIsCartOpen(false);
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 6000);
      }
    } catch (e: any) {
      console.error(e);
      setOrderError(e?.message || "An unexpected error occurred.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  const dynamicCategories = items.map((i) => (i.section || i.category || "").toUpperCase()).filter(Boolean);
  const categories = Array.from(new Set(["ALL", "RESTAURANT", "BAR", "HOTEL", ...dynamicCategories]));

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const itemCat = (item.section || item.category || "General").toUpperCase();
    const matchesCat = selectedCategory === "ALL" || itemCat === selectedCategory;
    return matchesSearch && matchesCat;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] text-white flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 bg-[#16181e] px-6 py-4 rounded-2xl border border-neutral-800 shadow-2xl">
          <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-amber-500 font-black text-xs tracking-widest uppercase">Loading Experience...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white font-sans pb-32">
      <header className="sticky top-0 z-30 bg-[#0d0e12]/80 backdrop-blur-xl border-b border-neutral-800/80 px-4 py-4 md:px-8 shadow-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#0d0e12] rounded-[14px] flex items-center justify-center font-black text-amber-500 text-sm">
                {store?.name?.[0] || "M"}
              </div>
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black tracking-tight text-white uppercase">
                {store?.name || "DIGITAL MENU"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Table #{tableParam}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 bg-size-200 hover:bg-right text-black font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all duration-300"
          >
            <span>MY ORDER</span>
            {totalCartCount > 0 && (
              <span className="bg-black text-amber-400 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black animate-bounce">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {orderSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-center text-xs font-bold shadow-lg animate-fade-in flex items-center justify-center gap-2">
            <span>✓ Order submitted successfully! Live kitchen alert sent for Table #{tableParam}.</span>
          </div>
        )}

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181a22] to-[#111218] border border-neutral-800/80 p-6 shadow-2xl">
          <div className="relative z-10 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              Digital Service
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Order directly from your phone
            </h2>
            <p className="text-xs text-neutral-400 max-w-sm">
              Browse our menu, select your dishes or hotel services, and place your order straight to Table #{tableParam}.
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        <div className="space-y-3 sticky top-[73px] z-20 bg-[#0d0e12]/95 backdrop-blur-md pt-2 pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search food, drinks, hotel services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#16181e] border border-neutral-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/80 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all duration-200 whitespace-nowrap active:scale-95 ${
                  selectedCategory === cat
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                    : "bg-[#16181e] border border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-[#16181e] border border-neutral-800/80 hover:border-amber-500/40 rounded-3xl p-4 flex flex-col justify-between gap-4 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-amber-500/5"
            >
              <div className="flex gap-4 items-start">
                <img
                  src={
                    item.image_url ||
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300"
                  }
                  alt={item.title}
                  className="w-20 h-20 rounded-2xl object-cover border border-neutral-800 flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                    {item.description || "Freshly prepared dish or service crafted for your comfort."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60">
                <span className="text-sm font-black text-amber-500">
                  {store?.currency || "₦"}{item.price?.toLocaleString()}
                </span>
                <button
                  onClick={() => addToCart(item)}
                  className="bg-[#20232c] border border-neutral-700 hover:border-amber-500 text-amber-400 hover:text-amber-300 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1"
                >
                  <span>+</span> ADD
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-4">
          <div className="max-w-md mx-auto bg-gradient-to-r from-amber-500 to-amber-400 text-black p-4 rounded-2xl flex items-center justify-between shadow-2xl shadow-amber-500/30 border border-amber-300">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase opacity-80">CURRENT ORDER</p>
              <p className="text-sm font-black">
                {totalCartCount} {totalCartCount === 1 ? "Item" : "Items"} • {store?.currency || "₦"}{totalCartAmount.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-black text-amber-400 font-black text-xs px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
            >
              VIEW BASKET &rarr;
            </button>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end">
          <div className="bg-[#16181e] border-l border-neutral-800 w-full max-w-md h-full p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    TABLE #{tableParam}
                  </span>
                  <h2 className="text-base font-black text-white uppercase mt-1">YOUR BASKET</h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {orderError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-bold">
                  {orderError}
                </div>
              )}

              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Your order is empty</p>
                  <p className="text-[11px] text-neutral-600">Select items from the menu to start your order.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0d0e12] border border-neutral-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-white truncate">{item.title}</p>
                        <p className="text-amber-500 font-black text-xs">
                          {store?.currency || "₦"}{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-[#16181e] border border-neutral-800 rounded-xl p-1">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 font-bold flex items-center justify-center hover:bg-neutral-700 active:scale-95"
                        >
                          -
                        </button>
                        <span className="font-bold text-xs text-white px-1">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-7 h-7 rounded-lg bg-amber-500 text-black font-black flex items-center justify-center hover:bg-amber-400 active:scale-95"
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
                  <span className="text-neutral-400 uppercase">Subtotal:</span>
                  <span className="text-amber-500 text-base">
                    {store?.currency || "₦"}{totalCartAmount.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={orderSubmitting}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs py-4 rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                >
                  {orderSubmitting ? "TRANSMITTING TO KITCHEN..." : "CONFIRM & SEND ORDER"}
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
        <div className="min-h-screen bg-[#0d0e12] text-white flex items-center justify-center">
          <div className="text-amber-500 font-bold text-xs">Loading Menu...</div>
        </div>
      }
    >
      <CustomerMenuContent />
    </Suspense>
  );
}
