"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Order } from "@/lib/db";
import { Search, Loader2, ArrowRight, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function TrackClientView({ storeName }: { storeName: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const executeSearch = async (searchTerm: string) => {
    const clean = searchTerm.trim();
    if (!clean) return;

    setError("");
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to search");
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err?.message || "Could not retrieve order details");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initialRef = params.get("reference") || params.get("trxref") || params.get("q");
      if (initialRef) {
        setQuery(initialRef);
        executeSearch(initialRef);
      }
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Real-time Telco Dispatch Tracker</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Track Your Data Order
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your order reference (e.g. <span className="font-mono font-semibold">BMGH-87654321</span>) or recipient phone number to verify live status.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-lg max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter BMGH-XXXX or 055XXXXXXX"
              className="w-full pl-11 pr-4 py-3 text-sm font-semibold border border-slate-300 rounded-2xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Track Order
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* Results Section */}
      {searched && orders && (
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Search Results ({orders.length})
          </h2>

          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-900 text-base">No Orders Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                We couldn't find any transaction matching "{query}". Please verify the reference or phone number.
              </p>
            </div>
          ) : (
            orders.map((o) => {
              const isDelivered = o.status === "delivered";
              const isPending = o.status === "pending";

              return (
                <div
                  key={o.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {o.reference}
                      </span>
                      <span
                        className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          isDelivered
                            ? "bg-emerald-100 text-emerald-800"
                            : isPending
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 font-medium">
                      <span className="uppercase font-bold text-slate-900">{o.network}</span> •{" "}
                      <span className="text-emerald-600 font-extrabold">{o.package_size}</span> • To:{" "}
                      <span className="font-mono">{o.phone}</span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      GHS {o.amount.toFixed(2)} • {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>

                  <Link
                    href={`/receipt/${o.reference}`}
                    className="shrink-0 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    View Receipt
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
