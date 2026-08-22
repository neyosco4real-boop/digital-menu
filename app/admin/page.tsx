"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface CartItem {
  id: string;
  title?: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  table_number: string;
  items: CartItem[];
  total_price: number;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  const prevOrderCountRef = useRef<number>(0);

  // Synthesizes a loud chime using Web Audio API to bypass browser block policy
  const playAlertSound = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof window.AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();

      // First Chime Tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Second Chime Tone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.25);
      gain2.gain.setValueAtTime(0.5, ctx.currentTime + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  const fetchOrders = async (manual = false) => {
    if (manual) setIsRefreshing(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      if (prevOrderCountRef.current > 0 && data.length > prevOrderCountRef.current) {
        if (soundEnabled) playAlertSound();
      }
      prevOrderCountRef.current = data.length;
      setOrders(data);
    }

    setLoading(false);
    setIsRefreshing(false);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) playAlertSound(); // Test sound on enable
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("realtime-admin-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          setOrders((prev) => [payload.new as Order, ...prev]);
          if (soundEnabled) playAlertSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o))
      );
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Admin Controls Header */}
      <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <h1 className="text-xl font-bold text-white">Orders Dashboard</h1>

        <div className="flex items-center gap-3">
          {/* Sound Notification Toggle */}
          <button
            onClick={toggleSound}
            className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
              soundEnabled
                ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                : "bg-zinc-800 text-zinc-400 border-zinc-700"
            }`}
          >
            {soundEnabled ? "🔔 Sound Active" : "🔕 Enable Sound Alarm"}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchOrders(true)}
            disabled={isRefreshing}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <p className="text-center text-zinc-500 py-10">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-zinc-500 py-10">No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-4 text-white"
            >
              <div>
                <p className="font-bold text-amber-400">
                  Table #{order.table_number || "1"}{" "}
                  <span className="text-xs text-zinc-400 font-normal">
                    ({order.status || "Pending"})
                  </span>
                </p>
                <div className="text-sm mt-1 space-y-1">
                  {order.items?.map((item, idx) => (
                    <p key={idx} className="text-zinc-300">
                      {item.quantity}x {item.title}
                    </p>
                  ))}
                </div>
                <p className="text-xs font-bold mt-2 text-amber-300">
                  Total: ₦{(order.total_price || 0).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(order.id, "Preparing")}
                  className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs rounded-lg"
                >
                  Preparing
                </button>
                <button
                  onClick={() => updateStatus(order.id, "Completed")}
                  className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs rounded-lg"
                >
                  Complete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
