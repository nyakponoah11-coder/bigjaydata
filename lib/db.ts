import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

export interface Product {
  id: string;
  network: string; // 'mtn' | 'telecel' | 'at' | string
  size: string; // e.g. '1GB', '2GB', '5GB'
  price: number;
  cost_price: number;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  reference: string;
  network: string;
  package_size: string;
  phone: string;
  amount: number;
  paystack_ref: string | null;
  payment_status: "paid" | "pending" | "failed" | string;
  delivery_status: "delivered" | "processing" | "pending" | "failed" | string;
  status: "pending" | "delivered" | "failed" | "refunded";
  datamart_response: any;
  created_at: string;
}

export function normalizeOrder(order: any): Order {
  if (!order) return order;
  const isPaid =
    order.payment_status === "paid" ||
    order.payment_status === "completed" ||
    !!order.paystack_ref ||
    (Number(order.amount) > 0 && order.status !== "failed");

  const payment_status = order.payment_status || (isPaid ? "paid" : "pending");

  let delivery_status = order.delivery_status;
  if (!delivery_status) {
    if (order.status === "delivered") delivery_status = "delivered";
    else if (order.status === "failed") delivery_status = "failed";
    else delivery_status = "pending";
  }

  return {
    ...order,
    amount: Number(order.amount || 0),
    payment_status,
    delivery_status,
    status: (order.status as Order["status"]) || (delivery_status === "delivered" ? "delivered" : "pending"),
  };
}

export interface Settings {
  id: string;
  store_name: string;
  support_phone: string;
  whatsapp_number: string;
  email: string;
  paystack_public_key: string;
  paystack_secret_key: string;
  datamart_api_key: string;
  datamart_api_url: string;
  announcement_text: string;
  announcement_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  name: string;
  phone: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  network: string; // mtn, telecel, at
  package_size: string; // 1GB, 500MB
  tagline: string;
  max_claims: number;
  claimed_count: number;
  is_active: boolean;
  created_at: string;
}

export interface VoucherClaim {
  id: string;
  voucher_id: string;
  voucher_code: string;
  phone: string;
  network: string;
  package_size: string;
  order_reference: string;
  created_at: string;
}

// Products start empty - added and managed purely via /admin/products
let initialProducts: Product[] = [];


