import { supabaseAdmin, isSupabaseConfigured } from "./supabase";
import fs from "fs";
import path from "path";

export interface Product {
  id: string;
  network: string; // 'mtn' | 'telecel' | 'at' | string
  size: string; // e.g. '1GB', '2GB', '5GB'
  price: number;
  cost_price: number;
  is_active: boolean;
  created_at: string;
}

export type DeliveryStatus =
  | "pending"
  | "waiting"
  | "processing"
  | "completed"
  | "delivered"
  | "failed"
  | "refunded"
  | "cancelled";

export interface Order {
  id: string;
  reference: string;
  network: string;
  package_size: string;
  phone: string;
  amount: number;
  paystack_ref: string | null;
  payment_status: "paid" | "pending" | "failed" | string;
  delivery_status: DeliveryStatus | string;
  status: "pending" | "waiting" | "processing" | "completed" | "delivered" | "failed" | "refunded" | "cancelled" | string;
  datamart_response: any;
  created_at: string;
}

export function normalizeOrder(order: any): Order {
  if (!order) return order;
  const isPaid =
    order.payment_status === "paid" ||
    order.payment_status === "completed" ||
    !!order.paystack_ref ||
    (Number(order.amount) > 0 && order.status !== "failed" && order.status !== "cancelled");

  const payment_status = order.payment_status || (isPaid ? "paid" : "pending");

  let delivery_status = (order.delivery_status || "").toLowerCase().trim();
  if (!delivery_status) {
    const rawStatus = (order.status || "").toLowerCase().trim();
    if (rawStatus === "delivered" || rawStatus === "completed") delivery_status = "delivered";
    else if (rawStatus === "processing" || rawStatus === "in_progress") delivery_status = "processing";
    else if (rawStatus === "waiting" || rawStatus === "pending") delivery_status = "pending";
    else if (rawStatus === "failed") delivery_status = "failed";
    else if (rawStatus === "refunded") delivery_status = "refunded";
    else if (rawStatus === "cancelled") delivery_status = "cancelled";
    else delivery_status = "pending";
  } else if (delivery_status === "completed") {
    delivery_status = "delivered";
  }

  let status = (order.status || "").toLowerCase().trim();
  if (!status) {
    status = delivery_status;
  }

  return {
    ...order,
    amount: Number(order.amount || 0),
    payment_status,
    delivery_status,
    status: status as any,
  };
}

