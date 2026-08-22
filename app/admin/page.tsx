"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const [orders, setOrders] = useState<any[]>([]);

  const fetchAllData = async () => {
    const { data, error } = await supabase.from("orders").select("*");
    if (!error && data) {
      setOrders(data);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const updateOrderStatus = async (id: string, status: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Supabase Error:", error.message);
      alert("Failed to update status: " + error.message);
      fetchAllData();
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (!error) {
        setOrders((prev) => prev.filter((o) => o.id !== id));
      }
    }
  };

  return (
    <div className="p-8 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">ADMIN CONTROL CENTER</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border border-amber-500/30 p-4 rounded-lg bg-zinc-900">
            <div className="flex justify-between items-center mb-4">
              <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded font-bold">
                TABLE #{order.table_number || 1}
              </span>
              <span className="text-emerald-400 text-xs font-bold uppercase border border-emerald-500/30 px-2 py-1 rounded">
                {order.status || "Pending"}
              </span>
            </div>
            <div className="text-lg font-bold text-amber-500 mb-4">
              TOTAL: ₦{order.total_amount?.toLocaleString() || "0"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateOrderStatus(order.id, "Cancelled")}
                className="flex-1 bg-yellow-900/30 text-yellow-500 border border-yellow-700/50 py-2 rounded font-bold text-sm"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleDeleteOrder(order.id)}
                className="flex-1 bg-red-900/30 text-red-500 border border-red-700/50 py-2 rounded font-bold text-sm"
              >
                DELETE
              </button>
              <button
                onClick={() => updateOrderStatus(order.id, "Completed")}
                className="flex-1 bg-emerald-900/30 text-emerald-500 border border-emerald-700/50 py-2 rounded font-bold text-sm"
              >
                COMPLETE
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
