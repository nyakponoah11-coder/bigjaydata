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
    const {
      code,
      network,
      package_size,
      tagline,
      max_claims,
      count,
      expires_at,
      min_orders_required,
    } = body;

    if (!network || !package_size) {
      return NextResponse.json(
        { error: "Network and package size are required." },
        { status: 400 }
      );
    }

    const cleanNetwork = network.toLowerCase();
    const cleanSize = package_size.trim().toUpperCase();
    const cleanTagline = (tagline || "Free Data Giveaway!").trim();
    const numMinOrders = Number(min_orders_required) >= 0 ? Number(min_orders_required) : 0;
    const expiresAtIso = expires_at ? new Date(expires_at).toISOString() : null;

    const requestedCount = Math.max(1, Math.min(100, Number(count) || 1));

    const existingVouchers = await db.getVouchers();
    const existingCodes = new Set(existingVouchers.map((v) => (v.code || "").toUpperCase()));

    // Generate 8-digit code FREE-XXXXXXXX
    const generate8DigitCode = (): string => {
      for (let i = 0; i < 1000; i++) {
        const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
        const candidate = `FREE-${digits}`;
        if (!existingCodes.has(candidate)) {
          existingCodes.add(candidate);
          return candidate;
        }
      }
      return `FREE-${Date.now().toString().slice(-8)}`;
    };

    const batchId = `batch_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    if (requestedCount > 1) {
      const batchItems = [];
      const generatedCodes: string[] = [];

      for (let i = 0; i < requestedCount; i++) {
        const newCode = generate8DigitCode();
        generatedCodes.push(newCode);
        batchItems.push({
          code: newCode,
          network: cleanNetwork,
          package_size: cleanSize,
          tagline: cleanTagline,
          max_claims: 1, // Strictly single use per generated code
          min_orders_required: numMinOrders,
          batch_id: batchId,
          is_active: true,
          expires_at: expiresAtIso,
        });
      }

      const createdVouchers = await db.createVouchersBatch(batchItems);
      return NextResponse.json({
        success: true,
        count: createdVouchers.length,
        batch_id: batchId,
        codes: generatedCodes,
        vouchers: createdVouchers,
      });
    }

    // Single code generation
    let finalCode = (code || "").trim().toUpperCase();
    if (!finalCode || !finalCode.startsWith("FREE-") || finalCode.length < 13) {
      finalCode = generate8DigitCode();
    }

    const voucher = await db.createVoucher({
      code: finalCode,
      network: cleanNetwork,
      package_size: cleanSize,
      tagline: cleanTagline,
      max_claims: 1, // Single use
      min_orders_required: numMinOrders,
      batch_id: batchId,
      is_active: true,
      expires_at: expiresAtIso,
    });

    return NextResponse.json({
      success: true,
      count: 1,
      batch_id: batchId,
      codes: [voucher.code],
      voucher,
    });
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
