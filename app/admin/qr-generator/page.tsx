"use client";

import { useState, useEffect } from "react";
import QRCode from "react-qr-code";

export default function QRGeneratorPage() {
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [showBatchPrint, setShowBatchPrint] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const tables = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[#07080a] text-white p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#12141a] p-6 rounded-3xl border border-neutral-800">
          <div>
            <h1 className="text-lg font-black tracking-widest text-amber-500 uppercase">
              SUITE / TABLE QR CODE GENERATOR
            </h1>
            <p className="text-xs text-neutral-400 font-medium mt-1">
              Generate direct scan-to-order QR codes for Tables 1 through 10.
            </p>
          </div>
          <button
            onClick={() => setShowBatchPrint(!showBatchPrint)}
            className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase px-4 py-2.5 rounded-xl transition-all shadow-lg shrink-0"
          >
            {showBatchPrint ? "Single View" : "View All 10 Tables"}
          </button>
        </div>

        {!showBatchPrint ? (
          /* Single Interactive Selector Mode */
          <div className="max-w-md mx-auto bg-[#12141a] border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            {/* Table Selector Buttons (1-10) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Select Table / Suite (1 - 10)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {tables.map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedTable(num)}
                    className={`py-2 rounded-xl text-xs font-black transition-all border ${
                      selectedTable === num
                        ? "bg-amber-500 text-black border-amber-400 shadow-md scale-105"
                        : "bg-[#090a0f] text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700"
                    }`}
                  >
                    #{num}
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code Output */}
            <div className="bg-white p-6 rounded-3xl inline-block shadow-inner mx-auto">
              {baseUrl ? (
                <QRCode
                  value={`${baseUrl}/menu/${selectedTable}`}
                  size={200}
                />
              ) : (
                <div className="w-[200px] h-[200px] bg-neutral-200 animate-pulse rounded-xl" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                TABLE / SUITE #{selectedTable}
              </p>
              <p className="text-[10px] text-neutral-500 font-mono truncate px-4">
                {baseUrl}/menu/{selectedTable}
              </p>
            </div>
          </div>
        ) : (
          /* Batch Grid Mode (All 10 Tables) */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {tables.map((num) => (
              <div
                key={num}
                className="bg-[#12141a] border border-neutral-800 rounded-3xl p-6 text-center space-y-4 shadow-xl"
              >
                <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto">
                  {baseUrl && (
                    <QRCode value={`${baseUrl}/menu/${num}`} size={140} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                    TABLE / SUITE #{num}
                  </p>
                  <p className="text-[9px] text-neutral-500 font-mono truncate mt-1">
                    {baseUrl}/menu/{num}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
