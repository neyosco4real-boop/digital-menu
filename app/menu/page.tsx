"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function MenuContent() {
  const searchParams = useSearchParams();
  const tableNum = searchParams.get("table") || "1";

  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const [cart, setCart] = useState<any[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<{ [itemId: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [orderSent, setOrderSent] = useState(false);

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      const { data: storeList } = await supabase.from("stores").select("*").limit(1);
      if (!storeList || storeList.length === 0) return;
      const s = storeList[0];
      setStore(s);

      const [catRes, itemRes, varRes] = await Promise.all([
        supabase.from("categories").select("*").eq("store_id", s.id).order("created_at"),
        supabase.from("menu_items").select("*").eq("store_id", s.id),
        supabase.from("item_variants").select("*")
      ]);

      setCategories(catRes.data || []);
      setItems(itemRes.data || []);
      setVariants(varRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVariant = (itemId: string, variant: any) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [itemId]: variant
    }));
  };

  const addToCart = (item: any) => {
    const selectedVariant = selectedVariants[item.id];
    const cartItemId = selectedVariant ? `${item.id}-${selectedVariant.id}` : item.id;
    const itemPrice = item.price + (selectedVariant ? parseFloat(selectedVariant.price_extra || "0") : 0);
    const itemTitle = selectedVariant ? `${item.title} (${selectedVariant.name})` : item.title;

    setCart((prev) => {
      const existing = prev.find((i) => i.cartItemId === cartItemId);
      if (existing) {
        return prev.map((i) =>
          i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { cartItemId, id: item.id, title: itemTitle, price: itemPrice, quantity: 1 }];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.cartItemId === cartItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  };

  const totalAmount = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !store) return;

    const summary = cart.map((i) => `${i.quantity}x ${i.title}`).join(", ");

    const { error } = await supabase.from("orders").insert([
      {
        store_id: store.id,
        table_number: tableNum,
        items_summary: summary,
        total_amount: totalAmount,
        kitchen_status: "Pending"
      }
    ]);

    if (!error) {
      setOrderSent(true);
      setCart([]);
      setTimeout(() => setOrderSent(false), 5000);
    } else {
      alert("Error submitting order. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <div className="animate-pulse font-bold text-orange-500">Loading Menu...</div>
      </div>
    );
  }

  const filteredItems = activeCategory === "all"
    ? items
    : items.filter((i) => i.category_id === activeCategory);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-black uppercase text-orange-500 tracking-wider">
              {store?.name || "Digital Menu"}
            </h1>
            <p className="text-[10px] text-neutral-400">Table #{tableNum}</p>
          </div>
          <span className="text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full">
            Table {tableNum}
          </span>
        </div>
      </header>

      {/* Success Notification */}
      {orderSent && (
        <div className="bg-emerald-500 text-black font-extrabold text-xs text-center py-3 px-4 sticky top-[65px] z-20 animate-bounce">
          ✓ Your order has been sent directly to the kitchen!
        </div>
      )}

      {/* Categories Bar */}
      <div className="max-w-md mx-auto p-4 overflow-x-auto flex gap-2 no-scrollbar">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeCategory === "all"
              ? "bg-orange-500 text-black shadow-md shadow-orange-500/20"
              : "bg-neutral-900 text-neutral-400 border border-neutral-800"
          }`}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === cat.id
                ? "bg-orange-500 text-black shadow-md shadow-orange-500/20"
                : "bg-neutral-900 text-neutral-400 border border-neutral-800"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items List */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        {filteredItems.map((item) => {
          const itemVariants = variants.filter((v) => v.menu_item_id === item.id);
          const currentVariant = selectedVariants[item.id];

          return (
            <div
              key={item.id}
              className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 space-y-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-bold text-sm text-white">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-neutral-400 mt-0.5">{item.description}</p>
                  )}
                </div>
                <span className="font-extrabold text-sm text-orange-400">
                  {store?.currency || "₦"}
                  {item.price + (currentVariant ? parseFloat(currentVariant.price_extra || "0") : 0)}
                </span>
              </div>

              {/* Variants Selector */}
              {itemVariants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {itemVariants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleSelectVariant(item.id, v)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                        currentVariant?.id === v.id
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                          : "bg-black/40 text-neutral-400 border-neutral-800"
                      }`}
                    >
                      {v.name} (+{store?.currency || "₦"}{v.price_extra})
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => addToCart(item)}
                className="w-full bg-neutral-800 hover:bg-orange-500 hover:text-black text-white font-bold text-xs py-2.5 rounded-xl transition-all border border-neutral-700"
              >
                + Add to Order
              </button>
            </div>
          );
        })}
      </main>

      {/* Floating Cart Drawer */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-neutral-900 border-t border-neutral-800 p-4 shadow-2xl">
          <div className="max-w-md mx-auto space-y-3">
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
              {cart.map((i) => (
                <div key={i.cartItemId} className="flex justify-between items-center text-xs">
                  <span className="text-neutral-200 font-medium">{i.title}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(i.cartItemId, -1)}
                      className="bg-neutral-800 text-white w-6 h-6 rounded-md font-bold"
                    >
                      -
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      onClick={() => updateQuantity(i.cartItemId, 1)}
                      className="bg-neutral-800 text-white w-6 h-6 rounded-md font-bold"
                    >
                      +
                    </button>
                    <span className="w-12 text-right text-emerald-400 font-bold">
                      {store?.currency || "₦"}{i.price * i.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-800 pt-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Total Amount</p>
                <p className="text-lg font-black text-emerald-400">
                  {store?.currency || "₦"}{totalAmount}
                </p>
              </div>

              <button
                onClick={handlePlaceOrder}
                className="bg-orange-500 text-black font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
              >
                Send Order to Kitchen ↗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerMenuPage() {
  return (
    <Suspense fallback={<div className="bg-black text-white p-6">Loading...</div>}>
      <MenuContent />
    </Suspense>
  );
}
