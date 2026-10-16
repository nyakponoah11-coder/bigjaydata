import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [vouchers, claims, customers, allOrders] = await Promise.all([
      db.getVouchers(),
      db.getVoucherClaims(),
      db.getCustomers(),
      db.getOrders(),
    ]);

    const isPaidOrder = (o: any) => {
      const ps = (o.payment_status || "").toLowerCase().trim();
      const s = (o.status || "").toLowerCase().trim();
      const ds = (o.delivery_status || "").toLowerCase().trim();
      return (
        ps === "paid" ||
        ps === "completed" ||
        ps === "success" ||
        s === "delivered" ||
        s === "completed" ||
        ds === "delivered" ||
        ds === "completed"
      );
    };

    const enrichedClaims = claims.map((c) => {
      const cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, "") : "";
      const matchedCust = customers.find((cust) => cust.phone.replace(/[^0-9]/g, "") === cleanPhone);
      const ordersCount = allOrders.filter(
        (o) => o.phone && o.phone.replace(/[^0-9]/g, "") === cleanPhone && isPaidOrder(o)
      ).length;

      return {
        ...c,
        customer_name: c.customer_name || matchedCust?.name || "Guest Customer",
        customer_orders_count: c.customer_orders_count !== undefined ? c.customer_orders_count : ordersCount,
      };
    });

    return NextResponse.json({ vouchers, claims: enrichedClaims });
  } catch (error: any) {
    console.error("Admin Vouchers GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load vouchers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, network, package_size, tagline, max_claims, expires_at, min_orders_required } = body;

    if (!code || !network || !package_size) {
      return NextResponse.json(
        { error: "Voucher code, network, and package size are required." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanNetwork = network.toLowerCase();
    const cleanSize = package_size.trim().toUpperCase();
    const cleanTagline = (tagline || "Free Data Giveaway!").trim();
    const numMaxClaims = Number(max_claims) > 0 ? Number(max_claims) : 10;
    const numMinOrders = Number(min_orders_required) >= 0 ? Number(min_orders_required) : 0;

    const voucher = await db.createVoucher({
      code: cleanCode,
      network: cleanNetwork,
      package_size: cleanSize,
      tagline: cleanTagline,
      max_claims: numMaxClaims,
      min_orders_required: numMinOrders,
      is_active: true,
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
    });

    return NextResponse.json({ success: true, voucher });
  } catch (error: any) {
    console.error("Admin Vouchers POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create voucher" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, is_active, all, expires_at } = body;

    if (all && typeof is_active === "boolean") {
      await db.toggleAllVouchers(is_active);
      return NextResponse.json({ success: true, all: true, is_active });
    }

    if (!id || typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "Voucher id and is_active boolean required." },
        { status: 400 }
      );
    }

    await db.toggleVoucher(id, is_active);
    return NextResponse.json({ success: true, is_active });
  } catch (error: any) {
    console.error("Admin Vouchers PATCH error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to toggle voucher" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing voucher id." }, { status: 400 });
    }

    await db.deleteVoucher(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Vouchers DELETE error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete voucher" },
      { status: 500 }
    );
  }
}
