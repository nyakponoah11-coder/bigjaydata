import { NextResponse } from "next/server";
import { db, isGenuineCustomer } from "@/lib/db";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface CustomerRecord {
  phone: string;
  international_phone: string;
  name: string;
  network: "mtn" | "telecel" | "at" | "other";
  total_orders: number;
  total_spent: number;
  sources: string[];
  first_seen: string;
  last_seen: string;
  recent_references: string[];
  is_registered?: boolean;
  customer_id?: string;
  wallet_balance?: number;
  email?: string;
}

function cleanPhone(raw: any): { local: string; international: string; network: "mtn" | "telecel" | "at" | "other" } | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^0-9]/g, "").trim();
  if (!digits || digits.length < 8) return null;

  if (digits.startsWith("233") && digits.length === 12) {
    digits = "0" + digits.slice(3);
  } else if (digits.length === 9 && !digits.startsWith("0")) {
    digits = "0" + digits;
  }

  if (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.slice(0, 10);
  }

  if (digits.length !== 10) return null;

  const local = digits;
  const international = "+233" + digits.slice(1);

  let network: "mtn" | "telecel" | "at" | "other" = "other";
  const p3 = local.slice(0, 3);
  if (["024", "054", "055", "059", "053", "025"].includes(p3)) {
    network = "mtn";
  } else if (["020", "050"].includes(p3)) {
    network = "telecel";
  } else if (["027", "057", "026", "056"].includes(p3)) {
    network = "at";
  }

  return { local, international, network };
}

