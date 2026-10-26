import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchDataMartBalance } from "@/lib/datamart";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const [allOrders, datamartBalance, settings] = await Promise.all([
      db.getOrders(),
      fetchDataMartBalance().catch((err) => ({
        success: false,
        balance: null,
        currency: "GHS",
        message: err?.message,
      })),
      db.getSettings().catch(() => null),
    ]);

    const netflixBal = Number(settings?.netflix_balance !== undefined ? settings.netflix_balance : 150);
    const netflixWholesale = 15;

    const ordersForDate = allOrders.filter((o) => o.created_at.startsWith(dateParam));

    const totalOrdersToday = ordersForDate.length;
    const totalSalesToday = ordersForDate
      .filter((o) => o.payment_status === "paid" || !!o.paystack_ref || o.status === "delivered" || o.status === "pending")
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    const pendingOrdersCount = allOrders.filter(
      (o) => (o.delivery_status === "pending" || o.delivery_status === "processing" || o.status === "pending")
    ).length;
    const failedOrdersCount = allOrders.filter(
      (o) => (o.delivery_status === "failed" || o.status === "failed")
    ).length;

    const recentOrders = allOrders.slice(0, 5);

    return NextResponse.json({
      success: true,
      date: dateParam,
      stats: {
        totalOrdersToday,
        totalSalesToday,
        pendingOrdersCount,
        failedOrdersCount,
        datamartBalance,
        netflixBalance: {
          balance: netflixBal,
          wholesaleCost: netflixWholesale,
          availableAccounts: Math.floor(netflixBal / netflixWholesale),
          currency: "GHS",
          isEnabled: settings?.netflix_enabled !== false,
        },
      },
      recentOrders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
