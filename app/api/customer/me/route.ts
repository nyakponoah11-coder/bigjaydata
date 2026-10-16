import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let customerId = searchParams.get("id");

    if (!customerId) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("bmgh_customer_session")?.value;
      if (sessionCookie) {
        try {
          const parsed = JSON.parse(sessionCookie);
          customerId = parsed?.id;
        } catch {}
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "No customer identifier provided or session found." },
        { status: 401 }
      );
    }

    const customer = await db.getCustomerById(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer account not found." },
        { status: 404 }
      );
    }

    const [transactions, allOrders] = await Promise.all([
      db.getCustomerTransactions(customer.id),
      db.getOrders(),
    ]);

    const customerOrders = allOrders.filter(
      (o) =>
        o.customer_id === customer.id ||
        (o.phone && o.phone.replace(/[^0-9]/g, "") === customer.phone.replace(/[^0-9]/g, ""))
    );

    const { password_hash, ...safeCustomer } = customer;

    return NextResponse.json({
      success: true,
      customer: safeCustomer,
      transactions: transactions.slice(0, 50),
      orders: customerOrders.slice(0, 50),
    });
  } catch (error: any) {
    console.error("Customer me error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load customer profile." },
      { status: 500 }
    );
  }
}