let initialSettings: Settings = {
  id: "default",
  store_name: "BundleMartGh",
  support_phone: "+233 55 123 4567",
  whatsapp_number: "233551234567",
  email: "support@bundlemartgh.com",
  paystack_public_key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
  paystack_secret_key: process.env.PAYSTACK_SECRET_KEY || "",
  datamart_api_key: process.env.DATAMART_API_KEY || "",
  datamart_api_url: process.env.DATAMART_API_URL || "https://api.datamartgh.shop/api/developer",
  announcement_text: "⚡ Instant Delivery Guarantee: MTN, Telecel & AT packages delivered in under 60 seconds! 24/7 Automated.",
  announcement_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let initialOrders: Order[] = [
  {
    id: "ord-1",
    reference: "BMGH-98234120",
    network: "mtn",
    package_size: "5GB",
    phone: "0554128901",
    amount: 28.5,
    paystack_ref: "pst_98234120",
    payment_status: "paid",
    delivery_status: "delivered",
    status: "delivered",
    datamart_response: { status: "success", datamart_id: "DM-10923", message: "Transaction successful" },
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "ord-2",
    reference: "BMGH-77123984",
    network: "telecel",
    package_size: "10GB",
    phone: "0208192384",
    amount: 50.0,
    paystack_ref: "pst_77123984",
    payment_status: "paid",
    delivery_status: "delivered",
    status: "delivered",
    datamart_response: { status: "success", datamart_id: "DM-10924", message: "Transaction successful" },
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: "ord-3",
    reference: "BMGH-55102941",
    network: "at",
    package_size: "2GB",
    phone: "0271109923",
    amount: 10.0,
    paystack_ref: "pst_55102941",
    payment_status: "paid",
    delivery_status: "delivered",
    status: "delivered",
    datamart_response: { status: "success", datamart_id: "DM-10925", message: "Transaction successful" },
    created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
  },
];

let initialMessages: Message[] = [
  {
    id: "msg-1",
    name: "Kofi Mensah",
    phone: "0559123456",
    message: "Hello BundleMartGh, how fast does MTN 10GB arrive?",
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];

// Persistent global cache in Node environment
const globalStore = globalThis as unknown as {
  __bmgh_products?: Product[];
  __bmgh_settings?: Settings;
  __bmgh_orders?: Order[];
  __bmgh_messages?: Message[];
  __bmgh_vouchers?: Voucher[];
  __bmgh_voucher_claims?: VoucherClaim[];
};

if (!globalStore.__bmgh_products) globalStore.__bmgh_products = initialProducts;
if (!globalStore.__bmgh_settings) globalStore.__bmgh_settings = initialSettings;
if (!globalStore.__bmgh_orders) globalStore.__bmgh_orders = initialOrders;
if (!globalStore.__bmgh_messages) globalStore.__bmgh_messages = initialMessages;
if (!globalStore.__bmgh_vouchers) globalStore.__bmgh_vouchers = [];
if (!globalStore.__bmgh_voucher_claims) globalStore.__bmgh_voucher_claims = [];

export const db = {
  // SETTINGS
  async getSettings(): Promise<Settings> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("settings").select("*").eq("id", "default").single();
        if (!error && data) return data as Settings;
      } catch (err) {
        console.error("Supabase getSettings error:", err);
      }
    }
    return globalStore.__bmgh_settings!;
  },

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("settings")
          .upsert({ id: "default", ...updates, updated_at: new Date().toISOString() })
          .select()
          .single();
        if (!error && data) {
          globalStore.__bmgh_settings = data as Settings;
          return data as Settings;
        }
      } catch (err) {
        console.error("Supabase updateSettings error:", err);
      }
    }
    globalStore.__bmgh_settings = {
      ...globalStore.__bmgh_settings!,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return globalStore.__bmgh_settings;
  },

  // PRODUCTS
  async getProducts(network?: string): Promise<Product[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let query = supabaseAdmin.from("products").select("*").order("price", { ascending: true });
        if (network) {
          query = query.eq("network", network.toLowerCase());
        }
        const { data, error } = await query;
        if (!error && data) return data as Product[];
      } catch (err) {
        console.error("Supabase getProducts error:", err);
      }
    }
    let list = globalStore.__bmgh_products!;
    if (network) {
      list = list.filter((p) => p.network.toLowerCase() === network.toLowerCase());
    }
    return list.sort((a, b) => a.price - b.price);
  },

  async addProduct(product: Omit<Product, "id" | "created_at">): Promise<Product> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("products")
          .insert([
            {
              network: product.network.toLowerCase().trim(),
              size: product.size.trim(),
              price: Number(product.price),
              cost_price: Number(product.cost_price || 0),
              is_active: product.is_active !== false,
            },
          ])
          .select()
          .single();
        if (error) {
          console.error("Supabase addProduct error:", error);
          throw new Error(error.message);
        }
        if (data) {
          const created = data as Product;
          globalStore.__bmgh_products = [created, ...(globalStore.__bmgh_products || [])];
          return created;
        }
      } catch (err: any) {
        console.error("Supabase addProduct exception:", err?.message || err);
        throw err;
      }
    }

    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    globalStore.__bmgh_products = [newProduct, ...(globalStore.__bmgh_products || [])];
    return newProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const payload: any = {};
        if (updates.network !== undefined) payload.network = updates.network.toLowerCase().trim();
        if (updates.size !== undefined) payload.size = updates.size.trim();
        if (updates.price !== undefined) payload.price = Number(updates.price);
        if (updates.cost_price !== undefined) payload.cost_price = Number(updates.cost_price);
        if (updates.is_active !== undefined) payload.is_active = updates.is_active;

        const { data, error } = await supabaseAdmin
          .from("products")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) {
          console.error("Supabase updateProduct error:", error);
          throw new Error(error.message);
        }
        if (data) {
          const updated = data as Product;
          const idx = (globalStore.__bmgh_products || []).findIndex((p) => p.id === id);
          if (idx !== -1) globalStore.__bmgh_products![idx] = updated;
          return updated;
        }
      } catch (err: any) {
        console.error("Supabase updateProduct exception:", err?.message || err);
        throw err;
      }
    }

    const index = (globalStore.__bmgh_products || []).findIndex((p) => p.id === id);
    if (index === -1) return null;
    globalStore.__bmgh_products![index] = { ...globalStore.__bmgh_products![index], ...updates };
    return globalStore.__bmgh_products![index];
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
        if (error) {
          console.error("Supabase deleteProduct error:", error);
          throw new Error(error.message);
        }
        globalStore.__bmgh_products = (globalStore.__bmgh_products || []).filter((p) => p.id !== id);
        return true;
      } catch (err: any) {
        console.error("Supabase deleteProduct exception:", err?.message || err);
        throw err;
      }
    }

    const index = (globalStore.__bmgh_products || []).findIndex((p) => p.id === id);
    if (index === -1) return false;
    globalStore.__bmgh_products!.splice(index, 1);
    return true;
  },

  // ORDERS
  async getOrders(filter?: {
    date?: string;
    network?: string;
    status?: string;
    delivery_status?: string;
    payment_status?: string;
    search?: string;
  }): Promise<Order[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let query = supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false });
        if (filter?.network && filter.network !== "all") {
          query = query.eq("network", filter.network.toLowerCase());
        }
        if (filter?.status && filter.status !== "all") {
          query = query.eq("status", filter.status);
        }
        if (filter?.delivery_status && filter.delivery_status !== "all") {
          query = query.eq("delivery_status", filter.delivery_status);
        }
        if (filter?.payment_status && filter.payment_status !== "all") {
          query = query.eq("payment_status", filter.payment_status);
        }
        const { data, error } = await query;
        if (!error && data) {
          let results = (data as Order[]).map(normalizeOrder);
          if (filter?.delivery_status && filter.delivery_status !== "all") {
            results = results.filter((o) => o.delivery_status === filter.delivery_status);
          }
          if (filter?.payment_status && filter.payment_status !== "all") {
            results = results.filter((o) => o.payment_status === filter.payment_status);
          }
          if (filter?.date) {
            results = results.filter((o) => o.created_at.startsWith(filter.date!));
          }
          if (filter?.search) {
            const q = filter.search.toLowerCase();
            results = results.filter((o) => o.reference.toLowerCase().includes(q) || o.phone.includes(q));
          }
          return results;
        }
      } catch (err) {
        console.error("Supabase getOrders error:", err);
      }
    }

    let results = [...globalStore.__bmgh_orders!].map(normalizeOrder).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (filter?.network && filter.network !== "all") {
      results = results.filter((o) => o.network.toLowerCase() === filter.network!.toLowerCase());
    }
    if (filter?.status && filter.status !== "all") {
      results = results.filter((o) => o.status === filter.status);
    }
    if (filter?.delivery_status && filter.delivery_status !== "all") {
      results = results.filter((o) => o.delivery_status === filter.delivery_status);
    }
    if (filter?.payment_status && filter.payment_status !== "all") {
      results = results.filter((o) => o.payment_status === filter.payment_status);
    }
    if (filter?.date) {
      results = results.filter((o) => o.created_at.startsWith(filter.date!));
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      results = results.filter((o) => o.reference.toLowerCase().includes(q) || o.phone.includes(q));
    }
    return results;
  },

  async getOrderByReference(reference: string): Promise<Order | null> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .ilike("reference", reference.trim())
          .maybeSingle();
        if (!error && data) return normalizeOrder(data as Order);
      } catch (err) {
        console.error("Supabase getOrderByReference error:", err);
      }
    }

    const found = globalStore.__bmgh_orders!.find(
      (o) => o.reference.toLowerCase() === reference.trim().toLowerCase()
    );
    return found ? normalizeOrder(found) : null;
  },

  async getOrdersByPhone(phone: string): Promise<Order[]> {
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .ilike("phone", `%${cleanPhone}%`)
          .order("created_at", { ascending: false });
        if (!error && data) return (data as Order[]).map(normalizeOrder);
      } catch (err) {
        console.error("Supabase getOrdersByPhone error:", err);
      }
    }

    return globalStore.__bmgh_orders!
      .filter((o) => o.phone.includes(cleanPhone))
      .map(normalizeOrder);
  },

  async createOrder(orderData: Omit<Order, "id" | "created_at">): Promise<Order> {
    const payment_status = orderData.payment_status || (orderData.paystack_ref ? "paid" : "paid");
    const delivery_status = orderData.delivery_status || (orderData.status === "delivered" ? "delivered" : "pending");
    const status = orderData.status || (delivery_status === "delivered" ? "delivered" : "pending");

    if (isSupabaseConfigured && supabaseAdmin) {
      const insertPayload: any = {
        reference: orderData.reference,
        network: orderData.network.toLowerCase().trim(),
        package_size: orderData.package_size.trim(),
        phone: orderData.phone.trim(),
        amount: Number(orderData.amount),
        paystack_ref: orderData.paystack_ref || null,
        payment_status,
        delivery_status,
        status,
        datamart_response: orderData.datamart_response || {},
      };

      try {
        let { data, error } = await supabaseAdmin
          .from("orders")
          .insert([insertPayload])
          .select()
          .single();

        // If table doesn't have payment_status / delivery_status columns yet
        if (error && (error.message?.includes("payment_status") || error.message?.includes("delivery_status"))) {
          console.warn("Retrying insert without newer columns:", error.message);
          const fallbackPayload = {
            reference: insertPayload.reference,
            network: insertPayload.network,
            package_size: insertPayload.package_size,
            phone: insertPayload.phone,
            amount: insertPayload.amount,
            paystack_ref: insertPayload.paystack_ref,
            status: insertPayload.status,
            datamart_response: insertPayload.datamart_response,
          };
          const fallbackRes = await supabaseAdmin.from("orders").insert([fallbackPayload]).select().single();
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (error) {
          if (
            error.code === "23505" ||
            error.message?.includes("orders_reference_key") ||
            error.message?.includes("duplicate key")
          ) {
            console.log("Order already exists in Supabase, fetching existing:", orderData.reference);
            const existing = await this.getOrderByReference(orderData.reference);
            if (existing) return existing;
          }
          console.error("Supabase createOrder error:", error);
          throw new Error(error.message);
        }
        if (data) {
          const ord = normalizeOrder(data as Order);
          globalStore.__bmgh_orders = [ord, ...(globalStore.__bmgh_orders || [])];
          return ord;
        }
      } catch (err: any) {
        if (
          err?.code === "23505" ||
          err?.message?.includes("orders_reference_key") ||
          err?.message?.includes("duplicate key")
        ) {
          console.log("Caught duplicate key exception in createOrder, returning existing:", orderData.reference);
          const existing = await this.getOrderByReference(orderData.reference);
          if (existing) return existing;
        }
        console.error("Supabase createOrder exception:", err?.message || err);
        throw err;
      }
    }

    const existingMemory = (globalStore.__bmgh_orders || []).find(
      (o) => o.reference.toLowerCase() === orderData.reference.trim().toLowerCase()
    );
    if (existingMemory) return normalizeOrder(existingMemory);

    const newOrder: Order = normalizeOrder({
      ...orderData,
      payment_status,
      delivery_status,
      status,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    });

    globalStore.__bmgh_orders!.unshift(newOrder);
    return newOrder;
  },

  async updateOrderStatus(
    orderIdOrRef: string,
    statusOrDelivery: Order["status"] | string,
    datamartResponse?: any,
    options?: { payment_status?: string; delivery_status?: string }
  ): Promise<Order | null> {
    const isDeliveryStatus = ["delivered", "failed", "processing", "pending"].includes(statusOrDelivery);
    const legacyStatus: Order["status"] = (statusOrDelivery === "delivered" ? "delivered" : statusOrDelivery === "refunded" ? "refunded" : statusOrDelivery === "failed" ? "failed" : "pending");
    const targetDeliveryStatus = options?.delivery_status || (isDeliveryStatus ? statusOrDelivery : undefined);
    const targetPaymentStatus = options?.payment_status;

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const isRef = orderIdOrRef.startsWith("BMGH-") || orderIdOrRef.startsWith("BIGJ-") || orderIdOrRef.includes("-");
        const updatePayload: any = {
          status: legacyStatus,
          ...(datamartResponse ? { datamart_response: datamartResponse } : {}),
          ...(targetDeliveryStatus ? { delivery_status: targetDeliveryStatus } : {}),
          ...(targetPaymentStatus ? { payment_status: targetPaymentStatus } : {}),
        };

        let query = supabaseAdmin.from("orders").update(updatePayload);
        let { data, error } = isRef
          ? await query.eq("reference", orderIdOrRef).select().single()
          : await query.eq("id", orderIdOrRef).select().single();

        // If columns do not exist yet in Supabase
        if (error && (error.message?.includes("delivery_status") || error.message?.includes("payment_status"))) {
          const fallbackPayload: any = {
            status: legacyStatus,
            ...(datamartResponse ? { datamart_response: datamartResponse } : {}),
          };
          const fallbackQuery = supabaseAdmin.from("orders").update(fallbackPayload);
          const fallbackRes = isRef
            ? await fallbackQuery.eq("reference", orderIdOrRef).select().single()
            : await fallbackQuery.eq("id", orderIdOrRef).select().single();
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (!error && data) return normalizeOrder(data as Order);
      } catch (err) {
        console.error("Supabase updateOrderStatus error:", err);
      }
    }

    const order = globalStore.__bmgh_orders!.find(
      (o) => o.id === orderIdOrRef || o.reference.toLowerCase() === orderIdOrRef.toLowerCase()
    );
    if (!order) return null;
    order.status = legacyStatus;
    if (targetDeliveryStatus) order.delivery_status = targetDeliveryStatus;
    if (targetPaymentStatus) order.payment_status = targetPaymentStatus;
    if (datamartResponse) order.datamart_response = datamartResponse;
    return normalizeOrder(order);
  },

  // MESSAGES
  async getMessages(): Promise<Message[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("messages").select("*").order("created_at", { ascending: false });
        if (!error && data) return data as Message[];
      } catch (err) {
        console.error("Supabase getMessages error:", err);
      }
    }
    return globalStore.__bmgh_messages!;
  },

  async createMessage(msg: Omit<Message, "id" | "is_read" | "created_at">): Promise<Message> {
    const newMsg: Message = {
      ...msg,
      id: "msg-" + Math.random().toString(36).substring(2, 9),
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("messages").insert([newMsg]).select().single();
        if (!error && data) return data as Message;
      } catch (err) {
        console.error("Supabase createMessage error:", err);
      }
    }

    globalStore.__bmgh_messages!.unshift(newMsg);
    return newMsg;
  },

  async markMessageRead(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("messages").update({ is_read: true }).eq("id", id);
        return true;
      } catch (err) {
        console.error("Supabase markMessageRead error:", err);
      }
    }
    const msg = globalStore.__bmgh_messages!.find((m) => m.id === id);
    if (msg) msg.is_read = true;
    return true;
  },

  // FREE DATA VOUCHERS
  async getVouchers(): Promise<Voucher[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("vouchers").select("*").order("created_at", { ascending: false });
        if (!error && data) return data as Voucher[];
      } catch (err) {
        console.error("Supabase getVouchers error:", err);
      }
    }
    return globalStore.__bmgh_vouchers || [];
  },

  async getActiveVoucher(): Promise<Voucher | null> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("vouchers")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) return data as Voucher;
      } catch (err) {
        console.error("Supabase getActiveVoucher error:", err);
      }
    }
    return (globalStore.__bmgh_vouchers || []).find((v) => v.is_active && v.claimed_count < v.max_claims) || null;
  },

  async createVoucher(voucher: Omit<Voucher, "id" | "claimed_count" | "created_at">): Promise<Voucher> {
    const newVoucher: Voucher = {
      ...voucher,
      id: crypto.randomUUID(),
      code: voucher.code.trim().toUpperCase(),
      claimed_count: 0,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("vouchers").insert([newVoucher]).select().single();
        if (!error && data) return data as Voucher;
      } catch (err) {
        console.error("Supabase createVoucher error:", err);
      }
    }

    if (!globalStore.__bmgh_vouchers) globalStore.__bmgh_vouchers = [];
    globalStore.__bmgh_vouchers.unshift(newVoucher);
    return newVoucher;
  },

  async toggleVoucher(id: string, is_active: boolean): Promise<boolean> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("vouchers").update({ is_active }).eq("id", id);
      } catch (err) {
        console.error("Supabase toggleVoucher error:", err);
      }
    }
    const v = (globalStore.__bmgh_vouchers || []).find((x) => x.id === id);
    if (v) v.is_active = is_active;
    return true;
  },

  async deleteVoucher(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("vouchers").delete().eq("id", id);
      } catch (err) {
        console.error("Supabase deleteVoucher error:", err);
      }
    }
    if (globalStore.__bmgh_vouchers) {
      globalStore.__bmgh_vouchers = globalStore.__bmgh_vouchers.filter((x) => x.id !== id);
    }
    return true;
  },

  async hasPhoneClaimedVoucher(phone: string): Promise<boolean> {
    const cleaned = (phone || "").replace(/[^0-9]/g, "");
    const formatted = cleaned.startsWith("233") ? "0" + cleaned.slice(3) : cleaned.length === 9 ? "0" + cleaned : cleaned;
    
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("voucher_claims").select("id").eq("phone", formatted).limit(1);
        if (!error && data && data.length > 0) return true;
      } catch (err) {
        console.error("Supabase hasPhoneClaimedVoucher error:", err);
      }
    }
    return (globalStore.__bmgh_voucher_claims || []).some((c) => c.phone === formatted);
  },

  async recordVoucherClaim(claim: Omit<VoucherClaim, "id" | "created_at">): Promise<VoucherClaim> {
    const cleaned = (claim.phone || "").replace(/[^0-9]/g, "");
    const formatted = cleaned.startsWith("233") ? "0" + cleaned.slice(3) : cleaned.length === 9 ? "0" + cleaned : cleaned;
    const newClaim: VoucherClaim = {
      ...claim,
      id: crypto.randomUUID(),
      phone: formatted,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("voucher_claims").insert([newClaim]);
        const { data: v } = await supabaseAdmin.from("vouchers").select("claimed_count, max_claims").eq("id", claim.voucher_id).single();
        if (v) {
          const nextCount = (v.claimed_count || 0) + 1;
          await supabaseAdmin.from("vouchers").update({
            claimed_count: nextCount,
            is_active: nextCount < v.max_claims,
          }).eq("id", claim.voucher_id);
        }
      } catch (err) {
        console.error("Supabase recordVoucherClaim error:", err);
      }
    }

    if (!globalStore.__bmgh_voucher_claims) globalStore.__bmgh_voucher_claims = [];
    globalStore.__bmgh_voucher_claims.unshift(newClaim);

    const v = (globalStore.__bmgh_vouchers || []).find((x) => x.id === claim.voucher_id);
    if (v) {
      v.claimed_count += 1;
      if (v.claimed_count >= v.max_claims) v.is_active = false;
    }

    return newClaim;
  },

  async getVoucherClaims(): Promise<VoucherClaim[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("voucher_claims").select("*").order("created_at", { ascending: false });
        if (!error && data) return data as VoucherClaim[];
      } catch (err) {
        console.error("Supabase getVoucherClaims error:", err);
      }
    }
    return globalStore.__bmgh_voucher_claims || [];
  },
};
