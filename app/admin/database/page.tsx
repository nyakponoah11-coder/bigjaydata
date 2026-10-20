"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Database,
  RefreshCw,
  Download,
  Upload,
  Search,
  Plus,
  Trash2,
  Edit3,
  Server,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  Zap,
  ArrowRightLeft,
  X,
  ShieldCheck,
  Check,
} from "lucide-react";

interface TableMeta {
  name: string;
  count: number;
  sizeBytes: number;
}

interface DatabaseStats {
  engine: string;
  version: string;
  dataPath: string;
  tablesCount: number;
  totalRecords: number;
  diskSizeBytes: number;
  uptimeSeconds: number;
  mode: "standalone" | "hybrid";
  tables: Record<string, { count: number; sizeBytes: number }>;
}

export default function BigJDbStudioPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("orders");
  const [records, setRecords] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Record Editor Modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editorJson, setEditorJson] = useState("");
  const [editorError, setEditorError] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);

  // Restore Modal
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreJson, setRestoreJson] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [restoring, setRestoring] = useState(false);

  // Notice Banner
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotice = (text: string, type: "success" | "error" = "success") => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  // Load Database Stats and Tables
  const loadStatsAndTables = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/db?action=stats");
      const data = await res.json();
      if (data.ok && data.stats) {
        setStats(data.stats);
        const tblList: TableMeta[] = Object.entries(data.stats.tables || {})
          .map(([name, meta]: any) => ({
            name,
            count: meta.count || 0,
            sizeBytes: meta.sizeBytes || 0,
          }))
          .sort((a, b) => b.count - a.count);

        setTables(tblList);
        if (tblList.length > 0 && !selectedTable) {
          setSelectedTable(tblList[0].name);
        }
      }
    } catch (err: any) {
      console.warn("Could not load BigJDB stats:", err);
      showNotice("Could not connect to BigJDB engine", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load Table Data
  const loadTableData = async (tableName: string, targetPage = 1, searchQuery = search) => {
    if (!tableName) return;
    setTableLoading(true);
    try {
      const res = await fetch("/api/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getTableData",
          table: tableName,
          page: targetPage,
          pageSize: 40,
          search: searchQuery.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRecords(data.records || []);
        setTotalCount(data.totalCount || 0);
        setPage(data.page || 1);
      }
    } catch (err: any) {
      showNotice(err?.message || `Failed to load records for ${tableName}`, "error");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    loadStatsAndTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable, 1, search);
    }
  }, [selectedTable]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTable) {
      loadTableData(selectedTable, 1, search);
    }
  };

  // 1-Click Sync from Supabase into BigJDB
  const handleSyncFromSupabase = async () => {
    if (!confirm("Pull all data from Supabase into BigJDB? Existing records will be safely merged and updated.")) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "syncFromSupabase" }),
      });
      const data = await res.json();
      if (data.ok) {
        showNotice(data.message || "All collections synced into BigJDB!");
        await loadStatsAndTables();
        if (selectedTable) loadTableData(selectedTable, 1);
      } else {
        showNotice(data.error || "Sync incomplete", "error");
      }
    } catch (err: any) {
      showNotice(err?.message || "Failed to sync with Supabase", "error");
    } finally {
      setSyncing(false);
    }
  };

  // Export JSON Snapshot
  const handleExportBackup = async () => {
    try {
      const res = await fetch("/api/admin/db?action=exportBackup");
      const data = await res.json();
      if (data.ok && data.backup) {
        const jsonStr = JSON.stringify(data.backup, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bigjdb_snapshot_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotice("BigJDB snapshot exported and downloaded!");
      }
    } catch (err: any) {
      showNotice("Failed to export database snapshot", "error");
    }
  };

  // Restore JSON Snapshot
  const handleRestoreBackup = async () => {
    if (!restoreJson.trim()) {
      setRestoreError("Please paste a valid JSON snapshot");
      return;
    }
    setRestoring(true);
    setRestoreError("");
    try {
      const parsed = JSON.parse(restoreJson);
      const dump = parsed.data || parsed;
      const res = await fetch("/api/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restoreBackup", dump }),
      });
      const data = await res.json();
      if (data.ok) {
        showNotice(data.message || "Snapshot restored successfully!");
        setRestoreOpen(false);
        setRestoreJson("");
        await loadStatsAndTables();
        if (selectedTable) loadTableData(selectedTable, 1);
      } else {
        setRestoreError(data.error || "Failed to restore snapshot");
      }
    } catch (err: any) {
      setRestoreError(err?.message || "Invalid JSON syntax. Please verify.");
    } finally {
      setRestoring(false);
    }
  };

  // File Upload Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRestoreJson(text);
      }
    };
    reader.readAsText(file);
  };

  // Open Record Editor (New or Edit)
  const handleOpenEditor = (record?: any) => {
    setEditorError("");
    if (record) {
      setEditingRecord(record);
      setEditorJson(JSON.stringify(record, null, 2));
    } else {
      setEditingRecord(null);
      const template = {
        id: `rec_${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      setEditorJson(JSON.stringify(template, null, 2));
    }
    setEditorOpen(true);
  };

  // Save Record
  const handleSaveRecord = async () => {
    setEditorError("");
    setSavingRecord(true);
    try {
      const parsed = JSON.parse(editorJson);
      const res = await fetch("/api/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveRecord",
          table: selectedTable,
          record: parsed,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showNotice("Record saved successfully to BigJDB!");
        setEditorOpen(false);
        loadTableData(selectedTable, page);
        loadStatsAndTables();
      } else {
        setEditorError(data.error || "Failed to save record");
      }
    } catch (err: any) {
      setEditorError(err?.message || "Invalid JSON syntax");
    } finally {
      setSavingRecord(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (id: string) => {
    if (!confirm(`Permanently delete record "${id}" from ${selectedTable}?`)) return;
    try {
      const res = await fetch("/api/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteRecord",
          table: selectedTable,
          id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showNotice(`Record deleted from ${selectedTable}`);
        loadTableData(selectedTable, page);
        loadStatsAndTables();
      } else {
        showNotice(data.error || "Failed to delete record", "error");
      }
    } catch (err: any) {
      showNotice(err?.message || "Failed to delete record", "error");
    }
  };

  // Clear Table
  const handleClearTable = async () => {
    if (!confirm(`DANGER: Are you sure you want to clear ALL records in ${selectedTable}?`)) return;
    try {
      const res = await fetch("/api/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clearTable",
          table: selectedTable,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showNotice(`Table ${selectedTable} cleared`);
        loadTableData(selectedTable, 1);
        loadStatsAndTables();
      }
    } catch (err: any) {
      showNotice(err?.message || "Failed to clear table", "error");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(tableSearch.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Notice Alert */}
        {notice && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-fade-in ${
              notice.type === "success"
                ? "bg-emerald-950/80 border-emerald-800 text-emerald-200"
                : "bg-red-950/80 border-red-800 text-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className="font-semibold">{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* HERO / STATS HEADER */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Egress Shield Active
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  0.01ms Latency
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Database className="w-8 h-8 text-emerald-400 shrink-0" />
                <span>BigJDB Studio</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Standalone embedded database engine. Zero external filesystem dependencies, microsecond in-memory query execution, and resilient failover.
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSyncFromSupabase}
                disabled={syncing}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                <span>Sync Supabase</span>
              </button>

              <button
                onClick={handleExportBackup}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export Snapshot</span>
              </button>

              <button
                onClick={() => {
                  setRestoreError("");
                  setRestoreJson("");
                  setRestoreOpen(true);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
              >
                <Upload className="w-4 h-4 text-teal-400" />
                <span>Restore</span>
              </button>

              <button
                onClick={() => {
                  loadStatsAndTables();
                  if (selectedTable) loadTableData(selectedTable, page);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
                title="Refresh stats"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold mb-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Engine Mode</span>
              </div>
              <p className="text-base font-black text-white capitalize">
                {stats?.mode || "Standalone"}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold mb-1">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>Collections</span>
              </div>
              <p className="text-base font-black text-white">
                {stats?.tablesCount || tables.length} Tables
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold mb-1">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Total Records</span>
              </div>
              <p className="text-base font-black text-emerald-400">
                {stats?.totalRecords?.toLocaleString() || "0"}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold mb-1">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Memory Data</span>
              </div>
              <p className="text-base font-black text-white">
                {stats ? `${(stats.diskSizeBytes / 1024).toFixed(1)} KB` : "0 KB"}
              </p>
            </div>
          </div>
        </div>

        {/* STUDIO WORKSPACE: 2-COLUMN VIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: COLLECTIONS SIDEBAR */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Collections ({tables.length})</span>
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filter collections..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {filteredTables.map((t) => {
                const isSelected = selectedTable === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => {
                      setSelectedTable(t.name);
                      setPage(1);
                      setSearch("");
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                      isSelected
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/30"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: RECORDS DATA EXPLORER */}
          <div className="lg:col-span-9 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            {/* Table Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>{selectedTable}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                    {totalCount} records
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Microsecond in-memory indexed storage with fast read and write
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditor()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Record</span>
                </button>

                <button
                  onClick={handleClearTable}
                  className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/40 border border-red-900/50 text-red-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                  title="Clear Table"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${selectedTable} by reference, phone, email, id, or keywords...`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Search
              </button>
            </form>

            {/* Records Grid */}
            {tableLoading ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading {selectedTable} records from BigJDB...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-3">
                <Database className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">No records found in {selectedTable}</p>
                <button
                  onClick={() => handleOpenEditor()}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert First Record</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                {records.map((r, idx) => {
                  const id = r.id || r.reference || `rec_${idx}`;
                  const title = r.reference || r.name || r.store_name || r.phone || r.network || r.key || id;
                  const subtitle = r.phone || r.email || r.size || r.package_size || r.value || r.amount || "";
                  const status = r.delivery_status || r.status || r.payment_status || (r.is_active ? "active" : "");

                  return (
                    <div
                      key={id}
                      className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white truncate max-w-[280px]">
                            {String(title)}
                          </span>
                          {subtitle && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({String(subtitle)})
                            </span>
                          )}
                          {status && (
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                status === "delivered" || status === "paid" || status === "active"
                                  ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                                  : status === "failed"
                                  ? "bg-red-950 border border-red-800 text-red-400"
                                  : "bg-amber-950 border border-amber-800 text-amber-400"
                              }`}
                            >
                              {status}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 truncate max-w-xl">
                          {JSON.stringify(r)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(r, null, 2), id)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="Copy JSON"
                        >
                          {copiedId === id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenEditor(r)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Edit3 className="w-3 h-3 text-emerald-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteRecord(r.id || id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalCount > 40 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <span className="text-slate-400">
                  Page {page} of {Math.ceil(totalCount / 40)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => {
                      const prev = Math.max(1, page - 1);
                      setPage(prev);
                      loadTableData(selectedTable, prev);
                    }}
                    className="px-3 py-1 bg-slate-800 text-slate-300 disabled:opacity-40 rounded-lg hover:bg-slate-700"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= Math.ceil(totalCount / 40)}
                    onClick={() => {
                      const next = page + 1;
                      setPage(next);
                      loadTableData(selectedTable, next);
                    }}
                    className="px-3 py-1 bg-slate-800 text-slate-300 disabled:opacity-40 rounded-lg hover:bg-slate-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RECORD EDITOR MODAL */}
        {editorOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-black text-white text-sm">
                    {editingRecord ? `Edit Record in ${selectedTable}` : `New Record in ${selectedTable}`}
                  </h3>
                </div>
                <button onClick={() => setEditorOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editorError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{editorError}</span>
                </div>
              )}

              <div className="flex-1 min-h-[300px]">
                <textarea
                  value={editorJson}
                  onChange={(e) => setEditorJson(e.target.value)}
                  className="w-full h-full min-h-[320px] bg-slate-950 border border-slate-800 rounded-2xl p-3.5 font-mono text-xs text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecord}
                  disabled={savingRecord}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingRecord ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save to BigJDB</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESTORE MODAL */}
        {restoreOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-teal-400" />
                  <h3 className="font-black text-white text-sm">Restore BigJDB Snapshot</h3>
                </div>
                <button onClick={() => setRestoreOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {restoreError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{restoreError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">
                  Select Snapshot File (.json) or Paste Content Below:
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div className="flex-1 min-h-[200px]">
                <textarea
                  value={restoreJson}
                  onChange={(e) => setRestoreJson(e.target.value)}
                  placeholder="Paste BigJDB snapshot JSON dump here..."
                  className="w-full h-full min-h-[220px] bg-slate-950 border border-slate-800 rounded-2xl p-3.5 font-mono text-xs text-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRestoreOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreBackup}
                  disabled={restoring}
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>Restore Snapshot</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
