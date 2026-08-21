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

interface CartItem extends MenuItem {
  quantity: number;
}

export default function CustomerMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get("table");
      if (tableParam) setTableNumber(tableParam);
    }
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    const { data } = await supabase.from("menu_items").select("*");
    if (data) setMenuItems(data);
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);

    const payload = {
      table_number: String(tableNumber),
      table: String(tableNumber),
      items: cart,
      total_price: totalPrice,
      total: totalPrice,
      amount: totalPrice,
      status: "Pending",
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("orders").insert([payload]);

    if (error) {
      console.error("Order error:", error);
      alert("Failed to submit order. Please try again.");
    } else {
      setCart([]);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 5000);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white p-6 md:p-10 font-sans max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-amber-500 uppercase tracking-wide">
            CUSTOMER MENU
          </h1>
          <p className="text-xs text-neutral-400">Table #{tableNumber}</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-neutral-400">Cart Total:</span>
          <div className="text-lg font-black text-amber-400">
            ₦{totalPrice.toLocaleString()}
          </div>
        </div>
      </div>

      {orderSuccess && (
        <div className="bg-emerald-500 text-black p-4 rounded-2xl font-black text-center text-sm animate-pulse">
          ✓ ORDER SENT TO KITCHEN!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="bg-[#16181e] border border-neutral-800 p-4 rounded-2xl flex justify-between items-center"
          >
            <div>
              <h3 className="font-bold text-sm">{item.title || item.name}</h3>
              <p className="text-xs text-amber-400 font-bold mt-1">
                ₦{item.price.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => addToCart(item)}
              className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-black px-4 py-2 rounded-xl transition-all active:scale-95"
            >
              + ADD
            </button>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-md bg-[#16181e] border-2 border-amber-500 p-4 rounded-3xl shadow-2xl flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-neutral-400">
              {cart.reduce((a, b) => a + b.quantity, 0)} Items
            </span>
            <div className="text-sm font-black text-amber-400">
              ₦{totalPrice.toLocaleString()}
            </div>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-black px-6 py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            {submitting ? "SENDING..." : "PLACE ORDER NOW →"}
          </button>
        </div>
      )}
    </div>
  );
}