export async function GET(req: Request) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const [orders, agentOrders, agents, messages, voucherClaims, registeredCustomers] = await Promise.all([
      db.getOrders().catch(() => []),
      db.getAgentOrders().catch(() => []),
      db.getAgents().catch(() => []),
      db.getMessages().catch(() => []),
      db.getVoucherClaims().catch(() => []),
      db.getCustomers().catch(() => []),
    ]);

    // Build lookup for verified registered customer accounts
    const registeredPhoneMap = new Map<string, any>();
    registeredCustomers.forEach((rc: any) => {
      if (isGenuineCustomer(rc)) {
        const clean = String(rc.phone || "").replace(/[^0-9]/g, "");
        if (clean) registeredPhoneMap.set(clean, rc);
        if (clean.length >= 9) registeredPhoneMap.set(clean.slice(-9), rc);
      }
    });

    const customerMap = new Map<string, CustomerRecord>();

    const getOrCreate = (
      phoneInfo: { local: string; international: string; network: "mtn" | "telecel" | "at" | "other" },
      fallbackName = "",
      date = new Date().toISOString()
    ) => {
      let existing = customerMap.get(phoneInfo.local);
      if (!existing) {
        const reg = registeredPhoneMap.get(phoneInfo.local) || registeredPhoneMap.get(phoneInfo.local.slice(-9));
        existing = {
          phone: phoneInfo.local,
          international_phone: phoneInfo.international,
          name: reg?.name || fallbackName,
          network: phoneInfo.network,
          total_orders: 0,
          total_spent: 0,
          sources: reg ? ["Registered Account"] : [],
          first_seen: date,
          last_seen: date,
          recent_references: [],
          is_registered: Boolean(reg),
          customer_id: reg?.id,
          wallet_balance: reg ? Number(reg.wallet_balance || 0) : 0,
          email: reg?.email,
        };
        customerMap.set(phoneInfo.local, existing);
      }
      if (fallbackName && (!existing.name || existing.name.toLowerCase() === "customer")) {
        existing.name = fallbackName;
      }
      if (date && new Date(date).getTime() > new Date(existing.last_seen).getTime()) {
        existing.last_seen = date;
      }
      if (date && new Date(date).getTime() < new Date(existing.first_seen).getTime()) {
        existing.first_seen = date;
      }
      return existing;
    };

    // 1. Process Main & Agent Storefront Orders from orders table (Guest Buyers & Registered Orders)
    orders.forEach((o: any) => {
      const p = cleanPhone(o.phone);
      if (!p) return;
      const c = getOrCreate(p, "", o.created_at);
      c.total_orders += 1;
      c.total_spent = Number((c.total_spent + (Number(o.amount) || 0)).toFixed(2));
      if (p.network !== "other") c.network = p.network;
      if (o.reference && !c.recent_references.includes(o.reference)) {
        if (c.recent_references.length < 5) c.recent_references.push(o.reference);
      }
      const isAgent = o.datamart_response?.agent_id || o.datamart_response?.store_slug;
      const srcName = isAgent ? `Agent Store (${o.datamart_response?.store_slug || "Agent"})` : "Main Storefront";
      if (!c.sources.includes(srcName)) c.sources.push(srcName);
    });

    // 2. Process Dedicated Agent Orders table
    agentOrders.forEach((ao: any) => {
      const p = cleanPhone(ao.phone);
      if (!p) return;
      const c = getOrCreate(p, "", ao.created_at);
      if (ao.reference && !c.recent_references.includes(ao.reference)) {
        c.total_orders += 1;
        c.total_spent = Number((c.total_spent + (Number(ao.amount) || 0)).toFixed(2));
        if (c.recent_references.length < 5) c.recent_references.push(ao.reference);
      }
      const src = `Agent Store (${ao.agent_id})`;
      if (!c.sources.includes(src)) c.sources.push(src);
    });

    // 3. Process Agents contact numbers
    agents.forEach((a: any) => {
      if (a.phone) {
        const p = cleanPhone(a.phone);
        if (p) {
          const c = getOrCreate(p, a.name, a.created_at);
          const src = `Agent Partner (${a.store_name || a.name})`;
          if (!c.sources.includes(src)) c.sources.push(src);
        }
      }
      if (a.momo_number && a.momo_number !== a.phone) {
        const p = cleanPhone(a.momo_number);
        if (p) {
          const c = getOrCreate(p, a.name, a.created_at);
          const src = `Agent MoMo (${a.store_name || a.name})`;
          if (!c.sources.includes(src)) c.sources.push(src);
        }
      }
    });

    // 4. Process Live Chat Messages
    messages.forEach((m: any) => {
      if (!m.phone) return;
      const p = cleanPhone(m.phone);
      if (!p) return;
      const cleanName = m.name && m.name.toLowerCase() !== "customer" && m.name.toLowerCase() !== "testuser" ? m.name : "";
      const c = getOrCreate(p, cleanName, m.created_at);
      const src = "Live Chat Support";
      if (!c.sources.includes(src)) c.sources.push(src);
    });

    // 5. Process Free Data Voucher Claims
    voucherClaims.forEach((vc: any) => {
      if (!vc.phone) return;
      const p = cleanPhone(vc.phone);
      if (!p) return;
      const c = getOrCreate(p, "", vc.created_at);
      const src = `Voucher Promo (${vc.voucher_code || "Free Data"})`;
      if (!c.sources.includes(src)) c.sources.push(src);
    });

    // 6. Ensure ALL verified registered accounts are present and prioritized
    registeredCustomers.forEach((rc: any) => {
      const p = cleanPhone(rc.phone);
      if (!p) return;
      let existing = customerMap.get(p.local);
      if (!existing) {
        existing = {
          phone: p.local,
          international_phone: p.international,
          name: rc.name || "Registered User",
          network: p.network,
          total_orders: 0,
          total_spent: 0,
          sources: ["Registered Account"],
          first_seen: rc.created_at || new Date().toISOString(),
          last_seen: rc.created_at || new Date().toISOString(),
          recent_references: [],
          is_registered: true,
          customer_id: rc.id,
          wallet_balance: Number(rc.wallet_balance || 0),
          email: rc.email,
        };
        customerMap.set(p.local, existing);
      } else {
        existing.is_registered = true;
        existing.customer_id = rc.id;
        existing.wallet_balance = Number(rc.wallet_balance || 0);
        existing.email = rc.email || existing.email;
        if (rc.name && (!existing.name || existing.name.toLowerCase() === "customer")) {
          existing.name = rc.name;
        }
        if (!existing.sources.includes("Registered Account")) {
          existing.sources.unshift("Registered Account");
        }
      }
    });

    // Sort: registered accounts first, then by most recently active
    const list = Array.from(customerMap.values()).sort((a, b) => {
      if (a.is_registered && !b.is_registered) return -1;
      if (!a.is_registered && b.is_registered) return 1;
      return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
    });

    const allNumbersLocal = list.map((c) => c.phone);
    const allNumbersInternational = list.map((c) => c.international_phone);

    const summary = {
      total_contacts: list.length,
      total_registered_accounts: list.filter((c) => c.is_registered).length,
      total_guest_buyers: list.filter((c) => !c.is_registered).length,
      total_storefront_customers: list.filter((c) => c.sources.some((s) => s.includes("Main Storefront"))).length,
      total_agent_customers: list.filter((c) => c.sources.some((s) => s.includes("Agent"))).length,
      total_chat_customers: list.filter((c) => c.sources.some((s) => s.includes("Live Chat"))).length,
      mtn_count: list.filter((c) => c.network === "mtn").length,
      telecel_count: list.filter((c) => c.network === "telecel").length,
      at_count: list.filter((c) => c.network === "at").length,
      numbers_comma: allNumbersLocal.join(", "),
      numbers_newline: allNumbersLocal.join("\n"),
      numbers_intl_comma: allNumbersInternational.join(", "),
      numbers_intl_newline: allNumbersInternational.join("\n"),
    };

    return NextResponse.json({
      success: true,
      customers: list,
      summary,
    });
  } catch (error: any) {
    console.error("[Admin Customers API] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load customers" },
      { status: 500 }
    );
  }
}
