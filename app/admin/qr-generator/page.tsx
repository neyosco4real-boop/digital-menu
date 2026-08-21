"use client";

import { useState, useEffect } from "react";
import QRCode from "react-qr-code";

export default function QRGeneratorPage() {
  const [tableNumber, setTableNumber] = useState("1");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const qrUrl = `${baseUrl}/menu/${tableNumber}`;

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#12141a] border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2">
          <h2 className="text-sm font-black tracking-widest text-amber-500 uppercase">
            SUITE / TABLE QR CODE GENERATOR
          </h2>
          <p className="text-xs text-neutral-400 font-medium">
            Generate printable direct QR codes for table ordering.
          </p>
        </div>

        {/* Table Selector Input */}
        <div className="flex items-center justify-center gap-3 bg-[#090a0f] p-2 rounded-2xl border border-neutral-800">
          <label className="text-xs font-black text-amber-400 tracking-wider uppercase pl-2">
            Table #:
          </label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="e.g. 1"
            className="bg-[#12141a] border border-neutral-700 text-white font-black text-center text-sm px-4 py-1.5 rounded-xl focus:outline-none focus:border-amber-500 w-24"
          />
        </div>

        {/* Dynamic QR Code Output */}
        <div className="bg-white p-6 rounded-3xl inline-block shadow-inner mx-auto">
          {baseUrl ? (
            <QRCode value={qrUrl} size={200} />
          ) : (
            <div className="w-[200px] h-[200px] bg-neutral-200 animate-pulse rounded-xl" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
            TABLE / SUITE #{tableNumber || "1"}
          </p>
          <p className="text-[10px] text-neutral-500 font-mono truncate px-4">
            {qrUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
