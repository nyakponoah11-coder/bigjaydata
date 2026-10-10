import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function POST(req: Request) {
  try {
    const config = await db.getAgentStoreConfig();
    if (!config.is_enabled) {
      return NextResponse.json(
        { success: false, message: "Agent Store registration is currently closed by the administrator." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, store_name, email, phone, description, password, paystack_ref } = body;

    if (!name || !store_name || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, message: "Full name, store name, email, phone number, and password/PIN are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).replace(/[^0-9]/g, "");

    if (cleanPhone.length < 9) {
      return NextResponse.json({ success: false, message: "Invalid phone number." }, { status: 400 });
    }

    // Generate unique slug
    let baseSlug = String(store_name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!baseSlug) {
      baseSlug = "store-" + Math.floor(1000 + Math.random() * 9000);
    }

    // Check if slug, email, or phone already taken
    const existingBySlug = await db.getAgentBySlug(baseSlug);
    let finalSlug = baseSlug;
    if (existingBySlug) {
      finalSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const existingByEmail = await db.getAgentByEmail(cleanEmail);
    if (existingByEmail) {
      return NextResponse.json(
        { success: false, message: "An agent account with this email address already exists. Please log in." },
        { status: 400 }
      );
    }

    // If admin set a registration fee > 0, verify Paystack payment
    let registrationPaid = true;
    if (config.registration_fee > 0) {
      if (!paystack_ref) {
        return NextResponse.json(
          {
            success: false,
            requires_fee: true,
            fee: config.registration_fee,
            message: `Agent registration requires a one-time fee of GHS ${config.registration_fee.toFixed(2)}.`,
          },
          { status: 402 }
        );
      }

      const verification = await verifyPaystackTransaction(paystack_ref);
      if (!verification.success) {
        return NextResponse.json(
          { success: false, message: `Registration fee verification failed: ${verification.message}` },
          { status: 402 }
        );
      }
      registrationPaid = true;
    }

    const newAgent = await db.createAgent({
      name: name.trim(),
      store_name: store_name.trim(),
      store_slug: finalSlug,
      email: cleanEmail,
      phone: cleanPhone,
      momo_number: cleanPhone,
      momo_network: "MTN",
      description: description ? description.trim() : "Best value data bundles direct to your phone.",
      password_hash: String(password).trim(),
      theme: "emerald",
      is_active: true,
      registration_paid: registrationPaid,
    });

    return NextResponse.json({
      success: true,
      agent: newAgent,
      token: `agtok_${newAgent.id}_${Date.now()}`,
      message: "Agent account created successfully!",
    });
  } catch (error: any) {
    console.error("[Agent Register] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Registration failed" },
      { status: 500 }
    );
  }
}
