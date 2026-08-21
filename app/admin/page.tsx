"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface OrderItem {
  id?: string;
  title?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

interface Order {
  id: string;
  table_number?: string;
  table?: string;
  items?: OrderItem[] | any;
  total_price?: number;
  total?: number;
  amount?: number;
  status: string;
  created_at?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"orders" | "items" | "qr">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("admin-orders-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
      } else {
        setOrders(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: "Completed" | "Cancelled") => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) {
        console.error("Failed to update order status:", error);
      } else {
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);

      if (error) {
        console.error("Failed to delete order:", error);
      } else {
        setOrders((prev) => prev.filter((ord) => ord.id !== orderId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "Pending" || !o.status);

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white font-sans p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-black tracking-tight uppercase text-amber-500">
              ADMIN CONTROL PANEL
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Manage Menu Items, Live Orders & QR Codes
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#16181e] border border-neutral-800 p-1.5 rounded-2xl">
          <a
            href="/menu"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            CUSTOMER MENU &rarr;
          </a>
          <button
            onClick={() => setActiveTab("qr")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "qr" ? "bg-amber-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Menu QR Code
          </button>
          <button
            onClick={() => setActiveTab("items")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "items" ? "bg-amber-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            MENU ITEMS
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "orders" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-neutral-400 hover:text-white"
            }`}
          >
            LIVE ORDERS ({pendingOrders.length})
          </button>
        </div>
      </div>

      {activeTab === "orders" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black tracking-widest text-neutral-400 uppercase">
              LIVE KITCHEN ORDERS ({pendingOrders.length})
            </h2>
            <button
              onClick={fetchOrders}
              className="text-xs text-amber-500 font-bold hover:underline"
            >
              Refresh Orders
            </button>
          </div>

          {loadingOrders ? (
            <div className="py-12 text-center text-xs text-neutral-500 font-bold uppercase tracking-wider">
              Syncing live orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-[#16181e] border border-neutral-800/80 rounded-3xl p-12 text-center text-neutral-500 text-xs font-bold">
              No live kitchen orders at the moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {orders.map((order) => {
                const tableNum = order.table_number || order.table || "1";
                const totalAmt = order.total_price || order.total || order.amount || 0;
                const itemsList: OrderItem[] = Array.isArray(order.items) ? order.items : [];

                const isCompleted = order.status === "Completed";
                const isCancelled = order.status === "Cancelled";

                return (
                  <div
                    key={order.id}
                    className={`bg-[#16181e] border rounded-3xl p-5 flex flex-col justify-between gap-5 transition-all shadow-xl ${
                      isCompleted
                        ? "border-emerald-500/30 opacity-75"
                        : isCancelled
                        ? "border-red-500/30 opacity-60"
                        : "border-amber-500/40 hover:border-amber-500/80"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                        <span className="text-xs font-black tracking-wider text-amber-500 uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                          TABLE #{tableNum}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                            isCompleted
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : isCancelled
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                          }`}
                        >
                          {order.status || "PENDING"}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {itemsList.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-neutral-200 font-medium truncate max-w-[200px]">
                              <strong className="text-amber-400 mr-1">{item.quantity || 1}x</strong>
                              {item.title || item.name || "Menu Item"}
                            </span>
                            <span className="text-neutral-400 font-bold">
                              ₦{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-neutral-800 text-xs">
                        <span className="font-bold text-neutral-400 uppercase">Total:</span>
                        <span className="font-black text-amber-400 text-sm">
                          ₦{totalAmt.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80">
                      {!isCompleted ? (
                        <button
                          onClick={() => handleUpdateStatus(order.id, "Completed")}
                          disabled={updatingId === order.id}
                          className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-400 hover:text-black font-black text-xs py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                        >
                          ✓ COMPLETE
                        </button>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] py-2.5 rounded-xl flex items-center justify-center">
                          ✓ COMPLETED
                        </div>
                      )}

                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={updatingId === order.id}
                        className="bg-red-500/10 hover:bg-red-500 border border-red-500/40 text-red-400 hover:text-white font-black text-xs py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        🗑 DELETE CARD
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
