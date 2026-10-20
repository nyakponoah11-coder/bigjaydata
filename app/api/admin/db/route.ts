import { NextResponse } from "next/server";
import { bigjdb, CORE_TABLES } from "@/lib/bigjdb";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

async function getLiveTableStats() {
  const stats = bigjdb.getStats();

  if (isSupabaseConfigured && supabaseAdmin) {
    const supa = supabaseAdmin;
    // Check if any core tables are 0 in memory; if so, fetch exact count with head: true (zero payload egress)
    const emptyTables = CORE_TABLES.filter((t) => (stats.tables[t]?.count || 0) === 0);
    if (emptyTables.length > 0) {
      await Promise.all(
        emptyTables.map(async (table) => {
          try {
            const { count } = await supa.from(table).select("*", { count: "exact", head: true });
            if (typeof count === "number" && count > 0) {
              stats.tables[table] = {
                count,
                sizeBytes: count * 150,
              };
              stats.totalRecords += count;
            }
          } catch (_) {}
        })
      );
    }
  }

  return stats;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "stats";

    if (action === "stats") {
      const stats = await getLiveTableStats();
      return NextResponse.json({ ok: true, stats });
    }

    if (action === "getTables") {
      const stats = await getLiveTableStats();
      const tables = Object.entries(stats.tables).map(([name, meta]) => ({
        name,
        count: meta.count,
        sizeBytes: meta.sizeBytes,
      }));
      return NextResponse.json({ ok: true, tables });
    }

    if (action === "getTableData") {
      const table = searchParams.get("table") || "orders";
      const search = (searchParams.get("search") || "").toLowerCase().trim();
      const page = Math.max(1, Number(searchParams.get("page") || 1));
      const pageSize = Math.min(200, Math.max(10, Number(searchParams.get("pageSize") || 40)));

      // Auto-load from Supabase if local table is empty and Supabase is connected
      if (isSupabaseConfigured && supabaseAdmin && bigjdb.loadTable(table).length === 0) {
        try {
          const { data: supaData } = await supabaseAdmin.from(table).select("*").limit(500);
          if (Array.isArray(supaData) && supaData.length > 0) {
            bigjdb.upsert(table, supaData);
          }
        } catch (_) {}
      }

      const allRecords = bigjdb.loadTable(table);
      let filtered = allRecords;

      if (search) {
        filtered = allRecords.filter((r) => {
          const str = JSON.stringify(r).toLowerCase();
          return str.includes(search);
        });
      }

      const totalCount = filtered.length;
      const records = filtered.slice((page - 1) * pageSize, page * pageSize);

      return NextResponse.json({
        ok: true,
        records,
        totalCount,
        page,
        pageSize,
      });
    }

    if (action === "exportBackup") {
      const backup = bigjdb.exportBackup();
      return NextResponse.json({ ok: true, backup });
    }

    return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("[BigJDB API GET] Error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "stats";

    if (action === "stats") {
      const stats = await getLiveTableStats();
      return NextResponse.json({ ok: true, stats });
    }

    if (action === "getTables") {
      const stats = await getLiveTableStats();
      const tables = Object.entries(stats.tables).map(([name, meta]) => ({
        name,
        count: meta.count,
        sizeBytes: meta.sizeBytes,
      }));
      return NextResponse.json({ ok: true, tables });
    }

    if (action === "getTableData") {
      const table = String(body.table || "").trim();
      if (!table) return NextResponse.json({ ok: false, error: "Table name required" }, { status: 400 });

      const search = String(body.search || "").toLowerCase().trim();
      const page = Math.max(1, Number(body.page || 1));
      const pageSize = Math.min(200, Math.max(10, Number(body.pageSize || 40)));

      // If in hybrid mode and local table has 0 records, automatically warm from Supabase
      if (isSupabaseConfigured && supabaseAdmin && bigjdb.loadTable(table).length === 0) {
        try {
          const { data: supaData } = await supabaseAdmin.from(table).select("*").limit(500);
          if (Array.isArray(supaData) && supaData.length > 0) {
            bigjdb.upsert(table, supaData);
          }
        } catch (_) {}
      }

      const allRecords = bigjdb.loadTable(table);
      let filtered = allRecords;

      if (search) {
        filtered = allRecords.filter((r) => {
          const str = JSON.stringify(r).toLowerCase();
          return str.includes(search);
        });
      }

      const totalCount = filtered.length;
      const records = filtered.slice((page - 1) * pageSize, page * pageSize);

      return NextResponse.json({
        ok: true,
        records,
        totalCount,
        page,
        pageSize,
      });
    }

    if (action === "saveRecord") {
      const table = String(body.table || "").trim();
      const record = body.record;
      if (!table || !record) {
        return NextResponse.json({ ok: false, error: "Table and record payload are required" }, { status: 400 });
      }

      const { data, error } = bigjdb.upsert(table, record);
      if (error) {
        return NextResponse.json({ ok: false, error: String(error) }, { status: 400 });
      }

      // Also mirror to Supabase if connected
      if (isSupabaseConfigured && supabaseAdmin) {
        try {
          await supabaseAdmin.from(table).upsert(record);
        } catch (mErr) {
          console.warn("[BigJDB] Supabase mirror notice:", mErr);
        }
      }

      return NextResponse.json({
        ok: true,
        message: "Record saved successfully to BigJDB!",
        record: data[0] || record,
      });
    }

    if (action === "deleteRecord") {
      const table = String(body.table || "").trim();
      const id = body.id;
      if (!table || !id) {
        return NextResponse.json({ ok: false, error: "Table and record id are required" }, { status: 400 });
      }

      bigjdb.delete(table, [{ field: "id", operator: "eq", value: id }]);

      // Also mirror to Supabase if connected
      if (isSupabaseConfigured && supabaseAdmin) {
        try {
          await supabaseAdmin.from(table).delete().eq("id", id);
        } catch (_) {}
      }

      return NextResponse.json({ ok: true, message: `Record ${id} deleted from BigJDB!` });
    }

    if (action === "clearTable") {
      const table = String(body.table || "").trim();
      if (!table) return NextResponse.json({ ok: false, error: "Table name required" }, { status: 400 });
      bigjdb.clear(table);
      return NextResponse.json({ ok: true, message: `Table ${table} cleared in BigJDB!` });
    }

    if (action === "syncFromSupabase") {
      const res = await bigjdb.syncFromSupabase();
      return NextResponse.json({
        ok: res.success,
        message: res.message,
        syncedTables: res.syncedTables,
      });
    }

    if (action === "exportBackup") {
      const backup = bigjdb.exportBackup();
      return NextResponse.json({ ok: true, backup });
    }

    if (action === "restoreBackup") {
      const dump = body.dump || body.data;
      if (!dump || typeof dump !== "object") {
        return NextResponse.json({ ok: false, error: "Invalid backup dump payload" }, { status: 400 });
      }
      const res = bigjdb.restoreBackup(dump);
      return NextResponse.json({
        ok: res.success,
        message: `Restored ${res.tablesRestored.length} collections into BigJDB!`,
        tablesRestored: res.tablesRestored,
      });
    }

    return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("[BigJDB API POST] Error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Internal server error" }, { status: 500 });
  }
}