export interface Settings {
  id: string;
  store_name: string;
  support_phone: string;
  whatsapp_number: string;
  whatsapp_channel_url?: string;
  email: string;
  paystack_public_key: string;
  paystack_secret_key: string;
  datamart_api_key: string;
  datamart_api_url: string;
  announcement_text: string;
  announcement_active: boolean;
  gemini_api_key?: string;
  gemini_model?: string;
  groq_api_key?: string;
  groq_model?: string;
  grok_api_key?: string;
  grok_model?: string;
  openai_api_key?: string;
  openai_model?: string;
  ai_system_instructions?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  name?: string;
  phone?: string;
  message: string;
  image_url?: string;
  reply?: string;
  replied_at?: string;
  ai_reply?: string;
  ai_replied_at?: string;
  session_id?: string;
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
  expires_at?: string | null;
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

// ================= AGENT STORE INTERFACES =================
export interface AgentStoreConfig {
  is_enabled: boolean;
  developer_master_enabled?: boolean;
  admin_enabled?: boolean;
  registration_fee: number;
  custom_domain?: string;
}

export interface AgentBaseProduct {
  id: string;
  network: string; // mtn, telecel, at
  size: string; // 1GB, 2GB, etc.
  base_price: number; // what admin charges the agent
  suggested_price: number; // recommended retail price
  is_active: boolean;
  created_at: string;
}

export interface AgentCustomProduct {
  id: string;
  agent_id: string;
  base_product_id: string;
  network: string;
  size: string;
  base_price: number;
  selling_price: number; // agent's price to customer
  is_active: boolean;
}

export interface Agent {
  id: string;
  name: string;
  store_name: string;
  store_slug: string;
  email: string;
  phone: string;
  momo_number: string;
  momo_network: string;
  description: string;
  password_hash: string;
  theme: "emerald" | "midnight" | "sunset" | "sapphire" | "pearl" | string;
  wallet_balance: number;
  total_earned: number;
  total_withdrawn: number;
  is_active: boolean;
  registration_paid: boolean;
  created_at: string;
  logo_url?: string;
  whatsapp_number?: string;
  whatsapp_channel_url?: string;
  support_email?: string;
  cloaked_url?: string;
}

export interface AgentOrder {
  id: string;
  agent_id: string;
  reference: string;
  network: string;
  package_size: string;
  phone: string;
  amount: number; // customer paid (e.g. 5.00)
  base_price: number; // admin base cost (e.g. 4.00)
  agent_profit: number; // agent earned profit (e.g. 1.00)
  paystack_ref: string | null;
  payment_status: string;
  delivery_status: string;
  status: string;
  datamart_response?: any;
  created_at: string;
}

export interface AgentWithdrawal {
  id: string;
  agent_id: string;
  amount: number;
  momo_number: string;
  momo_network: string;
  status: "pending" | "completed" | "rejected";
  verification_code: string;
  verified: boolean;
  note?: string;
  created_at: string;
}

// Products start empty - added and managed purely via /admin/products
let initialProducts: Product[] = [];


let initialSettings: Settings = {
  id: "default",
  store_name: "BundleMartGh",
  support_phone: "+233 55 123 4567",
  whatsapp_number: "233551234567",
  whatsapp_channel_url: "",
  email: "support@bundlemartgh.com",
  paystack_public_key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
  paystack_secret_key: process.env.PAYSTACK_SECRET_KEY || "",
  datamart_api_key: process.env.DATAMART_API_KEY || "",
  datamart_api_url: process.env.DATAMART_API_URL || "https://api.datamartgh.shop/api/developer",
  announcement_text: "⚡ Instant Delivery Guarantee: MTN, Telecel & AT packages delivered in under 60 seconds! 24/7 Automated.",
  announcement_active: true,
  gemini_api_key: process.env.GEMINI_API_KEY || "",
  gemini_model: "gemini-3.8-flash",
  groq_api_key: process.env.GROQ_API_KEY || process.env.GROK_API_KEY || "",
  groq_model: "llama-3.3-70b-versatile",
  grok_api_key: process.env.GROK_API_KEY || process.env.GROQ_API_KEY || "",
  grok_model: "llama-3.3-70b-versatile",
  openai_api_key: process.env.OPENAI_API_KEY || "",
  openai_model: "gpt-4o-mini",
  ai_system_instructions: "",
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
const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

function loadFromDisk(): any {
  try {
    if (typeof window === "undefined" && fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Failed to load local store from disk:", err);
  }
  return null;
}

const diskData = loadFromDisk();

const initialAgentBaseProducts: AgentBaseProduct[] = [
  { id: "abp-mtn-1", network: "mtn", size: "1GB", base_price: 0.02, suggested_price: 0.05, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-mtn-2", network: "mtn", size: "2GB", base_price: 9.0, suggested_price: 11.0, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-mtn-3", network: "mtn", size: "3GB", base_price: 13.5, suggested_price: 16.5, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-mtn-5", network: "mtn", size: "5GB", base_price: 22.0, suggested_price: 26.5, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-mtn-10", network: "mtn", size: "10GB", base_price: 44.0, suggested_price: 52.0, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-tc-1", network: "telecel", size: "1GB", base_price: 4.0, suggested_price: 5.0, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-tc-2", network: "telecel", size: "2GB", base_price: 8.0, suggested_price: 10.0, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-tc-5", network: "telecel", size: "5GB", base_price: 20.0, suggested_price: 24.5, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-tc-10", network: "telecel", size: "10GB", base_price: 39.0, suggested_price: 48.0, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-at-1", network: "at", size: "1GB", base_price: 4.0, suggested_price: 5.0, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-at-2", network: "at", size: "2GB", base_price: 8.0, suggested_price: 10.0, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-at-5", network: "at", size: "5GB", base_price: 19.0, suggested_price: 23.5, is_active: true, created_at: new Date().toISOString() },
  { id: "abp-at-10", network: "at", size: "10GB", base_price: 37.0, suggested_price: 45.0, is_active: true, created_at: new Date().toISOString() },
];

const initialAgents: Agent[] = [
  {
    id: "agent-82d9c8eb",
    name: "Nyakpo",
    store_name: "Stony",
    store_slug: "stony",
    email: "nyakponoah11@gmail.com",
    phone: "05922753424",
    momo_number: "05922753424",
    momo_network: "MTN",
    description: "Welcome to Stony Data Store. Enjoy instant automated non-expiry data for MTN, Telecel, and AT.",
    password_hash: "123456",
    theme: "pearl",
    wallet_balance: 0,
    total_earned: 0,
    total_withdrawn: 0,
    is_active: true,
    registration_paid: true,
    cloaked_url: "https://tinyurl.com/265syqzn",
    created_at: "2026-10-10T10:05:54.889Z",
  },
];

const globalStore = globalThis as unknown as {
  __bmgh_products?: Product[];
  __bmgh_settings?: Settings;
  __bmgh_orders?: Order[];
  __bmgh_messages?: Message[];
  __bmgh_vouchers?: Voucher[];
  __bmgh_voucher_claims?: VoucherClaim[];
  __bmgh_agent_config?: AgentStoreConfig;
  __bmgh_agent_base_products?: AgentBaseProduct[];
  __bmgh_agents?: Agent[];
  __bmgh_agent_products?: AgentCustomProduct[];
  __bmgh_agent_orders?: AgentOrder[];
  __bmgh_agent_withdrawals?: AgentWithdrawal[];
};

function saveToDisk() {
  try {
    if (typeof window === "undefined") {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const dataToSave = {
        settings: globalStore.__bmgh_settings,
        products: globalStore.__bmgh_products,
        orders: globalStore.__bmgh_orders,
        messages: globalStore.__bmgh_messages,
        vouchers: globalStore.__bmgh_vouchers,
        voucher_claims: globalStore.__bmgh_voucher_claims,
        agent_config: globalStore.__bmgh_agent_config,
        agent_base_products: globalStore.__bmgh_agent_base_products,
        agents: globalStore.__bmgh_agents,
        agent_products: globalStore.__bmgh_agent_products,
        agent_orders: globalStore.__bmgh_agent_orders,
        agent_withdrawals: globalStore.__bmgh_agent_withdrawals,
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("Failed to save local store to disk:", err);
  }
}

if (!globalStore.__bmgh_products) globalStore.__bmgh_products = diskData?.products || initialProducts;
if (!globalStore.__bmgh_settings) {
  globalStore.__bmgh_settings = diskData?.settings
    ? { ...initialSettings, ...diskData.settings }
    : initialSettings;
}
if (!globalStore.__bmgh_orders) globalStore.__bmgh_orders = diskData?.orders || initialOrders;
if (!globalStore.__bmgh_messages) globalStore.__bmgh_messages = diskData?.messages || initialMessages;
if (!globalStore.__bmgh_vouchers) globalStore.__bmgh_vouchers = diskData?.vouchers || [];
if (!globalStore.__bmgh_voucher_claims) globalStore.__bmgh_voucher_claims = diskData?.voucher_claims || [];
if (!globalStore.__bmgh_agent_config) {
  globalStore.__bmgh_agent_config = diskData?.agent_config || { is_enabled: true, registration_fee: 0 };
}
if (!globalStore.__bmgh_agent_base_products) {
  globalStore.__bmgh_agent_base_products = diskData?.agent_base_products || initialAgentBaseProducts;
}
if (!globalStore.__bmgh_agents) globalStore.__bmgh_agents = diskData?.agents || [];
if (!globalStore.__bmgh_agent_products) globalStore.__bmgh_agent_products = diskData?.agent_products || [];
if (!globalStore.__bmgh_agent_orders) globalStore.__bmgh_agent_orders = diskData?.agent_orders || [];
if (!globalStore.__bmgh_agent_withdrawals) globalStore.__bmgh_agent_withdrawals = diskData?.agent_withdrawals || [];

export const db = {
  // SETTINGS
  async getSettings(): Promise<Settings> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("settings").select("*").eq("id", "default").single();
        if (!error && data) {
          const merged: Settings = { ...globalStore.__bmgh_settings, ...data };
          // Preserve channel url, announcement, and AI keys if configured locally
          if (data.whatsapp_channel_url && String(data.whatsapp_channel_url).trim()) {
            merged.whatsapp_channel_url = String(data.whatsapp_channel_url).trim();
          } else if (globalStore.__bmgh_settings?.whatsapp_channel_url) {
            merged.whatsapp_channel_url = globalStore.__bmgh_settings.whatsapp_channel_url;
          }

          // Check backup config row in Supabase so link never disappears across container restarts
          if (!merged.whatsapp_channel_url) {
            try {
              const { data: bRow } = await supabaseAdmin
                .from("settings")
                .select("store_name")
                .eq("id", "whatsapp_channel_config")
                .maybeSingle();
              if (bRow?.store_name && String(bRow.store_name).trim()) {
                merged.whatsapp_channel_url = String(bRow.store_name).trim();
              }
            } catch (bErr) {
              // ignore
            }
          }

          if (data.announcement_text && String(data.announcement_text).trim()) {
            merged.announcement_text = String(data.announcement_text).trim();
          } else if (globalStore.__bmgh_settings?.announcement_text) {
            merged.announcement_text = globalStore.__bmgh_settings.announcement_text;
          }

          if (data.announcement_active !== undefined && data.announcement_active !== null) {
            merged.announcement_active = Boolean(data.announcement_active);
          } else if (globalStore.__bmgh_settings?.announcement_active !== undefined) {
            merged.announcement_active = globalStore.__bmgh_settings.announcement_active;
          }

          if (data.gemini_api_key) merged.gemini_api_key = data.gemini_api_key;
          else if (globalStore.__bmgh_settings?.gemini_api_key) merged.gemini_api_key = globalStore.__bmgh_settings.gemini_api_key;

          if (data.gemini_model) merged.gemini_model = data.gemini_model;
          else if (globalStore.__bmgh_settings?.gemini_model) merged.gemini_model = globalStore.__bmgh_settings.gemini_model;

          if (data.grok_api_key) merged.grok_api_key = data.grok_api_key;
          else if (globalStore.__bmgh_settings?.grok_api_key) merged.grok_api_key = globalStore.__bmgh_settings.grok_api_key;

          if (data.grok_model) merged.grok_model = data.grok_model;
          else if (globalStore.__bmgh_settings?.grok_model) merged.grok_model = globalStore.__bmgh_settings.grok_model;

          if (data.openai_api_key) merged.openai_api_key = data.openai_api_key;
          else if (globalStore.__bmgh_settings?.openai_api_key) merged.openai_api_key = globalStore.__bmgh_settings.openai_api_key;

          if (data.openai_model) merged.openai_model = data.openai_model;
          else if (globalStore.__bmgh_settings?.openai_model) merged.openai_model = globalStore.__bmgh_settings.openai_model;

          if (data.ai_system_instructions !== undefined && data.ai_system_instructions !== null) {
            merged.ai_system_instructions = String(data.ai_system_instructions);
          } else if (globalStore.__bmgh_settings?.ai_system_instructions) {
            merged.ai_system_instructions = globalStore.__bmgh_settings.ai_system_instructions;
          }

          // Check fallback config row in Supabase so AI instructions never disappear across restarts
          if (!merged.ai_system_instructions) {
            try {
              const { data: aiRow } = await supabaseAdmin
                .from("settings")
                .select("announcement_text")
                .eq("id", "ai_instructions_config")
                .maybeSingle();
              if (aiRow?.announcement_text && String(aiRow.announcement_text).trim()) {
                merged.ai_system_instructions = String(aiRow.announcement_text).trim();
              }
            } catch (aiErr) {
              // ignore
            }
          }

          globalStore.__bmgh_settings = merged;
          saveToDisk();
          return merged;
        }
      } catch (err) {
        console.error("Supabase getSettings error:", err);
      }
    }
    return globalStore.__bmgh_settings!;
  },

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    // Sanitize: do not overwrite real API keys if masked bullets are passed
    const safeUpdates: Partial<Settings> = { ...updates };
    if (safeUpdates.gemini_api_key && safeUpdates.gemini_api_key.includes("••••")) {
      delete safeUpdates.gemini_api_key;
    }
    if (safeUpdates.groq_api_key && safeUpdates.groq_api_key.includes("••••")) {
      delete safeUpdates.groq_api_key;
    }
    if (safeUpdates.grok_api_key && safeUpdates.grok_api_key.includes("••••")) {
      delete safeUpdates.grok_api_key;
    }
    // Mirror groq & grok
    if (safeUpdates.groq_api_key && !safeUpdates.grok_api_key) {
      safeUpdates.grok_api_key = safeUpdates.groq_api_key;
    } else if (safeUpdates.grok_api_key && !safeUpdates.groq_api_key) {
      safeUpdates.groq_api_key = safeUpdates.grok_api_key;
    }
    if (safeUpdates.groq_model && !safeUpdates.grok_model) {
      safeUpdates.grok_model = safeUpdates.groq_model;
    } else if (safeUpdates.grok_model && !safeUpdates.groq_model) {
      safeUpdates.groq_model = safeUpdates.grok_model;
    }
    if (safeUpdates.openai_api_key && safeUpdates.openai_api_key.includes("••••")) {
      delete safeUpdates.openai_api_key;
    }
    if (safeUpdates.paystack_secret_key && safeUpdates.paystack_secret_key.includes("••••")) {
      delete safeUpdates.paystack_secret_key;
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        // Save WhatsApp channel url to dedicated config row so it NEVER disappears even if schema is old
        if (safeUpdates.whatsapp_channel_url !== undefined) {
          try {
            await supabaseAdmin.from("settings").upsert({
              id: "whatsapp_channel_config",
              store_name: safeUpdates.whatsapp_channel_url.trim(),
            });
          } catch (bErr) {
            console.warn("Channel backup row save error:", bErr);
          }
        }

        // Save AI instructions to dedicated config row so it NEVER disappears even if schema is old
        if (safeUpdates.ai_system_instructions !== undefined) {
          try {
            await supabaseAdmin.from("settings").upsert({
              id: "ai_instructions_config",
              announcement_text: safeUpdates.ai_system_instructions,
            });
          } catch (aiErr) {
            console.warn("AI instructions backup row save error:", aiErr);
          }
        }

        const payload = { id: "default", ...safeUpdates, updated_at: new Date().toISOString() };
        let { data, error } = await supabaseAdmin
          .from("settings")
          .upsert(payload)
          .select()
          .single();

        // If error due to missing newly added columns in Supabase
        if (error && (error.message?.includes("column") || error.code === "PGRST204")) {
          console.warn("Retrying settings upsert with legacy core columns:", error.message);
          const legacyPayload: any = {
            id: "default",
            store_name: safeUpdates.store_name,
            support_phone: safeUpdates.support_phone,
            whatsapp_number: safeUpdates.whatsapp_number,
            email: safeUpdates.email,
            paystack_public_key: safeUpdates.paystack_public_key,
            paystack_secret_key: safeUpdates.paystack_secret_key,
            datamart_api_key: safeUpdates.datamart_api_key,
            datamart_api_url: safeUpdates.datamart_api_url,
            announcement_text: safeUpdates.announcement_text,
            announcement_active: safeUpdates.announcement_active,
            updated_at: new Date().toISOString(),
          };
          // Filter out undefined keys
          Object.keys(legacyPayload).forEach((k) => legacyPayload[k] === undefined && delete legacyPayload[k]);
          const retryRes = await supabaseAdmin.from("settings").upsert(legacyPayload).select().single();
          data = retryRes.data;
        }

        if (data) {
          const prevChan = globalStore.__bmgh_settings?.whatsapp_channel_url || "";
          const prevAI = globalStore.__bmgh_settings?.ai_system_instructions || "";
          globalStore.__bmgh_settings = {
            ...globalStore.__bmgh_settings!,
            ...(data as Settings),
            ...safeUpdates,
          };
          if (!globalStore.__bmgh_settings.whatsapp_channel_url && prevChan && safeUpdates.whatsapp_channel_url === undefined) {
            globalStore.__bmgh_settings.whatsapp_channel_url = prevChan;
          }
          if (!globalStore.__bmgh_settings.ai_system_instructions && prevAI && safeUpdates.ai_system_instructions === undefined) {
            globalStore.__bmgh_settings.ai_system_instructions = prevAI;
          }
          saveToDisk();
          return globalStore.__bmgh_settings;
        }
      } catch (err) {
        console.error("Supabase updateSettings error:", err);
      }
    }
    globalStore.__bmgh_settings = {
      ...globalStore.__bmgh_settings!,
      ...safeUpdates,
      updated_at: new Date().toISOString(),
    };
    saveToDisk();
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
          saveToDisk();
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
    saveToDisk();
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
          saveToDisk();
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
    saveToDisk();
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
        saveToDisk();
        return true;
      } catch (err: any) {
        console.error("Supabase deleteProduct exception:", err?.message || err);
        throw err;
      }
    }

