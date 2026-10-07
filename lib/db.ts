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
  status: "pending" | "delivered" | "failed" | "refunded";
  datamart_response: any;
  created_at: string;
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
  datamart_api_url: process.env.DATAMART_API_URL || "https://api.datamartgh.com/v1",
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
};

if (!globalStore.__bmgh_products) globalStore.__bmgh_products = initialProducts;
if (!globalStore.__bmgh_settings) globalStore.__bmgh_settings = initialSettings;
if (!globalStore.__bmgh_orders) globalStore.__bmgh_orders = initialOrders;
if (!globalStore.__bmgh_messages) globalStore.__bmgh_messages = initialMessages;

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
  async getOrders(filter?: { date?: string; network?: string; status?: string; search?: string }): Promise<Order[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let query = supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false });
        if (filter?.network && filter.network !== "all") {
          query = query.eq("network", filter.network.toLowerCase());
        }
        if (filter?.status && filter.status !== "all") {
          query = query.eq("status", filter.status);
        }
        const { data, error } = await query;
        if (!error && data) {
          let results = data as Order[];
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

    let results = [...globalStore.__bmgh_orders!].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (filter?.network && filter.network !== "all") {
      results = results.filter((o) => o.network.toLowerCase() === filter.network!.toLowerCase());
    }
    if (filter?.status && filter.status !== "all") {
      results = results.filter((o) => o.status === filter.status);
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
        if (!error && data) return data as Order;
      } catch (err) {
        console.error("Supabase getOrderByReference error:", err);
      }
    }

    return (
      globalStore.__bmgh_orders!.find((o) => o.reference.toLowerCase() === reference.trim().toLowerCase()) || null
    );
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
        if (!error && data) return data as Order[];
      } catch (err) {
        console.error("Supabase getOrdersByPhone error:", err);
      }
    }

    return globalStore.__bmgh_orders!.filter((o) => o.phone.includes(cleanPhone));
  },

  async createOrder(orderData: Omit<Order, "id" | "created_at">): Promise<Order> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .insert([
            {
              reference: orderData.reference,
              network: orderData.network.toLowerCase().trim(),
              package_size: orderData.package_size.trim(),
              phone: orderData.phone.trim(),
              amount: Number(orderData.amount),
              paystack_ref: orderData.paystack_ref || null,
              status: orderData.status || "pending",
              datamart_response: orderData.datamart_response || {},
            },
          ])
          .select()
          .single();
        if (error) {
          console.error("Supabase createOrder error:", error);
          throw new Error(error.message);
        }
        if (data) {
          const ord = data as Order;
          globalStore.__bmgh_orders = [ord, ...(globalStore.__bmgh_orders || [])];
          return ord;
        }
      } catch (err: any) {
        console.error("Supabase createOrder exception:", err?.message || err);
        throw err;
      }
    }

    const newOrder: Order = {
      ...orderData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    globalStore.__bmgh_orders!.unshift(newOrder);
    return newOrder;
  },

  async updateOrderStatus(
    orderIdOrRef: string,
    status: Order["status"],
    datamartResponse?: any
  ): Promise<Order | null> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const isRef = orderIdOrRef.startsWith("BMGH-") || orderIdOrRef.startsWith("BIGJ-") || orderIdOrRef.includes("-");
        const query = supabaseAdmin.from("orders").update({
          status,
          ...(datamartResponse ? { datamart_response: datamartResponse } : {}),
        });
        const { data, error } = isRef
          ? await query.eq("reference", orderIdOrRef).select().single()
          : await query.eq("id", orderIdOrRef).select().single();
        if (!error && data) return data as Order;
      } catch (err) {
        console.error("Supabase updateOrderStatus error:", err);
      }
    }

    const order = globalStore.__bmgh_orders!.find(
      (o) => o.id === orderIdOrRef || o.reference.toLowerCase() === orderIdOrRef.toLowerCase()
    );
    if (!order) return null;
    order.status = status;
    if (datamartResponse) order.datamart_response = datamartResponse;
    return order;
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
};
