"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Product } from "@/lib/db";
import {
  Plus,
  Edit2,
  Trash2,
  Filter,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  DollarSign,
  Package,
} from "lucide-react";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkFilter, setNetworkFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [network, setNetwork] = useState("mtn");
  const [customNetwork, setCustomNetwork] = useState("");
  const [isCustomNetwork, setIsCustomNetwork] = useState(false);
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setNetwork("mtn");
    setIsCustomNetwork(false);
    setCustomNetwork("");
    setSize("");
    setPrice("");
    setCostPrice("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    const isStd = ["mtn", "telecel", "at"].includes(p.network.toLowerCase());
    if (isStd) {
      setNetwork(p.network.toLowerCase());
      setIsCustomNetwork(false);
      setCustomNetwork("");
    } else {
      setNetwork("custom");
      setIsCustomNetwork(true);
      setCustomNetwork(p.network);
    }
    setSize(p.size);
    setPrice(String(p.price));
    setCostPrice(String(p.cost_price));
    setIsActive(p.is_active);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const finalNetwork = isCustomNetwork ? customNetwork.trim().toLowerCase() : network;

    if (!finalNetwork || !size.trim() || !price) {
      alert("Please fill network, size, and price");
      setSubmitting(false);
      return;
    }

    try {
      if (editingProduct) {
        // PATCH
        const res = await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingProduct.id,
            network: finalNetwork,
            size: size.trim(),
            price: Number(price),
            cost_price: Number(costPrice || 0),
            is_active: isActive,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setNotice(`Updated ${size} ${finalNetwork.toUpperCase()} bundle`);
          setIsModalOpen(false);
          fetchProducts();
        }
      } else {
        // POST
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            network: finalNetwork,
            size: size.trim(),
            price: Number(price),
            cost_price: Number(costPrice || 0),
            is_active: isActive,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setNotice(`Added new ${size} ${finalNetwork.toUpperCase()} bundle`);
          setIsModalOpen(false);
          fetchProducts();
        }
      }
      setTimeout(() => setNotice(""), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setNotice(`Deleted package`);
        fetchProducts();
        setTimeout(() => setNotice(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProducts = products.filter(
    (p) => networkFilter === "all" || p.network.toLowerCase() === networkFilter.toLowerCase()
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Products & Bundles
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Add, adjust rates, profit margins, or create new telco networks
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openAddModal}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Package
            </button>
            <button
              onClick={fetchProducts}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {notice && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Network Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setNetworkFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              networkFilter === "all"
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            All Networks ({products.length})
          </button>
          <button
            onClick={() => setNetworkFilter("mtn")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              networkFilter === "mtn"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            MTN
          </button>
          <button
            onClick={() => setNetworkFilter("telecel")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              networkFilter === "telecel"
                ? "bg-red-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Telecel
          </button>
          <button
            onClick={() => setNetworkFilter("at")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              networkFilter === "at"
                ? "bg-blue-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            AT (AirtelTigo)
          </button>
        </div>

        {/* Products Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 pl-4">Network</th>
                  <th className="py-3.5">Size</th>
                  <th className="py-3.5">Selling Price</th>
                  <th className="py-3.5">Cost (DataMart)</th>
                  <th className="py-3.5">Est. Profit</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No packages found for this network.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const profit = Number(p.price) - Number(p.cost_price || 0);

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 pl-4 font-bold uppercase text-white">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                p.network === "mtn"
                                  ? "bg-amber-400"
                                  : p.network === "telecel"
                                  ? "bg-red-500"
                                  : p.network === "at"
                                  ? "bg-blue-500"
                                  : "bg-emerald-400"
                              }`}
                            />
                            {p.network}
                          </span>
                        </td>
                        <td className="py-3.5 font-extrabold text-white text-sm">
                          {p.size}
                        </td>
                        <td className="py-3.5 font-bold text-emerald-400 text-sm">
                          GHS {Number(p.price).toFixed(2)}
                        </td>
                        <td className="py-3.5 text-slate-400 font-medium">
                          GHS {Number(p.cost_price).toFixed(2)}
                        </td>
                        <td className="py-3.5 text-amber-400 font-semibold">
                          +GHS {profit.toFixed(2)}
                        </td>
                        <td className="py-3.5">
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] transition-colors ${
                              p.is_active
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-slate-800 text-slate-500 border border-slate-700"
                            }`}
                          >
                            {p.is_active ? "Active" : "Disabled"}
                          </button>
                        </td>
                        <td className="py-3.5 text-right pr-4 space-x-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
                            title="Edit Package"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, `${p.network.toUpperCase()} ${p.size}`)}
                            className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg transition-colors"
                            title="Delete Package"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ADD / EDIT MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-white text-base">
                  {editingProduct ? "Edit Bundle Package" : "Add New Bundle Package"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4">
                {/* Network dropdown + custom option */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Network
                  </label>
                  {!isCustomNetwork ? (
                    <div className="flex gap-2">
                      <select
                        value={network}
                        onChange={(e) => {
                          if (e.target.value === "custom") {
                            setIsCustomNetwork(true);
                          } else {
                            setNetwork(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="mtn">MTN Ghana</option>
                        <option value="telecel">Telecel Ghana</option>
                        <option value="at">AT (AirtelTigo)</option>
                        <option value="custom">+ Add Brand New Network</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Enter network name (e.g. Starlink, Surfline)"
                        value={customNetwork}
                        onChange={(e) => setCustomNetwork(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomNetwork(false);
                          setNetwork("mtn");
                        }}
                        className="text-[11px] text-emerald-400 hover:underline"
                      >
                        ← Back to standard networks
                      </button>
                    </div>
                  )}
                </div>

                {/* Package Size */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Package Size (e.g. 1GB, 2.5GB, 10GB)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="5GB"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Selling Price (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="28.50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    DataMart Cost Price (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="24.00"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {price && costPrice && (
                    <span className="text-[11px] text-emerald-400 mt-1 block">
                      Estimated profit per sale: +GHS {(Number(price) - Number(costPrice)).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700"
                  />
                  <label htmlFor="isActive" className="text-xs text-slate-300">
                    Active (visible on customer store)
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-2 px-3 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingProduct ? "Save Changes" : "Create Package"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