    const index = (globalStore.__bmgh_products || []).findIndex((p) => p.id === id);
    if (index === -1) return false;
    globalStore.__bmgh_products!.splice(index, 1);
    saveToDisk();
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

  async getOrderById(id: string): Promise<Order | null> {
    const cleanId = (id || "").trim();
    if (!cleanId) return null;
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("id", cleanId)
          .maybeSingle();
        if (!error && data) return normalizeOrder(data as Order);
      } catch (err) {
        console.error("Supabase getOrderById error:", err);
      }
    }

    const found = (globalStore.__bmgh_orders || []).find((o) => o.id === cleanId);
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
          saveToDisk();
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
    saveToDisk();
    return newOrder;
  },

  async updateOrderStatus(
    orderIdOrRef: string,
    statusOrDelivery: Order["status"] | string,
    datamartResponse?: any,
    options?: { payment_status?: string; delivery_status?: string }
  ): Promise<Order | null> {
    const validDeliveryStatuses = [
      "pending",
      "waiting",
      "processing",
      "completed",
      "delivered",
      "failed",
      "refunded",
      "cancelled",
    ];
    const cleaned = (statusOrDelivery || "").toLowerCase().trim();
    const isDeliveryStatus = validDeliveryStatuses.includes(cleaned);
    
    // Normalize target delivery status
    const targetDeliveryStatus = options?.delivery_status
      ? options.delivery_status.toLowerCase().trim()
      : isDeliveryStatus
      ? cleaned
      : undefined;

    // Both status and delivery_status track the current state
    const normalizedStatus = targetDeliveryStatus || cleaned || "pending";
    const targetPaymentStatus = options?.payment_status;

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const trimmed = (orderIdOrRef || "").trim();
        const isExplicitRef = /^(BMGH|BIGJ)-/i.test(trimmed);
        const updatePayload: any = {
          status: normalizedStatus,
          ...(datamartResponse ? { datamart_response: datamartResponse } : {}),
          ...(targetDeliveryStatus ? { delivery_status: targetDeliveryStatus } : {}),
          ...(targetPaymentStatus ? { payment_status: targetPaymentStatus } : {}),
        };

        // Try primary query: by reference if explicitly BMGH/BIGJ, otherwise by id
        let query = supabaseAdmin.from("orders").update(updatePayload);
        let { data, error } = isExplicitRef
          ? await query.ilike("reference", trimmed).select().maybeSingle()
          : await query.eq("id", trimmed).select().maybeSingle();

        // If not found by primary, try the alternative
        if (!data) {
          const altQuery = supabaseAdmin.from("orders").update(updatePayload);
          const altRes = isExplicitRef
            ? await altQuery.eq("id", trimmed).select().maybeSingle()
            : await altQuery.ilike("reference", trimmed).select().maybeSingle();
          if (altRes.data) {
            data = altRes.data;
            error = null;
          }
        }

        // Handle missing schema columns if delivery_status or payment_status columns don't exist in Supabase
        if (error && (error.message?.includes("delivery_status") || error.message?.includes("payment_status"))) {
          const fallbackPayload: any = {
            status: normalizedStatus,
            ...(datamartResponse ? { datamart_response: datamartResponse } : {}),
          };
          const fallbackQuery = supabaseAdmin.from("orders").update(fallbackPayload);
          const fallbackRes = isExplicitRef
            ? await fallbackQuery.ilike("reference", trimmed).select().maybeSingle()
            : await fallbackQuery.eq("id", trimmed).select().maybeSingle();
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (!error && data) {
          const ord = normalizeOrder(data as Order);
          const idx = (globalStore.__bmgh_orders || []).findIndex(
            (o) => o.id === ord.id || o.reference.toLowerCase() === ord.reference.toLowerCase()
          );
          if (idx !== -1) {
            globalStore.__bmgh_orders![idx] = ord;
          } else {
            globalStore.__bmgh_orders = [ord, ...(globalStore.__bmgh_orders || [])];
          }
          saveToDisk();
          return ord;
        }
      } catch (err) {
        console.error("Supabase updateOrderStatus error:", err);
      }
    }

    const order = (globalStore.__bmgh_orders || []).find(
      (o) => o.id === orderIdOrRef || o.reference.toLowerCase() === orderIdOrRef.toLowerCase()
    );
    if (!order) return null;
    order.status = normalizedStatus;
    if (targetDeliveryStatus) order.delivery_status = targetDeliveryStatus;
    if (targetPaymentStatus) order.payment_status = targetPaymentStatus;
    if (datamartResponse) order.datamart_response = datamartResponse;
    saveToDisk();
    return normalizeOrder(order);
  },

  // MESSAGES
  async getMessages(sessionId?: string): Promise<Message[]> {
    let supabaseMsgs: Message[] = [];
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let query = supabaseAdmin.from("messages").select("*").order("created_at", { ascending: false });
        if (sessionId) {
          query = query.eq("session_id", sessionId);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          supabaseMsgs = data as Message[];
        }
      } catch (err) {
        console.error("Supabase getMessages error:", err);
      }
    }

    // Merge with local disk/memory messages to prevent ANY chat loss
    const localMsgs = globalStore.__bmgh_messages || [];
    const filteredLocal = sessionId
      ? localMsgs.filter((m) => m.session_id === sessionId)
      : localMsgs;

    // Combine Supabase and local, deduplicating by ID
    const mergedMap = new Map<string, Message>();
    for (const m of supabaseMsgs) {
      mergedMap.set(m.id, m);
    }
    for (const m of filteredLocal) {
      if (!mergedMap.has(m.id)) {
        mergedMap.set(m.id, m);
      } else {
        const existing = mergedMap.get(m.id)!;
        if (m.ai_reply && !existing.ai_reply) existing.ai_reply = m.ai_reply;
        if (m.ai_replied_at && !existing.ai_replied_at) existing.ai_replied_at = m.ai_replied_at;
        if (m.reply && !existing.reply) existing.reply = m.reply;
        if (m.replied_at && !existing.replied_at) existing.replied_at = m.replied_at;
      }
    }

    const result = Array.from(mergedMap.values());
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  },

  async createMessage(msg: Omit<Message, "id" | "is_read" | "created_at">): Promise<Message> {
    const newMsg: Message = {
      ...msg,
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "msg-" + Math.random().toString(36).substring(2, 9),
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Save to memory & disk immediately
    globalStore.__bmgh_messages = [newMsg, ...(globalStore.__bmgh_messages || [])];
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("messages").insert([{
          id: newMsg.id,
          name: newMsg.name,
          phone: newMsg.phone,
          message: newMsg.message,
          image_url: newMsg.image_url,
          session_id: newMsg.session_id,
          is_read: newMsg.is_read,
          created_at: newMsg.created_at,
        }]).select().single();
        if (!error && data) {
          const idx = globalStore.__bmgh_messages.findIndex((x) => x.id === newMsg.id);
          if (idx !== -1) globalStore.__bmgh_messages[idx] = data as Message;
          saveToDisk();
          return data as Message;
        }
      } catch (err) {
        console.error("Supabase createMessage error:", err);
      }
    }

    return newMsg;
  },

  async replyMessage(id: string, replyText: string): Promise<Message | null> {
    const replied_at = new Date().toISOString();

    const localMsg = (globalStore.__bmgh_messages || []).find((m) => m.id === id);
    if (localMsg) {
      localMsg.reply = replyText;
      localMsg.replied_at = replied_at;
      localMsg.is_read = true;
      saveToDisk();
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("messages")
          .update({ reply: replyText, replied_at, is_read: true })
          .eq("id", id)
          .select()
          .single();
        if (!error && data) {
          if (localMsg) {
            Object.assign(localMsg, data);
            saveToDisk();
          }
          return data as Message;
        }
      } catch (err) {
        console.error("Supabase replyMessage error:", err);
      }
    }

    return localMsg || null;
  },

  async saveAIReply(id: string, aiReplyText: string): Promise<Message | null> {
    const ai_replied_at = new Date().toISOString();

    const localMsg = (globalStore.__bmgh_messages || []).find((m) => m.id === id);
    if (localMsg) {
      localMsg.ai_reply = aiReplyText;
      localMsg.ai_replied_at = ai_replied_at;
      saveToDisk();
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("messages")
          .update({ ai_reply: aiReplyText, ai_replied_at })
          .eq("id", id)
          .select()
          .single();
        if (!error && data) {
          if (localMsg) {
            Object.assign(localMsg, data);
            saveToDisk();
          }
          return data as Message;
        }
      } catch (err) {
        console.error("Supabase saveAIReply error:", err);
      }
    }

    return localMsg || null;
  },

  async markMessageRead(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("messages").update({ is_read: true }).eq("id", id);
      } catch (err) {
        console.error("Supabase markMessageRead error:", err);
      }
    }
    const msg = globalStore.__bmgh_messages!.find((m) => m.id === id);
    if (msg) msg.is_read = true;
    saveToDisk();
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
    const now = new Date();
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("vouchers")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (!error && data) {
          const valid = (data as Voucher[]).find((v) => {
            if (!v.is_active || v.claimed_count >= v.max_claims) return false;
            if (v.expires_at && new Date(v.expires_at) < now) return false;
            return true;
          });
          if (valid) return valid;
        }
      } catch (err) {
        console.error("Supabase getActiveVoucher error:", err);
      }
    }
    return (
      (globalStore.__bmgh_vouchers || []).find((v) => {
        if (!v.is_active || v.claimed_count >= v.max_claims) return false;
        if (v.expires_at && new Date(v.expires_at) < now) return false;
        return true;
      }) || null
    );
  },

  async createVoucher(voucher: Omit<Voucher, "id" | "claimed_count" | "created_at">): Promise<Voucher> {
    const newVoucher: Voucher = {
      ...voucher,
      id: crypto.randomUUID(),
      code: voucher.code.trim().toUpperCase(),
      claimed_count: 0,
      expires_at: voucher.expires_at || null,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("vouchers").insert([newVoucher]).select().single();
        if (!error && data) {
          if (!globalStore.__bmgh_vouchers) globalStore.__bmgh_vouchers = [];
          globalStore.__bmgh_vouchers.unshift(data as Voucher);
          saveToDisk();
          return data as Voucher;
        }
      } catch (err) {
        console.error("Supabase createVoucher error:", err);
      }
    }

    if (!globalStore.__bmgh_vouchers) globalStore.__bmgh_vouchers = [];
    globalStore.__bmgh_vouchers.unshift(newVoucher);
    saveToDisk();
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
    saveToDisk();
    return true;
  },

  async toggleAllVouchers(is_active: boolean): Promise<boolean> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("vouchers").update({ is_active });
      } catch (err) {
        console.error("Supabase toggleAllVouchers error:", err);
      }
    }
    (globalStore.__bmgh_vouchers || []).forEach((v) => {
      v.is_active = is_active;
    });
    saveToDisk();
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
    saveToDisk();
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

  // ================= AGENT STORE METHODS =================
  async getAgentStoreConfig(): Promise<AgentStoreConfig> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("store_name, announcement_text")
          .eq("id", "agent_store_config")
          .maybeSingle();
        if (data && data.store_name) {
          let developer_master_enabled = false;
          let admin_enabled = true;
          let custom_domain = "";
          try {
            if (data.store_name.startsWith("{")) {
              const parsed = JSON.parse(data.store_name);
              developer_master_enabled = parsed.developer_master_enabled ?? false;
              admin_enabled = parsed.admin_enabled ?? true;
              custom_domain = parsed.custom_domain || "";
            } else {
              developer_master_enabled = data.store_name === "true" || data.store_name === "1";
              admin_enabled = developer_master_enabled;
            }
          } catch {
            developer_master_enabled = data.store_name === "true";
            admin_enabled = developer_master_enabled;
          }

          const is_enabled = Boolean(developer_master_enabled && admin_enabled);
          const registration_fee = Number(data.announcement_text) || 0;
          globalStore.__bmgh_agent_config = {
            is_enabled,
            developer_master_enabled,
            admin_enabled,
            registration_fee,
            custom_domain,
          };
          return globalStore.__bmgh_agent_config;
        }
      } catch (err) {
        // Fallback to local
      }
    }
    const current = globalStore.__bmgh_agent_config;
    if (current) {
      const devMaster = current.developer_master_enabled ?? false;
      const adminEn = current.admin_enabled ?? true;
      current.is_enabled = Boolean(devMaster && adminEn);
      return current;
    }
    return {
      is_enabled: false,
      developer_master_enabled: false,
      admin_enabled: true,
      registration_fee: 0,
      custom_domain: "",
    };
  },

  async updateAgentStoreConfig(config: Partial<AgentStoreConfig>): Promise<AgentStoreConfig> {
    const current = await this.getAgentStoreConfig();

    let developer_master_enabled =
      config.developer_master_enabled !== undefined
        ? Boolean(config.developer_master_enabled)
        : current.developer_master_enabled ?? false;

    let admin_enabled =
      config.admin_enabled !== undefined
        ? Boolean(config.admin_enabled)
        : current.admin_enabled ?? true;

    let custom_domain =
      config.custom_domain !== undefined
        ? config.custom_domain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "")
        : current.custom_domain || "";

    // If caller specifically set is_enabled directly without specifying master:
    if (config.developer_master_enabled === undefined && config.admin_enabled === undefined && config.is_enabled !== undefined) {
      // Default direct caller to admin_enabled, respecting master lock
      admin_enabled = Boolean(config.is_enabled);
    }

    const is_enabled = Boolean(developer_master_enabled && admin_enabled);
    const registration_fee =
      config.registration_fee !== undefined
        ? Number(config.registration_fee)
        : current.registration_fee || 0;

    globalStore.__bmgh_agent_config = {
      is_enabled,
      developer_master_enabled,
      admin_enabled,
      registration_fee,
      custom_domain,
    };
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agent_store_config",
          store_name: JSON.stringify({ developer_master_enabled, admin_enabled, custom_domain }),
          announcement_text: String(registration_fee),
        });
      } catch (err) {
        console.warn("Agent store config Supabase save error:", err);
      }
    }

    return globalStore.__bmgh_agent_config;
  },

  async getAgentBaseProducts(): Promise<AgentBaseProduct[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Try direct agent_base_products table
      try {
        const { data: directBase, error: dbErr } = await supabaseAdmin
          .from("agent_base_products")
          .select("*");
        if (!dbErr && Array.isArray(directBase) && directBase.length > 0) {
          const mapped: AgentBaseProduct[] = directBase.map((b: any) => ({
            id: b.id,
            network: b.network,
            size: b.size,
            base_price: Number(b.base_price),
            suggested_price: b.suggested_price ? Number(b.suggested_price) : Number(b.base_price) + 1.0,
            is_active: b.is_active !== false,
            created_at: b.created_at || new Date().toISOString(),
          }));
          globalStore.__bmgh_agent_base_products = mapped;
          return mapped;
        }
      } catch {}

      // 2. Try settings row
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "agent_base_products_config")
          .maybeSingle();
        if (data?.announcement_text) {
          try {
            const list = JSON.parse(data.announcement_text);
            if (Array.isArray(list) && list.length > 0) {
              globalStore.__bmgh_agent_base_products = list;
              return list;
            }
          } catch {}
        }
      } catch (err) {
        console.warn("Base products Supabase fetch error:", err);
      }
    }

    const current =
      globalStore.__bmgh_agent_base_products && globalStore.__bmgh_agent_base_products.length > 0
        ? globalStore.__bmgh_agent_base_products
        : initialAgentBaseProducts;
    globalStore.__bmgh_agent_base_products = current;
    return current;
  },

  async createAgentBaseProduct(p: Omit<AgentBaseProduct, "id" | "created_at">): Promise<AgentBaseProduct> {
    const list = await this.getAgentBaseProducts();
    const newProduct: AgentBaseProduct = {
      ...p,
      id: "abp-" + crypto.randomUUID().slice(0, 8),
      created_at: new Date().toISOString(),
    };
    list.push(newProduct);
    globalStore.__bmgh_agent_base_products = list;
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("agent_base_products").upsert({
          id: newProduct.id,
          network: newProduct.network,
          size: newProduct.size,
          base_price: newProduct.base_price,
          suggested_price: newProduct.suggested_price,
          is_active: newProduct.is_active,
        });
      } catch {}

      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agent_base_products_config",
          store_name: "AgentBaseProductsConfig",
          support_phone: "+233551234567",
          whatsapp_number: "233551234567",
          email: "support@bundlemartgh.com",
          announcement_text: JSON.stringify(list),
        });
      } catch (err) {
        console.warn("Agent base products Supabase save error:", err);
      }
    }

    return newProduct;
  },

  async updateAgentBaseProduct(id: string, updates: Partial<AgentBaseProduct>): Promise<AgentBaseProduct | null> {
    const list = await this.getAgentBaseProducts();
    const idx = list.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    globalStore.__bmgh_agent_base_products = list;
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("agent_base_products").upsert({
          id: list[idx].id,
          network: list[idx].network,
          size: list[idx].size,
          base_price: list[idx].base_price,
          suggested_price: list[idx].suggested_price,
          is_active: list[idx].is_active,
        });
      } catch {}

      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agent_base_products_config",
          store_name: "AgentBaseProductsConfig",
          support_phone: "+233551234567",
          whatsapp_number: "233551234567",
          email: "support@bundlemartgh.com",
          announcement_text: JSON.stringify(list),
        });
      } catch (err) {
        console.warn("Agent base products Supabase update error:", err);
      }
    }

    // Also update base price in any custom agent products
    if (updates.base_price !== undefined) {
      const newBasePrice = Number(updates.base_price);
      if (globalStore.__bmgh_agent_products && globalStore.__bmgh_agent_products.length > 0) {
        let changed = false;
        globalStore.__bmgh_agent_products.forEach((ap) => {
          if (ap.base_product_id === id) {
            ap.base_price = newBasePrice;
            changed = true;
          }
        });
        if (changed) {
          saveToDisk();
          if (isSupabaseConfigured && supabaseAdmin) {
            try {
              await supabaseAdmin.from("settings").upsert({
                id: "agent_products_registry_config",
                store_name: "AgentProductsRegistry",
                support_phone: "+233551234567",
                whatsapp_number: "233551234567",
                email: "support@bundlemartgh.com",
                announcement_text: JSON.stringify(globalStore.__bmgh_agent_products),
              });
            } catch {}
          }
        }
      }
    }

    return list[idx];
  },

  async deleteAgentBaseProduct(id: string): Promise<boolean> {
    const list = await this.getAgentBaseProducts();
    const filtered = list.filter((x) => x.id !== id);
    globalStore.__bmgh_agent_base_products = filtered;
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agent_base_products_config",
          announcement_text: JSON.stringify(filtered),
        });
      } catch (err) {
        console.warn("Agent base products Supabase delete error:", err);
      }
    }

    return true;
  },

  // AGENTS
  async getAgents(): Promise<Agent[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "agents_registry_config")
          .maybeSingle();
        if (data?.announcement_text) {
          try {
            const list = JSON.parse(data.announcement_text);
            if (Array.isArray(list) && list.length > 0) {
              initialAgents.forEach((ia) => {
                if (!list.some((a: any) => a.id === ia.id || a.store_slug === ia.store_slug)) {
                  list.push(ia);
                }
              });
              globalStore.__bmgh_agents = list;
              return list;
            }
          } catch {}
        }
      } catch (err) {
        // fallback
      }
    }
    const current = globalStore.__bmgh_agents || [];
    initialAgents.forEach((ia) => {
      if (!current.some((a) => a.id === ia.id || a.store_slug === ia.store_slug)) {
        current.push(ia);
      }
    });
    globalStore.__bmgh_agents = current;
    return current;
  },

  async getAgentById(id: string): Promise<Agent | null> {
    const all = await this.getAgents();
    const found = all.find((a) => a.id === id) || null;
    if (found) {
      try {
        const orders = await this.getAgentOrders(found.id);
        const earned = orders
          .filter((o) => o.payment_status === "paid")
          .reduce((sum, o) => sum + (Number(o.agent_profit) || 0), 0);
        const withdrawals = await this.getAgentWithdrawals(found.id);
        const withdrawn = withdrawals
          .filter((w) => w.status === "completed")
          .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
        found.total_earned = Number(earned.toFixed(2));
        found.total_withdrawn = Number(withdrawn.toFixed(2));
        found.wallet_balance = Number(Math.max(0, earned - withdrawn).toFixed(2));
      } catch {}
    }
    return found;
  },

  async getAgentBySlug(slug: string): Promise<Agent | null> {
    const clean = slug.toLowerCase().trim();
    const all = await this.getAgents();
    const found = all.find((a) => a.store_slug.toLowerCase() === clean);
    if (found) return found;
    if (clean === "stony") return initialAgents[0];
    return null;
  },

  async getAgentByEmail(email: string): Promise<Agent | null> {
    const clean = email.toLowerCase().trim();
    const all = await this.getAgents();
    return all.find((a) => a.email.toLowerCase() === clean) || null;
  },

  async getAgentByPhone(phone: string): Promise<Agent | null> {
    const clean = phone.replace(/[^0-9]/g, "");
    const all = await this.getAgents();
    return all.find((a) => a.phone.replace(/[^0-9]/g, "").endsWith(clean.slice(-9))) || null;
  },

  async createAgent(agentData: Omit<Agent, "id" | "wallet_balance" | "total_earned" | "total_withdrawn" | "created_at">): Promise<Agent> {
    const newAgent: Agent = {
      ...agentData,
      id: "agent-" + crypto.randomUUID().slice(0, 8),
      store_slug: agentData.store_slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "-"),
      wallet_balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Auto-generate cloaked neutral link so bundlemartgh.com never shows in customer links
    let cloaked_url = agentData.cloaked_url || "";
    if (!cloaked_url) {
      try {
        const config = await this.getAgentStoreConfig();
        const baseOrigin = config.custom_domain
          ? `https://${config.custom_domain.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`
          : process.env.NEXT_PUBLIC_BASE_URL || "https://www.bundlemartgh.com";
        const target = `${baseOrigin.replace(/\/+$/, "")}/s/${newAgent.store_slug}`;
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(target)}`, {
          signal: AbortSignal.timeout(3500),
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.startsWith("http")) {
            cloaked_url = text.trim();
          }
        }
      } catch {}
    }
    newAgent.cloaked_url = cloaked_url;

    if (!globalStore.__bmgh_agents) globalStore.__bmgh_agents = [];
    globalStore.__bmgh_agents.unshift(newAgent);

    // Initialize custom products with suggested prices from base products
    const baseProducts = await this.getAgentBaseProducts();

    if (!globalStore.__bmgh_agent_products) globalStore.__bmgh_agent_products = [];
    baseProducts.forEach((bp) => {
      globalStore.__bmgh_agent_products!.push({
        id: "acp-" + crypto.randomUUID().slice(0, 8),
        agent_id: newAgent.id,
        base_product_id: bp.id,
        network: bp.network,
        size: bp.size,
        base_price: bp.base_price,
        selling_price: bp.suggested_price || bp.base_price + 1.0,
        is_active: bp.is_active,
      });
    });

    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await Promise.all([
          supabaseAdmin.from("settings").upsert({
            id: "agents_registry_config",
            announcement_text: JSON.stringify(globalStore.__bmgh_agents),
          }),
          supabaseAdmin.from("settings").upsert({
            id: "agent_products_registry_config",
            announcement_text: JSON.stringify(globalStore.__bmgh_agent_products),
          }),
        ]);
      } catch (err) {
        console.warn("Agents registry save error:", err);
      }
    }

    return newAgent;
  },

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
    const agents = globalStore.__bmgh_agents || [];
    const idx = agents.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    agents[idx] = { ...agents[idx], ...updates };
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agents_registry_config",
          store_name: "AgentsRegistry",
          support_phone: "+233551234567",
          whatsapp_number: "233551234567",
          email: "support@bundlemartgh.com",
          announcement_text: JSON.stringify(globalStore.__bmgh_agents),
        });
      } catch (err) {
        console.warn("Agents registry update error:", err);
      }
    }

    return agents[idx];
  },

  // AGENT CUSTOM PRODUCTS
  async getAgentProducts(agentId: string): Promise<AgentCustomProduct[]> {
    const baseProducts = await this.getAgentBaseProducts();
    const productMap = new Map<string, AgentCustomProduct>();

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. First, read direct agent_products table as the base layer
      try {
        const { data: directProds, error: dpErr } = await supabaseAdmin
          .from("agent_products")
          .select("*")
          .eq("agent_id", agentId);
        if (!dpErr && Array.isArray(directProds) && directProds.length > 0) {
          directProds.forEach((dp: any) => {
            productMap.set(dp.base_product_id, {
              id: dp.id,
              agent_id: dp.agent_id,
              base_product_id: dp.base_product_id,
              network: dp.network,
              size: dp.size,
              base_price: Number(dp.base_price),
              selling_price: Number(dp.selling_price),
              is_active: dp.is_active !== false,
            });
          });
        }
      } catch {}

      // 2. OVERLAY with settings config row
      // This MUST run after agent_products table so custom retail prices saved by the agent in their dashboard always win and are never clobbered by older rows!
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "agent_products_registry_config")
          .maybeSingle();
        if (data?.announcement_text) {
          try {
            const list = JSON.parse(data.announcement_text);
            if (Array.isArray(list)) {
              globalStore.__bmgh_agent_products = list;
              list
                .filter((p: any) => p.agent_id === agentId)
                .forEach((p: any) => {
                  productMap.set(p.base_product_id, {
                    id: p.id,
                    agent_id: p.agent_id,
                    base_product_id: p.base_product_id,
                    network: p.network,
                    size: p.size,
                    base_price: Number(p.base_price),
                    selling_price: Number(p.selling_price),
                    is_active: p.is_active !== false,
                  });
                });
            }
          } catch {}
        }
      } catch (err) {}
    }

    // 3. Fallback to memory store if productMap is missing entries
    if (globalStore.__bmgh_agent_products) {
      globalStore.__bmgh_agent_products
        .filter((p) => p.agent_id === agentId)
        .forEach((p) => {
          if (!productMap.has(p.base_product_id)) {
            productMap.set(p.base_product_id, p);
          }
        });
    }

    // 4. Ensure ALL base products exist in the catalog
    let hasChanges = false;
    baseProducts.forEach((bp) => {
      const existing = productMap.get(bp.id);
      if (!existing) {
        const added: AgentCustomProduct = {
          id: "acp-" + crypto.randomUUID().slice(0, 8),
          agent_id: agentId,
          base_product_id: bp.id,
          network: bp.network,
          size: bp.size,
          base_price: bp.base_price,
          selling_price: bp.suggested_price || bp.base_price + 1.0,
          is_active: bp.is_active,
        };
        productMap.set(bp.id, added);
        hasChanges = true;
      } else {
        if (existing.base_price !== bp.base_price) {
          existing.base_price = bp.base_price;
          hasChanges = true;
        }
      }
    });

    const result = Array.from(productMap.values());

    // Update globalStore cache
    if (!globalStore.__bmgh_agent_products) globalStore.__bmgh_agent_products = [];
    globalStore.__bmgh_agent_products = [
      ...globalStore.__bmgh_agent_products.filter((p) => p.agent_id !== agentId),
      ...result,
    ];

    if (hasChanges) {
      saveToDisk();
      if (isSupabaseConfigured && supabaseAdmin) {
        try {
          await supabaseAdmin.from("settings").upsert({
            id: "agent_products_registry_config",
            store_name: "AgentProductsRegistry",
            support_phone: "+233551234567",
            whatsapp_number: "233551234567",
            email: "support@bundlemartgh.com",
            announcement_text: JSON.stringify(globalStore.__bmgh_agent_products),
          });
        } catch {}
      }
    }

    return result;
  },

  async updateAgentProduct(
    agentId: string,
    baseProductId: string,
    sellingPrice: number,
    isActive: boolean
  ): Promise<AgentCustomProduct | null> {
    // 1. Ensure latest catalog for this agent is loaded
    await this.getAgentProducts(agentId);

    const baseProducts = await this.getAgentBaseProducts();
    const bp = baseProducts.find((b) => b.id === baseProductId);

    const list = globalStore.__bmgh_agent_products || [];
    let item = list.find((p) => p.agent_id === agentId && p.base_product_id === baseProductId);
    const numPrice = Number(sellingPrice);
    const validSellingPrice =
      !isNaN(numPrice) && numPrice > 0
        ? numPrice
        : bp
        ? bp.suggested_price || bp.base_price + 1.0
        : 5.0;

    if (!item) {
      if (!bp) return null;
      item = {
        id: "acp-" + crypto.randomUUID().slice(0, 8),
        agent_id: agentId,
        base_product_id: bp.id,
        network: bp.network,
        size: bp.size,
        base_price: bp.base_price,
        selling_price: validSellingPrice,
        is_active: isActive,
      };
      list.push(item);
    } else {
      if (bp) {
        item.base_price = bp.base_price;
      }
      item.selling_price = validSellingPrice;
      item.is_active = isActive;
    }

    globalStore.__bmgh_agent_products = list;
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Save to settings config row first (guaranteed single source of truth across Vercel serverless)
      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agent_products_registry_config",
          store_name: "AgentProductsRegistry",
          support_phone: "+233551234567",
          whatsapp_number: "233551234567",
          email: "support@bundlemartgh.com",
          announcement_text: JSON.stringify(globalStore.__bmgh_agent_products),
        });
      } catch (err) {
        console.warn("Agent custom products Supabase settings update error:", err);
      }

      // 2. Cleanly synchronize direct agent_products table: delete any stale rows for this item, then re-insert
      try {
        await supabaseAdmin
          .from("agent_products")
          .delete()
          .eq("agent_id", agentId)
          .eq("base_product_id", baseProductId);

        await supabaseAdmin.from("agent_products").insert({
          id: item.id,
          agent_id: agentId,
          base_product_id: baseProductId,
          network: item.network,
          size: item.size,
          base_price: item.base_price,
          selling_price: item.selling_price,
          is_active: item.is_active,
        });
      } catch (directErr) {
        console.warn("Direct agent_products table sync warning:", directErr);
      }
    }

    return item;
  },

  // AGENT ORDERS
  async getAgentOrders(agentId?: string): Promise<AgentOrder[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Try direct agent_orders table
      try {
        let query = supabaseAdmin
          .from("agent_orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (agentId) query = query.eq("agent_id", agentId);
        const { data: dbOrders, error: dbErr } = await query;
        if (!dbErr && Array.isArray(dbOrders) && dbOrders.length > 0) {
          const mapped: AgentOrder[] = dbOrders.map((o: any) => ({
            id: o.id,
            agent_id: o.agent_id,
            reference: o.reference,
            network: o.network,
            package_size: o.package_size,
            phone: o.phone,
            amount: Number(o.amount),
            base_price: Number(o.base_price),
            agent_profit: Number(o.agent_profit),
            paystack_ref: o.paystack_ref,
            payment_status: o.payment_status || "paid",
            delivery_status: o.delivery_status || "pending",
            status: o.status || "pending",
            datamart_response: o.datamart_response,
            created_at: o.created_at,
          }));
          globalStore.__bmgh_agent_orders = mapped;
          return mapped;
        }
      } catch {}

      // 2. Try settings registry config
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "agent_orders_registry_config")
          .maybeSingle();
        if (data?.announcement_text) {
          try {
            const list = JSON.parse(data.announcement_text);
            if (Array.isArray(list) && list.length > 0) {
              globalStore.__bmgh_agent_orders = list;
              return agentId ? list.filter((o: any) => o.agent_id === agentId) : list;
            }
          } catch {}
        }
      } catch (err) {}

      // 3. Fallback: Search master orders table for orders placed through agent store
      if (agentId) {
        try {
          const { data: masterOrders } = await supabaseAdmin
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });
          if (Array.isArray(masterOrders) && masterOrders.length > 0) {
            const agentMatching = masterOrders.filter(
              (mo: any) =>
                mo.datamart_response?.agent_id === agentId ||
                (mo.reference && (mo.reference.startsWith("STON-") || mo.reference.startsWith("DATA-")))
            );
            if (agentMatching.length > 0) {
              const converted: AgentOrder[] = agentMatching.map((mo: any) => ({
                id: "agord-" + mo.id,
                agent_id: agentId,
                reference: mo.reference,
                network: mo.network,
                package_size: mo.package_size,
                phone: mo.phone,
                amount: Number(mo.amount),
                base_price: Number(mo.datamart_response?.base_price || 0.02),
                agent_profit: Number(
                  mo.datamart_response?.agent_profit !== undefined
                    ? mo.datamart_response.agent_profit
                    : Math.max(0, Number(mo.amount) - 0.02)
                ),
                paystack_ref: mo.paystack_ref,
                payment_status: mo.payment_status || "paid",
                delivery_status: mo.delivery_status || "delivered",
                status: mo.status || "delivered",
                datamart_response: mo.datamart_response,
                created_at: mo.created_at,
              }));
              return converted;
            }
          }
        } catch {}
      }
    }

    const orders = globalStore.__bmgh_agent_orders || [];
    if (agentId) return orders.filter((o) => o.agent_id === agentId);
    return orders;
  },

  async createAgentOrder(orderData: Omit<AgentOrder, "id" | "created_at">): Promise<AgentOrder> {
    const newOrder: AgentOrder = {
      ...orderData,
      id: "agord-" + crypto.randomUUID().slice(0, 8),
      created_at: new Date().toISOString(),
    };

    // 1. Ensure agents are loaded
    const agents = await this.getAgents();
    const agent = agents.find((a) => a.id === newOrder.agent_id);

    // If order is paid, automatically credit the agent's wallet
    if (newOrder.payment_status === "paid" && newOrder.agent_profit > 0 && agent) {
      agent.wallet_balance = Number((agent.wallet_balance + newOrder.agent_profit).toFixed(2));
      agent.total_earned = Number((agent.total_earned + newOrder.agent_profit).toFixed(2));
    }

    // 2. Ensure in-memory cache is populated
    if (!globalStore.__bmgh_agent_orders) globalStore.__bmgh_agent_orders = [];
    globalStore.__bmgh_agent_orders.unshift(newOrder);

    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Direct agent_orders table
      try {
        await supabaseAdmin.from("agent_orders").upsert({
          id: newOrder.id,
          agent_id: newOrder.agent_id,
          reference: newOrder.reference,
          network: newOrder.network,
          package_size: newOrder.package_size,
          phone: newOrder.phone,
          amount: newOrder.amount,
          base_price: newOrder.base_price,
          agent_profit: newOrder.agent_profit,
          paystack_ref: newOrder.paystack_ref,
          payment_status: newOrder.payment_status,
          delivery_status: newOrder.delivery_status,
          status: newOrder.status,
          datamart_response: newOrder.datamart_response || {},
          created_at: newOrder.created_at,
        });
      } catch {}

      // 2. Direct agents table update
      if (agent) {
        try {
          await supabaseAdmin.from("agents").update({
            wallet_balance: agent.wallet_balance,
            total_earned: agent.total_earned,
          }).eq("id", agent.id);
        } catch {}
      }

      // 3. Settings table registry fallbacks
      try {
        await Promise.all([
          supabaseAdmin.from("settings").upsert({
            id: "agent_orders_registry_config",
            store_name: "AgentOrdersRegistry",
            support_phone: "+233551234567",
            whatsapp_number: "233551234567",
            email: "support@bundlemartgh.com",
            announcement_text: JSON.stringify(globalStore.__bmgh_agent_orders),
          }),
          supabaseAdmin.from("settings").upsert({
            id: "agents_registry_config",
            store_name: "AgentsRegistry",
            support_phone: "+233551234567",
            whatsapp_number: "233551234567",
            email: "support@bundlemartgh.com",
            announcement_text: JSON.stringify(globalStore.__bmgh_agents),
          }),
        ]);
      } catch (err) {}
    }

    return newOrder;
  },

  async updateAgentOrderStatus(orderId: string, deliveryStatus: string, response?: any): Promise<AgentOrder | null> {
    const orders = await this.getAgentOrders();
    const o = orders.find((x) => x.id === orderId || x.reference === orderId);
    if (o) {
      o.delivery_status = deliveryStatus;
      o.status = deliveryStatus;
      if (response) o.datamart_response = response;
    }
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin
          .from("agent_orders")
          .update({
            delivery_status: deliveryStatus,
            status: deliveryStatus,
            datamart_response: response || {},
          })
          .or(`id.eq.${orderId},reference.eq.${orderId}`);
      } catch {}

      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agent_orders_registry_config",
          store_name: "AgentOrdersRegistry",
          support_phone: "+233551234567",
          whatsapp_number: "233551234567",
          email: "support@bundlemartgh.com",
          announcement_text: JSON.stringify(globalStore.__bmgh_agent_orders || []),
        });
      } catch (err) {}
    }

    return o || null;
  },

  // AGENT WITHDRAWALS
  async getAgentWithdrawals(agentId?: string): Promise<AgentWithdrawal[]> {
    if (isSupabaseConfigured && supabaseAdmin && (!globalStore.__bmgh_agent_withdrawals || globalStore.__bmgh_agent_withdrawals.length === 0)) {
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "agent_withdrawals_registry_config")
          .maybeSingle();
        if (data?.announcement_text) {
          try {
            const list = JSON.parse(data.announcement_text);
            if (Array.isArray(list)) globalStore.__bmgh_agent_withdrawals = list;
          } catch {}
        }
      } catch (err) {}
    }

    const list = globalStore.__bmgh_agent_withdrawals || [];
    if (agentId) return list.filter((w) => w.agent_id === agentId);
    return list;
  },

  async createAgentWithdrawal(w: Omit<AgentWithdrawal, "id" | "status" | "verified" | "created_at">): Promise<AgentWithdrawal> {
    const newWithdrawal: AgentWithdrawal = {
      ...w,
      id: "wd-" + crypto.randomUUID().slice(0, 8),
      status: "pending",
      verified: true,
      created_at: new Date().toISOString(),
    };
    if (!globalStore.__bmgh_agent_withdrawals) globalStore.__bmgh_agent_withdrawals = [];
    globalStore.__bmgh_agent_withdrawals.unshift(newWithdrawal);

    // Deduct from agent wallet
    const agent = (globalStore.__bmgh_agents || []).find((a) => a.id === w.agent_id);
    if (agent) {
      agent.wallet_balance = Math.max(0, Number((agent.wallet_balance - w.amount).toFixed(2)));
      agent.total_withdrawn = Number((agent.total_withdrawn + w.amount).toFixed(2));
    }

    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await Promise.all([
          supabaseAdmin.from("settings").upsert({
            id: "agent_withdrawals_registry_config",
            announcement_text: JSON.stringify(globalStore.__bmgh_agent_withdrawals),
          }),
          supabaseAdmin.from("settings").upsert({
            id: "agents_registry_config",
            announcement_text: JSON.stringify(globalStore.__bmgh_agents),
          }),
        ]);
      } catch (err) {}
    }

    return newWithdrawal;
  },

  async updateWithdrawalStatus(id: string, status: "pending" | "completed" | "rejected", note?: string): Promise<AgentWithdrawal | null> {
    const list = globalStore.__bmgh_agent_withdrawals || [];
    const w = list.find((x) => x.id === id);
    if (!w) return null;

    if (status === "rejected" && w.status !== "rejected") {
      const agent = (globalStore.__bmgh_agents || []).find((a) => a.id === w.agent_id);
      if (agent) {
        agent.wallet_balance = Number((agent.wallet_balance + w.amount).toFixed(2));
        agent.total_withdrawn = Math.max(0, Number((agent.total_withdrawn - w.amount).toFixed(2)));
      }
    }
    w.status = status;
    if (note) w.note = note;
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await Promise.all([
          supabaseAdmin.from("settings").upsert({
            id: "agent_withdrawals_registry_config",
            announcement_text: JSON.stringify(globalStore.__bmgh_agent_withdrawals),
          }),
          supabaseAdmin.from("settings").upsert({
            id: "agents_registry_config",
            announcement_text: JSON.stringify(globalStore.__bmgh_agents),
          }),
        ]);
      } catch (err) {}
    }

    return w;
  },
};
