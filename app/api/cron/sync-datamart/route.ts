import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncOrderWithDataMart } from "@/lib/datamart";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automated Cron Job:
 * Runs periodically to sync non-terminal processing orders with DataMart's telecom queue.
 * Automatically flips orders from "processing" to "delivered" as soon as the carrier confirms.
 */
export async function GET(req: Request) {
  try {
    const allOrders = await db.getOrders({}, true);
    const targetOrders = allOrders
      .filter((o) => {
        const st = (o.delivery_status || o.status || "").toLowerCase().trim();
        const ageHours = (Date.now() - new Date(o.created_at || Date.now()).getTime()) / (1000 * 60 * 60);
        return (st === "processing" || st === "pending" || st === "in_progress") && ageHours <= 72;
      })
      .slice(0, 20); // Check up to 20 active orders per run

    let updatedCount = 0;
    await Promise.all(
      targetOrders.map(async (ord) => {
        try {
          const prevStatus = ord.delivery_status;
          const synced = await syncOrderWithDataMart(ord, true);
          if (synced && synced.delivery_status !== prevStatus) {
            updatedCount++;
            await db.updateAgentOrderStatus(ord.reference, synced.delivery_status).catch(() => {});
          }
        } catch (err) {
          console.warn(`[Cron Auto-Sync] Order ${ord.reference} error:`, err);
        }
      })
    );

    return NextResponse.json({
      success: true,
      message: `Automated DataMart sync finished: checked ${targetOrders.length} orders, updated ${updatedCount} to real carrier delivery status.`,
      updatedCount,
      checkedCount: targetOrders.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Cron Auto-Sync Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute cron sync" },
      { status: 500 }
    );
  }
}
