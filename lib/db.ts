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
  datamart_response?: any;
  source?: "web" | "agent" | "api" | "customer_wallet" | string;
  customer_id?: string;
  payment_method?: "paystack" | "momo" | "wallet" | string;
  api_key_id?: string;
  developer_name?: string;
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

  const rawSource =
    order.source ||
    order.datamart_response?.source ||
    (order.api_key_id || order.datamart_response?.api_key_id
      ? "api"
      : order.datamart_response?.agent_id
      ? "agent"
      : "web");

  const apiKeyId = order.api_key_id || order.datamart_response?.api_key_id || undefined;
  const developerName = order.developer_name || order.datamart_response?.developer_name || undefined;

  return {
    ...order,
    amount: Number(order.amount || 0),
    payment_status,
    delivery_status,
    status: status as any,
    source: rawSource,
    api_key_id: apiKeyId,
    developer_name: developerName,
  };
}

export function parsePackageSize(sizeStr: string): number {
  if (!sizeStr) return 0;
  const clean = sizeStr.trim().toUpperCase();
  const num = parseFloat(clean.replace(/[^0-9.]/g, "")) || 0;
  if (clean.includes("TB")) return num * 1024 * 1024;
  if (clean.includes("GB")) return num * 1024;
  if (clean.includes("MB")) return num;
  return num;
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
  resend_api_key?: string;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_host?: string;
  smtp_port?: number;
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
  min_orders_required?: number; // Minimum orders required to be eligible (0 = everyone)
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
}

export interface VoucherClaim {
  id: string;
  voucher_id: string;
  voucher_code: string;
  phone: string;
  customer_name?: string;
  customer_orders_count?: number;
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
  auto_paystack_payout?: boolean;
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
  login_otp?: string | null;
  login_otp_expires?: number | null;
  withdrawal_otp?: string | null;
  withdrawal_otp_expires?: number | null;
  reset_otp?: string | null;
  reset_otp_expires?: number | null;
  created_at: string;
  logo_url?: string;
  whatsapp_number?: string;
  whatsapp_channel_url?: string;
  support_email?: string;
  cloaked_url?: string;
  custom_prices?: Record<string, number>;
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
  paystack_transfer_code?: string;
  paystack_status?: string;
  created_at: string;
}

export interface DeveloperApiConfig {
  is_enabled: boolean;
  api_key_price: number;
  min_wallet_funding: number;
  notice_message?: string;
}

export interface DeveloperApiProduct {
  id: string;
  network: "mtn" | "telecel" | "at" | string;
  size: string;
  cost_price: number;
  api_price: number;
  is_active: boolean;
  created_at: string;
}

export interface DeveloperAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  api_key: string;
  balance: number;
  total_spent: number;
  total_orders: number;
  is_active: boolean;
  otp_code?: string;
  otp_expires?: number;
  created_at: string;
  last_used_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password_hash: string;
  wallet_balance: number;
  is_active: boolean;
  is_verified?: boolean;
  provider?: "local" | "google";
  google_id?: string;
  avatar_url?: string;
  verification_code?: string | null;
  verification_code_expires_at?: number | null;
  pending_new_email?: string | null;
  email_change_code?: string | null;
  email_change_expires_at?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface CustomerTransaction {
  id: string;
  customer_id: string;
  amount: number;
  type: "deposit" | "purchase" | "refund";
  reference: string;
  paystack_ref?: string;
  status: "success" | "pending" | "failed";
  description: string;
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

let initialOrders: Order[] = [];

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

const initialDeveloperApiProducts: DeveloperApiProduct[] = [
  { id: "dap-mtn-1", network: "mtn", size: "1GB", cost_price: 4.2, api_price: 4.6, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-mtn-2", network: "mtn", size: "2GB", cost_price: 8.4, api_price: 9.2, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-mtn-3", network: "mtn", size: "3GB", cost_price: 12.6, api_price: 13.8, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-mtn-5", network: "mtn", size: "5GB", cost_price: 21.0, api_price: 23.0, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-mtn-10", network: "mtn", size: "10GB", cost_price: 42.0, api_price: 46.0, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-tc-1", network: "telecel", size: "1GB", cost_price: 3.8, api_price: 4.2, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-tc-2", network: "telecel", size: "2GB", cost_price: 7.6, api_price: 8.4, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-tc-5", network: "telecel", size: "5GB", cost_price: 19.0, api_price: 21.0, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-tc-10", network: "telecel", size: "10GB", cost_price: 38.0, api_price: 42.0, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-at-1", network: "at", size: "1GB", cost_price: 3.8, api_price: 4.2, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-at-2", network: "at", size: "2GB", cost_price: 7.6, api_price: 8.4, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-at-5", network: "at", size: "5GB", cost_price: 18.5, api_price: 20.5, is_active: true, created_at: new Date().toISOString() },
  { id: "dap-at-10", network: "at", size: "10GB", cost_price: 37.0, api_price: 41.0, is_active: true, created_at: new Date().toISOString() },
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
    logo_url: "/agent-icon.png",
    password_hash: "123456",
    theme: "pearl",
    wallet_balance: 0,
    total_earned: 0,
    total_withdrawn: 0,
    is_active: true,
    registration_paid: true,
    cloaked_url: "https://tinyurl.com/265syqzn",
    created_at: "2026-10-10T10:05:54.889Z",
    custom_prices: {},
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
  __bmgh_developer_api_config?: DeveloperApiConfig;
  __bmgh_developer_api_products?: DeveloperApiProduct[];
  __bmgh_developer_accounts?: DeveloperAccount[];
  __bmgh_customers?: Customer[];
  __bmgh_customer_transactions?: CustomerTransaction[];
  __bmgh_cache_timestamps?: Record<string, number>;
  __bmgh_agents_zeroed_migrated?: boolean;
};

function saveToDisk() {
  try {
    if (typeof window === "undefined") {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const existingDisk = loadFromDisk() || {};
      const baseProdsToSave =
        Array.isArray(globalStore.__bmgh_agent_base_products) && globalStore.__bmgh_agent_base_products.length > 0
          ? globalStore.__bmgh_agent_base_products
          : existingDisk.agent_base_products || initialAgentBaseProducts;
      const agentProdsToSave =
        Array.isArray(globalStore.__bmgh_agent_products) && globalStore.__bmgh_agent_products.length > 0
          ? globalStore.__bmgh_agent_products
          : existingDisk.agent_products || [];
      const agentsToSave =
        Array.isArray(globalStore.__bmgh_agents) && globalStore.__bmgh_agents.length > 0
          ? globalStore.__bmgh_agents
          : existingDisk.agents || initialAgents;

      const dataToSave = {
        settings: globalStore.__bmgh_settings || existingDisk.settings,
        products: globalStore.__bmgh_products || existingDisk.products,
        orders: globalStore.__bmgh_orders || existingDisk.orders,
        messages: globalStore.__bmgh_messages || existingDisk.messages,
        vouchers: globalStore.__bmgh_vouchers || existingDisk.vouchers,
        voucher_claims: globalStore.__bmgh_voucher_claims || existingDisk.voucher_claims,
        agent_config: globalStore.__bmgh_agent_config || existingDisk.agent_config,
        agent_base_products: baseProdsToSave,
        agents: agentsToSave,
        agent_products: agentProdsToSave,
        agent_orders: globalStore.__bmgh_agent_orders || existingDisk.agent_orders,
        agent_withdrawals: globalStore.__bmgh_agent_withdrawals || existingDisk.agent_withdrawals,
        developer_api_config: globalStore.__bmgh_developer_api_config || existingDisk.developer_api_config,
        developer_api_products: globalStore.__bmgh_developer_api_products || existingDisk.developer_api_products,
        developer_accounts: globalStore.__bmgh_developer_accounts || existingDisk.developer_accounts,
        customers: globalStore.__bmgh_customers || existingDisk.customers,
        customer_transactions: globalStore.__bmgh_customer_transactions || existingDisk.customer_transactions,
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
  globalStore.__bmgh_agent_config = diskData?.agent_config || { 
    is_enabled: true, 
    developer_master_enabled: true,
    admin_enabled: true,
    registration_fee: 0 
  };
}
if (!globalStore.__bmgh_agent_base_products || globalStore.__bmgh_agent_base_products.length === 0) {
  globalStore.__bmgh_agent_base_products =
    diskData?.agent_base_products && diskData.agent_base_products.length > 0
      ? diskData.agent_base_products
      : initialAgentBaseProducts;
}
if (!globalStore.__bmgh_agents || globalStore.__bmgh_agents.length === 0) {
  globalStore.__bmgh_agents = (diskData?.agents && diskData.agents.length > 0) ? diskData.agents : [...initialAgents];
}
if (!globalStore.__bmgh_agent_products || globalStore.__bmgh_agent_products.length === 0) {
  globalStore.__bmgh_agent_products =
    diskData?.agent_products && diskData.agent_products.length > 0
      ? diskData.agent_products
      : [];
}
if (!globalStore.__bmgh_agent_orders) globalStore.__bmgh_agent_orders = diskData?.agent_orders || [];
if (!globalStore.__bmgh_agent_withdrawals) globalStore.__bmgh_agent_withdrawals = diskData?.agent_withdrawals || [];
if (!globalStore.__bmgh_developer_api_config) {
  globalStore.__bmgh_developer_api_config = diskData?.developer_api_config || {
    is_enabled: true,
    api_key_price: 0,
    min_wallet_funding: 10,
    notice_message: "Welcome to FastData Developer API. Automated high-speed data fulfillment.",
  };
}
if (!globalStore.__bmgh_developer_api_products) {
  globalStore.__bmgh_developer_api_products = diskData?.developer_api_products || initialDeveloperApiProducts;
}
if (!globalStore.__bmgh_developer_accounts) {
  globalStore.__bmgh_developer_accounts = diskData?.developer_accounts || [];
}
if (!globalStore.__bmgh_customers) {
  globalStore.__bmgh_customers = diskData?.customers || [];
}
if (!globalStore.__bmgh_customer_transactions) {
  globalStore.__bmgh_customer_transactions = diskData?.customer_transactions || [];
}

// ================= HIGH-PERFORMANCE EGRESS PROTECTION & SERVER TTL CACHE =================
const CACHE_TTLS = {
  settings: 30 * 60 * 1000,              // 30 minutes (invalidated on admin save)
  products: 30 * 60 * 1000,              // 30 minutes
  agent_config: 30 * 60 * 1000,          // 30 minutes
  agent_base_products: 30 * 60 * 1000,   // 30 minutes
  agents: 30 * 60 * 1000,                // 30 minutes
  agent_products: 30 * 60 * 1000,        // 30 minutes
  active_voucher: 15 * 60 * 1000,        // 15 minutes
  developer_api_config: 30 * 60 * 1000,  // 30 minutes
  developer_api_products: 30 * 60 * 1000,// 30 minutes
  orders: 60 * 1000,                     // 60 seconds
  agent_orders: 60 * 1000,               // 60 seconds
  agent_withdrawals: 60 * 1000,          // 60 seconds
  messages: 60 * 1000,                   // 60 seconds
  customers: 30 * 1000,                  // 30 seconds
  customer_transactions: 30 * 1000,      // 30 seconds
};

const memCacheTimestamps: Record<string, number> = ((globalThis as any).__bmgh_cache_ts =
  (globalThis as any).__bmgh_cache_ts || {});

function isCacheFresh(key: string, ttl: number): boolean {
  const ts = memCacheTimestamps[key];
  if (!ts) return false;
  return Date.now() - ts < ttl;
}

function markCacheFresh(key: string): void {
  memCacheTimestamps[key] = Date.now();
}

export function invalidateDbCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    Object.keys(memCacheTimestamps).forEach((k) => delete memCacheTimestamps[k]);
    return;
  }
  const cleanPrefix = keyPrefix.endsWith("*") ? keyPrefix.slice(0, -1) : keyPrefix;
  Object.keys(memCacheTimestamps).forEach((k) => {
    if (
      k === keyPrefix ||
      k.startsWith(cleanPrefix) ||
      k.startsWith(cleanPrefix + ":") ||
      k.startsWith(cleanPrefix + "_")
    ) {
      delete memCacheTimestamps[k];
    }
  });
}

export const isServerCacheValid = isCacheFresh;
export const markServerCache = markCacheFresh;
export const invalidateServerCache = invalidateDbCache;

export const db = {
  // SETTINGS
  async getSettings(): Promise<Settings> {
    if (isCacheFresh("settings", CACHE_TTLS.settings) && globalStore.__bmgh_settings) {
      return globalStore.__bmgh_settings;
    }

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
          markCacheFresh("settings");
          saveToDisk();
          return merged;
        }
      } catch (err) {
        console.error("Supabase getSettings error (falling back to cache):", err);
      }
    }
    markCacheFresh("settings");
    return globalStore.__bmgh_settings!;
  },

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    invalidateDbCache("settings");
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
          invalidateDbCache("settings");
          saveToDisk();
          invalidateServerCache("settings");
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
    invalidateDbCache("settings");
    saveToDisk();
    invalidateServerCache("settings");
    return globalStore.__bmgh_settings;
  },

  // PRODUCTS
  async getProducts(network?: string): Promise<Product[]> {
    if (isCacheFresh("products", CACHE_TTLS.products) && globalStore.__bmgh_products && globalStore.__bmgh_products.length > 0) {
      let list = globalStore.__bmgh_products!;
      if (network) {
        list = list.filter((p) => p.network.toLowerCase() === network.toLowerCase());
      }
      return [...list].sort((a, b) => a.price - b.price);
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("products").select("*").order("price", { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          globalStore.__bmgh_products = data as Product[];
          markCacheFresh("products");
          saveToDisk();
          let list = data as Product[];
          if (network) {
            list = list.filter((p) => p.network.toLowerCase() === network.toLowerCase());
          }
          return list.sort((a, b) => a.price - b.price);
        }
      } catch (err) {
        console.error("Supabase getProducts error (falling back to cache):", err);
      }
    }
    markCacheFresh("products");
    let list = globalStore.__bmgh_products || [];
    if (network) {
      list = list.filter((p) => p.network.toLowerCase() === network.toLowerCase());
    }
    return [...list].sort((a, b) => a.price - b.price);
  },

  async addProduct(product: Omit<Product, "id" | "created_at">): Promise<Product> {
    invalidateDbCache("products");
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
          console.warn("Supabase addProduct warning:", error.message);
        } else if (data) {
          const created = data as Product;
          globalStore.__bmgh_products = [created, ...(globalStore.__bmgh_products || [])];
          invalidateDbCache("products");
          saveToDisk();
          return created;
        }
      } catch (err: any) {
        console.warn("Supabase addProduct network failure, falling back to local store:", err?.message || err);
      }
    }

    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    globalStore.__bmgh_products = [newProduct, ...(globalStore.__bmgh_products || [])];
    invalidateDbCache("products");
    saveToDisk();
    return newProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    invalidateDbCache("products");
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
          console.warn("Supabase updateProduct warning:", error.message);
        } else if (data) {
          const updated = data as Product;
          const idx = (globalStore.__bmgh_products || []).findIndex((p) => p.id === id);
          if (idx !== -1) globalStore.__bmgh_products![idx] = updated;
          invalidateDbCache("products");
          saveToDisk();
          return updated;
        }
      } catch (err: any) {
        console.warn("Supabase updateProduct network failure, falling back to local store:", err?.message || err);
      }
    }

    const index = (globalStore.__bmgh_products || []).findIndex((p) => p.id === id);
    if (index === -1) return null;
    globalStore.__bmgh_products![index] = { ...globalStore.__bmgh_products![index], ...updates };
    invalidateDbCache("products");
    saveToDisk();
    return globalStore.__bmgh_products![index];
  },

  async deleteProduct(id: string): Promise<boolean> {
    invalidateDbCache("products");
    const existingProd = (globalStore.__bmgh_products || []).find((p) => p.id === id);

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
        if (error) {
          console.warn("Supabase deleteProduct warning:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase deleteProduct network failure, falling back to local store:", err?.message || err);
      }
    }

    globalStore.__bmgh_products = (globalStore.__bmgh_products || []).filter((p) => p.id !== id);
    invalidateDbCache("products");
    saveToDisk();

    // Cascade to agent base products if a matching product exists by ID or by matching network + size
    try {
      const baseProds = await this.getAgentBaseProducts();
      const matchingBp = baseProds.find(
        (bp) =>
          bp.id === id ||
          (existingProd &&
            bp.network.toLowerCase().trim() === existingProd.network.toLowerCase().trim() &&
            bp.size.toLowerCase().trim() === existingProd.size.toLowerCase().trim())
      );
      if (matchingBp) {
        await this.deleteAgentBaseProduct(matchingBp.id);
      }
    } catch (err) {
      console.warn("Cascade delete to agent base product error:", err);
    }

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
  }, forceFresh = false): Promise<Order[]> {
    // Egress Protection: Serve from in-memory cache if no search and cache is fresh
    if (!forceFresh && !filter?.search && isCacheFresh("orders", CACHE_TTLS.orders) && globalStore.__bmgh_orders && globalStore.__bmgh_orders.length > 0) {
      let results = [...globalStore.__bmgh_orders].map(normalizeOrder).sort(
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
      return results;
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (!filter?.search) {
          query = query.limit(200);
        }
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
        if (!error && Array.isArray(data)) {
          const normalizedData = (data as Order[]).map(normalizeOrder);
          if (!filter?.search) {
            globalStore.__bmgh_orders = normalizedData;
            markCacheFresh("orders");
            saveToDisk();
          }
          let results = normalizedData;
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

    markCacheFresh("orders");
    let results = [...(globalStore.__bmgh_orders || [])].map(normalizeOrder).sort(
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
      const mergedDatamart = {
        ...(orderData.datamart_response || {}),
        source: orderData.source || (orderData.api_key_id ? "api" : "web"),
        api_key_id: orderData.api_key_id,
        developer_name: orderData.developer_name,
      };

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
        datamart_response: mergedDatamart,
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
          invalidateDbCache("orders");
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
    invalidateDbCache("orders");
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

    // Retrieve existing memory order to preserve datamart_response metadata (agent_id, agent_profit, store_slug)
    const existingMemoryOrder = (globalStore.__bmgh_orders || []).find(
      (o) => o.id === orderIdOrRef || o.reference.toLowerCase() === orderIdOrRef.toLowerCase()
    );
    const existingDatamart = (existingMemoryOrder?.datamart_response && typeof existingMemoryOrder.datamart_response === "object")
      ? existingMemoryOrder.datamart_response
      : {};

    const mergedDatamart = datamartResponse && typeof datamartResponse === "object"
      ? {
          ...existingDatamart,
          ...datamartResponse,
          ...(existingDatamart.agent_id ? { agent_id: existingDatamart.agent_id } : {}),
          ...(existingDatamart.agent_profit !== undefined ? { agent_profit: existingDatamart.agent_profit } : {}),
          ...(existingDatamart.store_slug ? { store_slug: existingDatamart.store_slug } : {}),
        }
      : datamartResponse || existingDatamart;

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const trimmed = (orderIdOrRef || "").trim();
        const isExplicitRef = /^(BMGH|BIGJ)-/i.test(trimmed);
        const updatePayload: any = {
          status: normalizedStatus,
          ...(datamartResponse ? { datamart_response: mergedDatamart } : {}),
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
            ...(datamartResponse ? { datamart_response: mergedDatamart } : {}),
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
          invalidateDbCache("orders");
          saveToDisk();

          // Automatically sync corresponding agent order status
          if (ord.reference) {
            this.updateAgentOrderStatus(ord.reference, ord.delivery_status, ord.datamart_response).catch(() => {});
          }

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
    if (datamartResponse) order.datamart_response = mergedDatamart;
    invalidateDbCache("orders");
    saveToDisk();

    // Automatically sync corresponding agent order status
    if (order.reference) {
      this.updateAgentOrderStatus(order.reference, order.delivery_status, order.datamart_response).catch(() => {});
    }

    return normalizeOrder(order);
  },

  // MESSAGES
  async getMessages(sessionId?: string): Promise<Message[]> {
    if (!sessionId && isCacheFresh("messages", CACHE_TTLS.messages) && globalStore.__bmgh_messages && globalStore.__bmgh_messages.length > 0) {
      return [...globalStore.__bmgh_messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    let supabaseMsgs: Message[] = [];
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let query = supabaseAdmin.from("messages").select("*").order("created_at", { ascending: false }).limit(100);
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

    if (!sessionId) {
      globalStore.__bmgh_messages = result;
      markCacheFresh("messages");
      saveToDisk();
    }

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
    invalidateDbCache("messages");
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
          invalidateDbCache("messages");
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
      invalidateDbCache("messages");
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
            invalidateDbCache("messages");
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
      invalidateDbCache("messages");
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
            invalidateDbCache("messages");
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
    invalidateDbCache("messages");
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
    if (isCacheFresh("active_voucher", CACHE_TTLS.active_voucher)) {
      return (
        (globalStore.__bmgh_vouchers || []).find((v) => {
          if (!v.is_active || v.claimed_count >= v.max_claims) return false;
          if (v.expires_at && new Date(v.expires_at) < now) return false;
          return true;
        }) || null
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("vouchers")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (!error && data) {
          globalStore.__bmgh_vouchers = data as Voucher[];
          markCacheFresh("active_voucher");
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
    markCacheFresh("active_voucher");
    return (
      (globalStore.__bmgh_vouchers || []).find((v) => {
        if (!v.is_active || v.claimed_count >= v.max_claims) return false;
        if (v.expires_at && new Date(v.expires_at) < now) return false;
        return true;
      }) || null
    );
  },

  async createVoucher(voucher: Omit<Voucher, "id" | "claimed_count" | "created_at">): Promise<Voucher> {
    invalidateDbCache("active_voucher");
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
          invalidateDbCache("active_voucher");
          saveToDisk();
          return data as Voucher;
        }
      } catch (err) {
        console.error("Supabase createVoucher error:", err);
      }
    }

    if (!globalStore.__bmgh_vouchers) globalStore.__bmgh_vouchers = [];
    globalStore.__bmgh_vouchers.unshift(newVoucher);
    invalidateDbCache("active_voucher");
    saveToDisk();
    return newVoucher;
  },

  async toggleVoucher(id: string, is_active: boolean): Promise<boolean> {
    invalidateDbCache("active_voucher");
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("vouchers").update({ is_active }).eq("id", id);
      } catch (err) {
        console.error("Supabase toggleVoucher error:", err);
      }
    }
    const v = (globalStore.__bmgh_vouchers || []).find((x) => x.id === id);
    if (v) v.is_active = is_active;
    invalidateDbCache("active_voucher");
    saveToDisk();
    return true;
  },

  async toggleAllVouchers(is_active: boolean): Promise<boolean> {
    invalidateDbCache("active_voucher");
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
    invalidateDbCache("active_voucher");
    saveToDisk();
    return true;
  },

  async deleteVoucher(id: string): Promise<boolean> {
    invalidateDbCache("active_voucher");
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
    invalidateDbCache("active_voucher");
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
    invalidateDbCache("active_voucher");
    saveToDisk();

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
    if (isCacheFresh("agent_config", CACHE_TTLS.agent_config) && globalStore.__bmgh_agent_config) {
      const current = globalStore.__bmgh_agent_config;
      const devMaster = current.developer_master_enabled !== false;
      const adminEn = current.admin_enabled !== false;
      current.is_enabled = Boolean(devMaster && adminEn);
      return current;
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("store_name, announcement_text")
          .eq("id", "agent_store_config")
          .maybeSingle();
        if (data && data.store_name) {
          let developer_master_enabled = true;
          let admin_enabled = true;
          let custom_domain = "";
          let auto_paystack_payout = false;
          try {
            if (data.store_name.startsWith("{")) {
              const parsed = JSON.parse(data.store_name);
              developer_master_enabled = parsed.developer_master_enabled !== false;
              admin_enabled = parsed.admin_enabled !== false;
              custom_domain = parsed.custom_domain || "";
              auto_paystack_payout = Boolean(parsed.auto_paystack_payout);
            } else {
              developer_master_enabled = data.store_name !== "false" && data.store_name !== "0";
              admin_enabled = developer_master_enabled;
            }
          } catch {
            developer_master_enabled = data.store_name !== "false";
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
            auto_paystack_payout,
          };
          markCacheFresh("agent_config");
          return globalStore.__bmgh_agent_config;
        }
      } catch (err) {
        // Fallback to local
      }
    }
    markCacheFresh("agent_config");
    const current = globalStore.__bmgh_agent_config;
    if (current) {
      const devMaster = current.developer_master_enabled !== false;
      const adminEn = current.admin_enabled !== false;
      current.is_enabled = Boolean(devMaster && adminEn);
      return current;
    }
    return {
      is_enabled: true,
      developer_master_enabled: true,
      admin_enabled: true,
      registration_fee: 0,
      custom_domain: "fastdata-gh.vercel.app",
      auto_paystack_payout: false,
    };
  },

  async updateAgentStoreConfig(config: Partial<AgentStoreConfig>): Promise<AgentStoreConfig> {
    invalidateDbCache("agent_config");
    const current = await this.getAgentStoreConfig();

    let developer_master_enabled =
      config.developer_master_enabled !== undefined
        ? Boolean(config.developer_master_enabled)
        : current.developer_master_enabled ?? true;

    let admin_enabled =
      config.admin_enabled !== undefined
        ? Boolean(config.admin_enabled)
        : current.admin_enabled ?? true;

    let custom_domain =
      config.custom_domain !== undefined
        ? config.custom_domain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "")
        : current.custom_domain || "";

    const auto_paystack_payout =
      config.auto_paystack_payout !== undefined
        ? Boolean(config.auto_paystack_payout)
        : current.auto_paystack_payout ?? false;

    // If caller specifically set is_enabled directly without specifying master:
    if (config.developer_master_enabled === undefined && config.admin_enabled === undefined && config.is_enabled !== undefined) {
      // Default direct caller to admin_enabled AND developer_master_enabled, respecting master lock
      admin_enabled = Boolean(config.is_enabled);
      developer_master_enabled = true;
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
      auto_paystack_payout,
    };
    invalidateDbCache("agent_config");
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agent_store_config",
          store_name: JSON.stringify({ developer_master_enabled, admin_enabled, custom_domain, auto_paystack_payout }),
          announcement_text: String(registration_fee),
        });
      } catch (err) {
        console.warn("Agent store config Supabase save error:", err);
      }
    }

    return globalStore.__bmgh_agent_config;
  },

  async getAgentBaseProducts(): Promise<AgentBaseProduct[]> {
    if (
      isCacheFresh("agent_base_products", CACHE_TTLS.agent_base_products) &&
      Array.isArray(globalStore.__bmgh_agent_base_products) &&
      globalStore.__bmgh_agent_base_products.length > 0
    ) {
      return globalStore.__bmgh_agent_base_products;
    }

    let mergedList: AgentBaseProduct[] = [];
    if (Array.isArray(globalStore.__bmgh_agent_base_products) && globalStore.__bmgh_agent_base_products.length > 0) {
      mergedList = [...globalStore.__bmgh_agent_base_products];
    } else {
      const disk = loadFromDisk();
      if (Array.isArray(disk?.agent_base_products) && disk.agent_base_products.length > 0) {
        mergedList = [...disk.agent_base_products];
      } else {
        mergedList = [...initialAgentBaseProducts];
      }
    }

    const baseMap = new Map<string, AgentBaseProduct>();
    mergedList.forEach((bp) => {
      const compKey = `${(bp.network || "").toLowerCase().trim()}_${(bp.size || "").toLowerCase().trim().replace(/\s+/g, "")}`;
      baseMap.set(bp.id, bp);
      baseMap.set(compKey, bp);
    });

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Try direct agent_base_products table
      try {
        const { data: directBase, error: dbErr } = await supabaseAdmin
          .from("agent_base_products")
          .select("*");
        if (!dbErr && Array.isArray(directBase) && directBase.length > 0) {
          directBase.forEach((b: any) => {
            const compKey = `${(b.network || "").toLowerCase().trim()}_${(b.size || "").toLowerCase().trim().replace(/\s+/g, "")}`;
            const existing = baseMap.get(b.id) || baseMap.get(compKey);
            if (existing) {
              existing.base_price = Number(b.base_price);
              if (b.suggested_price) existing.suggested_price = Number(b.suggested_price);
              if (b.is_active !== undefined) existing.is_active = b.is_active !== false;
            } else {
              const item: AgentBaseProduct = {
                id: b.id,
                network: b.network,
                size: b.size,
                base_price: Number(b.base_price),
                suggested_price: b.suggested_price ? Number(b.suggested_price) : Number(b.base_price) + 1.0,
                is_active: b.is_active !== false,
                created_at: b.created_at || new Date().toISOString(),
              };
              baseMap.set(b.id, item);
              baseMap.set(compKey, item);
            }
          });
        }
      } catch (err) {
        console.warn("Base products Supabase fetch error:", err);
      }

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
              list.forEach((b: any) => {
                const compKey = `${(b.network || "").toLowerCase().trim()}_${(b.size || "").toLowerCase().trim().replace(/\s+/g, "")}`;
                const existing = baseMap.get(b.id) || baseMap.get(compKey);
                if (existing) {
                  existing.base_price = Number(b.base_price);
                  if (b.suggested_price) existing.suggested_price = Number(b.suggested_price);
                  if (b.is_active !== undefined) existing.is_active = b.is_active !== false;
                } else {
                  const item: AgentBaseProduct = {
                    id: b.id,
                    network: b.network,
                    size: b.size,
                    base_price: Number(b.base_price),
                    suggested_price: b.suggested_price ? Number(b.suggested_price) : Number(b.base_price) + 1.0,
                    is_active: b.is_active !== false,
                    created_at: b.created_at || new Date().toISOString(),
                  };
                  baseMap.set(b.id, item);
                  baseMap.set(compKey, item);
                }
              });
            }
          } catch {}
        }
      } catch (err) {
        console.warn("Base products Supabase settings fetch error:", err);
      }
    }

    const uniqueMap = new Map<string, AgentBaseProduct>();
    Array.from(baseMap.values()).forEach((p) => {
      uniqueMap.set(p.id, p);
    });
    const finalResult = Array.from(uniqueMap.values());

    globalStore.__bmgh_agent_base_products = finalResult;
    markCacheFresh("agent_base_products");
    saveToDisk();
    return finalResult;
  },

  async createAgentBaseProduct(p: Omit<AgentBaseProduct, "id" | "created_at">): Promise<AgentBaseProduct> {
    invalidateDbCache("agent_base_products");
    invalidateDbCache("agent_products");
    const list = await this.getAgentBaseProducts();
    const cleanNetwork = p.network.toLowerCase().trim();
    const cleanSize = p.size.trim();
    const compKey = `${cleanNetwork}_${cleanSize.toLowerCase().replace(/\s+/g, "")}`;

    const existing = list.find((bp) => {
      const k = `${(bp.network || "").toLowerCase().trim()}_${(bp.size || "").toLowerCase().trim().replace(/\s+/g, "")}`;
      return k === compKey;
    });

    let newProduct: AgentBaseProduct;
    if (existing) {
      existing.base_price = Number(p.base_price);
      existing.suggested_price = p.suggested_price ? Number(p.suggested_price) : Number(p.base_price) + 1.0;
      existing.is_active = p.is_active !== false;
      newProduct = existing;
    } else {
      newProduct = {
        ...p,
        network: cleanNetwork,
        size: cleanSize,
        id: "abp-" + crypto.randomUUID().slice(0, 8),
        created_at: new Date().toISOString(),
      };
      list.push(newProduct);
    }

    globalStore.__bmgh_agent_base_products = list;
    invalidateDbCache("agent_base_products");

    // Immediately register this base product in all agents' catalogs
    try {
      const agents = await this.getAgents();
      if (!globalStore.__bmgh_agent_products) globalStore.__bmgh_agent_products = [];
      agents.forEach((ag) => {
        const hasProd = globalStore.__bmgh_agent_products!.find(
          (ap) => (ap.agent_id === ag.id || ap.agent_id === ag.store_slug) && ap.base_product_id === newProduct.id
        );
        if (!hasProd) {
          globalStore.__bmgh_agent_products!.push({
            id: "acp-" + crypto.randomUUID().slice(0, 8),
            agent_id: ag.id,
            base_product_id: newProduct.id,
            network: newProduct.network,
            size: newProduct.size,
            base_price: newProduct.base_price,
            selling_price: newProduct.suggested_price || newProduct.base_price + 1.0,
            is_active: newProduct.is_active,
          });
        } else {
          hasProd.base_price = newProduct.base_price;
          hasProd.network = newProduct.network;
          hasProd.size = newProduct.size;
        }
      });
    } catch {}

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

      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agent_products_registry_config",
          store_name: "AgentProductsRegistry",
          support_phone: "+233551234567",
          whatsapp_number: "233551234567",
          email: "support@bundlemartgh.com",
          announcement_text: JSON.stringify(globalStore.__bmgh_agent_products || []),
        });
      } catch {}
    }

    return newProduct;
  },

  async updateAgentBaseProduct(id: string, updates: Partial<AgentBaseProduct>): Promise<AgentBaseProduct | null> {
    invalidateServerCache("agent_base_products");
    invalidateServerCache("agent_products_*");
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
    const targetProduct = list.find((x) => x.id === id);
    const filtered = list.filter((x) => x.id !== id);
    globalStore.__bmgh_agent_base_products = filtered;

    // Clean up corresponding custom agent products in memory
    if (globalStore.__bmgh_agent_products) {
      globalStore.__bmgh_agent_products = globalStore.__bmgh_agent_products.filter(
        (ap) => ap.base_product_id !== id
      );
    }

    // Clean up custom_prices from agents in memory
    const aliasKey = targetProduct
      ? `${targetProduct.network.toLowerCase().trim()}_${targetProduct.size.toLowerCase().trim()}`
      : null;

    if (globalStore.__bmgh_agents && Array.isArray(globalStore.__bmgh_agents)) {
      globalStore.__bmgh_agents.forEach((agent) => {
        if (agent.custom_prices) {
          delete agent.custom_prices[id];
          if (aliasKey) {
            delete agent.custom_prices[aliasKey];
          }
        }
      });
    }

    // Fully bust all caches so fresh data is served immediately
    invalidateDbCache("agent_base_products");
    invalidateDbCache("agent_products");
    invalidateDbCache();
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("agent_base_products").delete().eq("id", id);
      } catch {}

      try {
        await supabaseAdmin.from("agent_products").delete().eq("base_product_id", id);
      } catch {}

      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agent_base_products_config",
          store_name: "AgentBaseProductsConfig",
          support_phone: "+233551234567",
          whatsapp_number: "233551234567",
          email: "support@bundlemartgh.com",
          announcement_text: JSON.stringify(filtered),
        });
      } catch (err) {
        console.warn("Agent base products Supabase delete error:", err);
      }

      // CRITICAL: Also update agent_products_registry_config so deleted products are permanently purged from Supabase!
      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agent_products_registry_config",
          store_name: "AgentProductsRegistry",
          support_phone: "+233551234567",
          whatsapp_number: "233551234567",
          email: "support@bundlemartgh.com",
          announcement_text: JSON.stringify(globalStore.__bmgh_agent_products || []),
        });
      } catch (err) {
        console.warn("Agent products registry Supabase delete sync error:", err);
      }
    }

    return true;
  },

  // AGENTS
  async getAgents(): Promise<Agent[]> {
    if (isSupabaseConfigured && supabaseAdmin && !globalStore.__bmgh_agents_zeroed_migrated) {
      globalStore.__bmgh_agents_zeroed_migrated = true;
      (async () => {
        try {
          const { data: flag } = await supabaseAdmin
            .from("settings")
            .select("store_name")
            .eq("id", "agents_zeroed_migration_v1")
            .maybeSingle();
          if (!flag?.store_name) {
            console.log("[DB] Executing one-time global zero reset of all agent finances...");
            await db.resetAllAgentFinances();
            await supabaseAdmin.from("settings").upsert({
              id: "agents_zeroed_migration_v1",
              store_name: "completed",
            });
          }
        } catch (mErr) {
          console.warn("One-time zero reset migration check failed:", mErr);
        }
      })();
    }

    if (isCacheFresh("agents", CACHE_TTLS.agents) && globalStore.__bmgh_agents && globalStore.__bmgh_agents.length > 0) {
      return globalStore.__bmgh_agents;
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Try dedicated agents table first
      try {
        const { data: dbAgents } = await supabaseAdmin.from("agents").select("*");
        if (Array.isArray(dbAgents) && dbAgents.length > 0) {
          const list: Agent[] = dbAgents.map((a: any) => ({
            id: a.id,
            name: a.name,
            store_name: a.store_name,
            store_slug: a.store_slug,
            email: a.email,
            phone: a.phone,
            momo_number: a.momo_number,
            momo_network: a.momo_network,
            description: a.description,
            logo_url: a.logo_url || "/agent-icon.png",
            password_hash: a.password_hash,
            theme: a.theme || "emerald",
            wallet_balance: Number(a.wallet_balance || 0),
            total_earned: Number(a.total_earned || 0),
            total_withdrawn: Number(a.total_withdrawn || 0),
            is_active: a.is_active !== false,
            registration_paid: a.registration_paid !== false,
            custom_prices: a.custom_prices || {},
            cloaked_url: a.cloaked_url,
            created_at: a.created_at,
          }));

          initialAgents.forEach((ia) => {
            if (!list.some((a) => a.id === ia.id || a.store_slug === ia.store_slug)) {
              list.push(ia);
            }
          });
          globalStore.__bmgh_agents = list;
          markCacheFresh("agents");
          return list;
        }
      } catch {}

      // 2. Fallback to settings table registry
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
              markCacheFresh("agents");
              return list;
            }
          } catch {}
        }
      } catch (err) {
        // fallback
      }
    }
    markCacheFresh("agents");
    const current = globalStore.__bmgh_agents || [];
    initialAgents.forEach((ia) => {
      if (!current.some((a) => a.id === ia.id || a.store_slug === ia.store_slug)) {
        current.push(ia);
      }
    });
    globalStore.__bmgh_agents = current;
    markServerCache("agents");
    return current;
  },

  async getAgentById(id: string): Promise<Agent | null> {
    const cleanId = (id || "").trim();
    if (!cleanId) return null;
    const all = await this.getAgents();
    let found = all.find((a) => a.id === cleanId || a.store_slug.toLowerCase() === cleanId.toLowerCase()) || null;
    if (!found) {
      found = initialAgents.find((a) => a.id === cleanId || a.store_slug.toLowerCase() === cleanId.toLowerCase()) || null;
    }
    if (found) {
      try {
        const orders = await this.getAgentOrders(found.id);
        const earnedFromOrders = orders
          .filter((o) => {
            const ps = (o.payment_status || "").toLowerCase().trim();
            const s = (o.status || "").toLowerCase().trim();
            const ds = (o.delivery_status || "").toLowerCase().trim();
            
            // Reject failed, cancelled, or refunded payments
            if (
              ps === "failed" ||
              ps === "cancelled" ||
              ps === "refunded" ||
              s === "cancelled" ||
              s === "refunded"
            ) {
              return false;
            }

            // Confirmed paid or delivered store orders count toward profit
            return (
              ps === "paid" ||
              ps === "completed" ||
              ps === "success" ||
              s === "delivered" ||
              s === "completed" ||
              ds === "delivered" ||
              ds === "completed" ||
              ds === "processing" ||
              s === "processing"
            );
          })
          .reduce((sum, o) => sum + (Number(o.agent_profit) || 0), 0);

        const withdrawals = await this.getAgentWithdrawals(found.id);
        const completedWithdrawn = withdrawals
          .filter((w) => w.status === "completed")
          .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

        const totalEarned = Number(earnedFromOrders.toFixed(2));
        const totalWithdrawn = Number(completedWithdrawn.toFixed(2));
        const pendingWithdrawn = withdrawals
          .filter((w) => w.status === "pending" && Number(w.amount) <= totalEarned)
          .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
        const calculatedBalance = Number(Math.max(0, totalEarned - totalWithdrawn - pendingWithdrawn).toFixed(2));
        const currentBalance = calculatedBalance;

        found.total_earned = totalEarned;
        found.total_withdrawn = totalWithdrawn;
        found.wallet_balance = currentBalance;

        // Keep in-memory store in sync
        if (globalStore.__bmgh_agents) {
          const match = globalStore.__bmgh_agents.find(
            (a) => a.id === found!.id || a.store_slug.toLowerCase() === found!.store_slug.toLowerCase()
          );
          if (match) {
            match.wallet_balance = currentBalance;
            match.total_earned = totalEarned;
            match.total_withdrawn = totalWithdrawn;
          }
        }
      } catch {}
    }
    return found;
  },

  async getAgentBySlug(slug: string): Promise<Agent | null> {
    const clean = slug.toLowerCase().trim();
    const all = await this.getAgents();
    const found = all.find((a) => a.store_slug.toLowerCase() === clean);
    if (found) {
      if (!found.logo_url) found.logo_url = "/agent-icon.png";
      return found;
    }
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
          : "https://fastdata-gh.vercel.app";
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
    invalidateServerCache("agents");

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
    invalidateServerCache("agents");
    const agents = await this.getAgents();
    const idx = agents.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    agents[idx] = { ...agents[idx], ...updates };
    globalStore.__bmgh_agents = agents;
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("agents").update(updates).eq("id", id);
      } catch (err) {
        console.warn("Direct agents table update warning:", err);
      }

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

  async deleteAgent(id: string): Promise<boolean> {
    invalidateServerCache("agents");
    const agents = await this.getAgents();
    const filtered = agents.filter((a) => a.id !== id && a.store_slug !== id);
    globalStore.__bmgh_agents = filtered;
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("settings").upsert({
          id: "agents_registry_config",
          store_name: "AgentsRegistry",
          announcement_text: JSON.stringify(filtered),
        });
      } catch (err) {
        console.warn("Agents registry delete error:", err);
      }

      try {
        await supabaseAdmin.from("agents").delete().eq("id", id);
      } catch {}

      try {
        await supabaseAdmin.from("agent_products").delete().eq("agent_id", id);
      } catch {}
    }

    if (globalStore.__bmgh_agent_products) {
      globalStore.__bmgh_agent_products = globalStore.__bmgh_agent_products.filter((p) => p.agent_id !== id);
    }

    return true;
  },

  async resetAgentFinances(id: string): Promise<boolean> {
    invalidateServerCache("agents");
    invalidateDbCache("agent_orders");
    invalidateDbCache("agent_withdrawals");

    const agents = await this.getAgents();
    const agent = agents.find((a) => a.id === id || a.store_slug.toLowerCase() === id.toLowerCase());
    if (!agent) return false;

    const targetId = agent.id;
    const targetSlug = agent.store_slug.toLowerCase();

    // 1. Reset numbers on agent
    agent.wallet_balance = 0;
    agent.total_earned = 0;
    agent.total_withdrawn = 0;

    // 2. Clear from memory
    if (globalStore.__bmgh_agent_orders) {
      globalStore.__bmgh_agent_orders = globalStore.__bmgh_agent_orders.filter(
        (o) => o.agent_id !== targetId && o.agent_id !== targetSlug
      );
    }
    if (globalStore.__bmgh_agent_withdrawals) {
      globalStore.__bmgh_agent_withdrawals = globalStore.__bmgh_agent_withdrawals.filter(
        (w) => w.agent_id !== targetId && w.agent_id !== targetSlug
      );
    }

    // Clear agent references from master orders in memory
    if (globalStore.__bmgh_orders) {
      globalStore.__bmgh_orders.forEach((mo) => {
        if (
          mo.datamart_response?.agent_id === targetId ||
          mo.datamart_response?.agent_id === targetSlug ||
          mo.datamart_response?.store_slug?.toLowerCase() === targetSlug
        ) {
          delete mo.datamart_response.agent_id;
          delete mo.datamart_response.store_slug;
          delete mo.datamart_response.agent_profit;
        }
      });
    }

    saveToDisk();

    // 3. Supabase cleanup
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await Promise.all([
          supabaseAdmin.from("agent_orders").delete().or(`agent_id.eq.${targetId},agent_id.eq.${targetSlug}`),
          supabaseAdmin.from("agent_withdrawals").delete().or(`agent_id.eq.${targetId},agent_id.eq.${targetSlug}`),
          supabaseAdmin.from("agents").update({ wallet_balance: 0, total_earned: 0, total_withdrawn: 0 }).eq("id", targetId),
        ]);
      } catch (err) {
        console.warn("Supabase direct reset error:", err);
      }

      // Clear agent tags from master orders table
      try {
        const { data: storeOrders } = await supabaseAdmin
          .from("orders")
          .select("id, datamart_response")
          .or(
            `datamart_response->>agent_id.eq.${targetId},datamart_response->>agent_id.eq.${targetSlug},datamart_response->>store_slug.eq.${targetSlug}`
          );
        if (Array.isArray(storeOrders) && storeOrders.length > 0) {
          for (const so of storeOrders) {
            const cleaned = { ...(so.datamart_response || {}) };
            delete cleaned.agent_id;
            delete cleaned.store_slug;
            delete cleaned.agent_profit;
            await supabaseAdmin.from("orders").update({ datamart_response: cleaned }).eq("id", so.id);
          }
        }
      } catch (ordErr) {
        console.warn("Supabase clean orders error:", ordErr);
      }

      // Update registry backups in settings
      try {
        const { data: ordReg } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "agent_orders_registry_config")
          .maybeSingle();
        if (ordReg?.announcement_text) {
          try {
            const list = JSON.parse(ordReg.announcement_text);
            if (Array.isArray(list)) {
              const cleaned = list.filter((o: any) => o.agent_id !== targetId && o.agent_id !== targetSlug);
              await supabaseAdmin.from("settings").upsert({
                id: "agent_orders_registry_config",
                announcement_text: JSON.stringify(cleaned),
              });
            }
          } catch {}
        }

        const { data: withReg } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "agent_withdrawals_registry_config")
          .maybeSingle();
        if (withReg?.announcement_text) {
          try {
            const list = JSON.parse(withReg.announcement_text);
            if (Array.isArray(list)) {
              const cleaned = list.filter((w: any) => w.agent_id !== targetId && w.agent_id !== targetSlug);
              await supabaseAdmin.from("settings").upsert({
                id: "agent_withdrawals_registry_config",
                announcement_text: JSON.stringify(cleaned),
              });
            }
          } catch {}
        }

        const { data: agReg } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "agents_registry_config")
          .maybeSingle();
        if (agReg?.announcement_text) {
          try {
            const list = JSON.parse(agReg.announcement_text);
            if (Array.isArray(list)) {
              const updated = list.map((a: any) => {
                if (a.id === targetId || a.store_slug?.toLowerCase() === targetSlug) {
                  return { ...a, wallet_balance: 0, total_earned: 0, total_withdrawn: 0 };
                }
                return a;
              });
              await supabaseAdmin.from("settings").upsert({
                id: "agents_registry_config",
                announcement_text: JSON.stringify(updated),
              });
            }
          } catch {}
        }
      } catch (backupErr) {
        console.warn("Supabase backup registry reset error:", backupErr);
      }
    }

    return true;
  },

  async resetAllAgentFinances(): Promise<boolean> {
    invalidateServerCache("agents");
    invalidateDbCache("agent_orders");
    invalidateDbCache("agent_withdrawals");

    // 1. Reset all agents in memory
    const agents = await this.getAgents();
    agents.forEach((a) => {
      a.wallet_balance = 0;
      a.total_earned = 0;
      a.total_withdrawn = 0;
    });

    if (globalStore.__bmgh_agents) {
      globalStore.__bmgh_agents.forEach((a) => {
        a.wallet_balance = 0;
        a.total_earned = 0;
        a.total_withdrawn = 0;
      });
    }

    // 2. Clear all agent orders and withdrawals in memory
    globalStore.__bmgh_agent_orders = [];
    globalStore.__bmgh_agent_withdrawals = [];

    // 3. Clear agent tag from master platform orders in memory
    if (globalStore.__bmgh_orders) {
      globalStore.__bmgh_orders.forEach((mo) => {
        if (mo.datamart_response) {
          delete mo.datamart_response.agent_id;
          delete mo.datamart_response.store_slug;
          delete mo.datamart_response.agent_profit;
        }
      });
    }

    saveToDisk();

    // 4. Supabase cleanup
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await Promise.all([
          supabaseAdmin.from("agent_orders").delete().neq("id", "none"),
          supabaseAdmin.from("agent_withdrawals").delete().neq("id", "none"),
          supabaseAdmin.from("agents").update({ wallet_balance: 0, total_earned: 0, total_withdrawn: 0 }).neq("id", "none"),
        ]);
      } catch (err) {
        console.warn("Supabase all reset error:", err);
      }

      // Clear agent tags from master orders table
      try {
        const { data: storeOrders } = await supabaseAdmin
          .from("orders")
          .select("id, datamart_response")
          .not("datamart_response", "is", null);
        if (Array.isArray(storeOrders) && storeOrders.length > 0) {
          for (const so of storeOrders) {
            if (so.datamart_response?.agent_id || so.datamart_response?.store_slug || so.datamart_response?.agent_profit) {
              const cleaned = { ...so.datamart_response };
              delete cleaned.agent_id;
              delete cleaned.store_slug;
              delete cleaned.agent_profit;
              await supabaseAdmin.from("orders").update({ datamart_response: cleaned }).eq("id", so.id);
            }
          }
        }
      } catch (ordErr) {
        console.warn("Supabase clean orders error:", ordErr);
      }

      // Update registry backups in settings
      try {
        await Promise.all([
          supabaseAdmin.from("settings").upsert({
            id: "agent_orders_registry_config",
            store_name: "AgentOrdersRegistry",
            support_phone: "+233551234567",
            whatsapp_number: "233551234567",
            email: "support@bundlemartgh.com",
            announcement_text: JSON.stringify([]),
          }),
          supabaseAdmin.from("settings").upsert({
            id: "agent_withdrawals_registry_config",
            store_name: "AgentWithdrawalsRegistry",
            support_phone: "+233551234567",
            whatsapp_number: "233551234567",
            email: "support@bundlemartgh.com",
            announcement_text: JSON.stringify([]),
          }),
          supabaseAdmin.from("settings").upsert({
            id: "agents_registry_config",
            store_name: "AgentsRegistry",
            support_phone: "+233551234567",
            whatsapp_number: "233551234567",
            email: "support@bundlemartgh.com",
            announcement_text: JSON.stringify(
              agents.map((a) => ({ ...a, wallet_balance: 0, total_earned: 0, total_withdrawn: 0 }))
            ),
          }),
        ]);
      } catch (backupErr) {
        console.warn("Supabase backup registry reset error:", backupErr);
      }
    }

    return true;
  },

  // AGENT CUSTOM PRODUCTS
  async getAgentProducts(agentId: string): Promise<AgentCustomProduct[]> {
    const baseProducts = await this.getAgentBaseProducts();
    const baseProductIds = new Set(baseProducts.map((bp) => bp.id));

    const cleanId = (agentId || "").trim();
    let canonicalId = cleanId;
    let canonicalSlug = cleanId.toLowerCase();
    const allAgents = await this.getAgents();
    const matchedAgent = allAgents.find(
      (a) => a.id === cleanId || a.store_slug.toLowerCase() === cleanId.toLowerCase()
    );
    if (matchedAgent) {
      canonicalId = matchedAgent.id;
      canonicalSlug = matchedAgent.store_slug.toLowerCase();
    }
    const isTargetAgent = (pAgentId: string) =>
      pAgentId === canonicalId || pAgentId?.toLowerCase() === canonicalSlug || pAgentId === cleanId;

    const cacheKey = `agent_products:${canonicalId}`;
    if (isCacheFresh(cacheKey, CACHE_TTLS.agent_products) && globalStore.__bmgh_agent_products) {
      const filtered = globalStore.__bmgh_agent_products.filter(
        (p) => isTargetAgent(p.agent_id) && baseProductIds.has(p.base_product_id)
      );
      if (filtered.length >= baseProducts.length && filtered.length > 0) {
        return filtered;
      }
    }

    const productMap = new Map<string, AgentCustomProduct>();

    // 1. Load from disk & memory as persistent base layer
    const disk = loadFromDisk();
    const diskAgentProducts: AgentCustomProduct[] = Array.isArray(disk?.agent_products) ? disk.agent_products : [];
    const memoryAgentProducts: AgentCustomProduct[] = Array.isArray(globalStore.__bmgh_agent_products) ? globalStore.__bmgh_agent_products : [];

    [...diskAgentProducts, ...memoryAgentProducts]
      .filter((p) => isTargetAgent(p.agent_id) && baseProductIds.has(p.base_product_id))
      .forEach((p) => {
        productMap.set(p.base_product_id, {
          ...p,
          agent_id: canonicalId,
          base_price: Number(p.base_price),
          selling_price: Number(p.selling_price),
          is_active: p.is_active !== false,
        });
      });

    // 2. Overlay from Supabase if configured
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: directProds, error: dpErr } = await supabaseAdmin
          .from("agent_products")
          .select("*")
          .or(`agent_id.eq.${canonicalId},agent_id.eq.${canonicalSlug}`);
        if (!dpErr && Array.isArray(directProds) && directProds.length > 0) {
          directProds.forEach((dp: any) => {
            if (baseProductIds.has(dp.base_product_id)) {
              productMap.set(dp.base_product_id, {
                id: dp.id,
                agent_id: canonicalId,
                base_product_id: dp.base_product_id,
                network: dp.network,
                size: dp.size,
                base_price: Number(dp.base_price),
                selling_price: Number(dp.selling_price),
                is_active: dp.is_active !== false,
              });
            }
          });
        }
      } catch {}

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
              list
                .filter((p: any) => isTargetAgent(p.agent_id) && baseProductIds.has(p.base_product_id))
                .forEach((p: any) => {
                  productMap.set(p.base_product_id, {
                    id: p.id,
                    agent_id: canonicalId,
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

    // 3. Ensure ALL base products exist in the catalog
    let hasChanges = false;
    baseProducts.forEach((bp) => {
      const existing = productMap.get(bp.id);
      if (!existing) {
        const added: AgentCustomProduct = {
          id: "acp-" + crypto.randomUUID().slice(0, 8),
          agent_id: canonicalId,
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
        if (existing.network !== bp.network) {
          existing.network = bp.network;
        }
        if (existing.size !== bp.size) {
          existing.size = bp.size;
        }
      }
    });

    // 4. CRITICAL FIX: Direct Agent custom_prices override ALWAYS WINS!
    const current = matchedAgent || allAgents.find((a) => isTargetAgent(a.id) || isTargetAgent(a.store_slug));
    if (current?.custom_prices) {
      baseProducts.forEach((bp) => {
        const directPrice =
          current.custom_prices?.[bp.id] ??
          current.custom_prices?.[`${bp.network.toLowerCase()}_${bp.size.toLowerCase()}`] ??
          current.custom_prices?.[`${bp.network.toLowerCase()}_${bp.size.toLowerCase().replace(/\s+/g, "")}`];
        if (directPrice !== undefined && Number(directPrice) > 0) {
          const item = productMap.get(bp.id);
          if (item) {
            if (item.selling_price !== Number(directPrice)) {
              item.selling_price = Number(directPrice);
              hasChanges = true;
            }
          } else {
            productMap.set(bp.id, {
              id: "acp-" + crypto.randomUUID().slice(0, 8),
              agent_id: canonicalId,
              base_product_id: bp.id,
              network: bp.network,
              size: bp.size,
              base_price: bp.base_price,
              selling_price: Number(directPrice),
              is_active: bp.is_active,
            });
            hasChanges = true;
          }
        }
      });
    }

    let result = Array.from(productMap.values()).filter((p) => baseProductIds.has(p.base_product_id));

    // Sort strictly by network and package size (1GB, 2GB, 3GB, 5GB, 10GB, etc.)
    result.sort((a, b) => {
      const na = (a.network || "").toLowerCase();
      const nb = (b.network || "").toLowerCase();
      if (na !== nb) return na.localeCompare(nb);
      const sa = parsePackageSize(a.size);
      const sb = parsePackageSize(b.size);
      if (sa !== sb) return sa - sb;
      return (Number(a.base_price) || 0) - (Number(b.base_price) || 0);
    });

    // Safely update globalStore without clobbering other agents' custom products
    if (!globalStore.__bmgh_agent_products) globalStore.__bmgh_agent_products = [];
    globalStore.__bmgh_agent_products = [
      ...globalStore.__bmgh_agent_products.filter((p) => !isTargetAgent(p.agent_id) && baseProductIds.has(p.base_product_id)),
      ...result,
    ];

    saveToDisk();

    if (hasChanges && isSupabaseConfigured && supabaseAdmin) {
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

    markCacheFresh(cacheKey);
    return result;
  },

  async updateAgentProduct(
    agentId: string,
    baseProductId: string,
    sellingPrice: number,
    isActive: boolean
  ): Promise<AgentCustomProduct | null> {
    const list = await this.updateAgentProductsBatch(agentId, [
      { base_product_id: baseProductId, selling_price: sellingPrice, is_active: isActive },
    ]);
    return list[0] || null;
  },

  async updateAgentProductsBatch(
    agentId: string,
    productsToUpdate: Array<{ base_product_id: string; selling_price: number; is_active?: boolean }>
  ): Promise<AgentCustomProduct[]> {
    const cleanId = (agentId || "").trim();
    let canonicalId = cleanId;
    let canonicalSlug = cleanId.toLowerCase();
    const allAgents = await this.getAgents();
    const matchedAgent = allAgents.find(
      (a) => a.id === cleanId || a.store_slug.toLowerCase() === cleanId.toLowerCase()
    );
    if (matchedAgent) {
      canonicalId = matchedAgent.id;
      canonicalSlug = matchedAgent.store_slug.toLowerCase();
    }
    const isTargetAgent = (pAgentId: string) =>
      pAgentId === canonicalId || pAgentId?.toLowerCase() === canonicalSlug || pAgentId === cleanId;

    invalidateDbCache(`agent_products:${canonicalId}`);
    invalidateDbCache(`agent_products:${canonicalSlug}`);
    invalidateDbCache(`agent_products:${cleanId}`);
    invalidateDbCache("agent_products");
    invalidateDbCache("agents");

    // 1. Ensure latest catalog for this agent is loaded
    await this.getAgentProducts(canonicalId);

    const baseProducts = await this.getAgentBaseProducts();
    const baseMap = new Map(baseProducts.map((b) => [b.id, b]));

    if (!globalStore.__bmgh_agent_products) globalStore.__bmgh_agent_products = [];
    const list = globalStore.__bmgh_agent_products;

    const updatedItems: AgentCustomProduct[] = [];

    // Ensure agent custom_prices map is initialized
    const targetAgent = matchedAgent || allAgents.find((a) => isTargetAgent(a.id) || isTargetAgent(a.store_slug));
    if (targetAgent && !targetAgent.custom_prices) {
      targetAgent.custom_prices = {};
    }

    for (const update of productsToUpdate) {
      const { base_product_id, selling_price, is_active } = update;
      const bp = baseMap.get(base_product_id);

      let item = list.find((p) => isTargetAgent(p.agent_id) && p.base_product_id === base_product_id);
      const numPrice = Number(selling_price);
      const validSellingPrice =
        !isNaN(numPrice) && numPrice > 0
          ? numPrice
          : bp
          ? bp.suggested_price || bp.base_price + 1.0
          : 5.0;
      const validActive = is_active !== undefined ? is_active : (item?.is_active !== false);

      if (!item) {
        if (!bp) continue;
        item = {
          id: "acp-" + crypto.randomUUID().slice(0, 8),
          agent_id: canonicalId,
          base_product_id: bp.id,
          network: bp.network,
          size: bp.size,
          base_price: bp.base_price,
          selling_price: validSellingPrice,
          is_active: validActive,
        };
        list.push(item);
      } else {
        item.agent_id = canonicalId;
        if (bp) {
          item.base_price = bp.base_price;
          item.network = bp.network;
          item.size = bp.size;
        }
        item.selling_price = validSellingPrice;
        item.is_active = validActive;
      }
      updatedItems.push(item);

      if (targetAgent) {
        if (!targetAgent.custom_prices) {
          targetAgent.custom_prices = {};
        }
        targetAgent.custom_prices[base_product_id] = validSellingPrice;
        if (bp) {
          const key1 = `${bp.network.toLowerCase()}_${bp.size.toLowerCase()}`;
          const key2 = `${bp.network.toLowerCase()}_${bp.size.toLowerCase().replace(/\s+/g, "")}`;
          targetAgent.custom_prices[key1] = validSellingPrice;
          targetAgent.custom_prices[key2] = validSellingPrice;
        }
      }
    }

    globalStore.__bmgh_agent_products = list;

    if (targetAgent) {
      await this.updateAgent(targetAgent.id, { custom_prices: targetAgent.custom_prices });
    }

    saveToDisk();

    // Sync to Supabase if configured
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
      } catch (err) {
        console.warn("Agent custom products Supabase settings update error:", err);
      }

      for (const item of updatedItems) {
        try {
          await supabaseAdmin
            .from("agent_products")
            .delete()
            .or(`agent_id.eq.${canonicalId},agent_id.eq.${canonicalSlug}`)
            .eq("base_product_id", item.base_product_id);

          await supabaseAdmin.from("agent_products").insert({
            id: item.id,
            agent_id: canonicalId,
            base_product_id: item.base_product_id,
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
    }

    invalidateDbCache(`agent_products:${canonicalId}`);
    invalidateDbCache(`agent_products:${canonicalSlug}`);
    invalidateDbCache(`agent_products:${cleanId}`);

    return updatedItems;
  },

  // AGENT ORDERS
  async getAgentOrders(agentId?: string): Promise<AgentOrder[]> {
    const orderMap = new Map<string, AgentOrder>();

    let targetAgentId = agentId ? agentId.trim() : "";
    let targetSlug = "";
    if (targetAgentId) {
      const allAgents = await this.getAgents();
      const matched = allAgents.find(
        (a) => a.id === targetAgentId || a.store_slug.toLowerCase() === targetAgentId.toLowerCase()
      );
      if (matched) {
        targetAgentId = matched.id;
        targetSlug = matched.store_slug.toLowerCase();
      }
    }

    const isMasterPlatformOrder = (o: any) => {
      const ref = String(o?.reference || "").toUpperCase();
      return ref.startsWith("BMGH-") && !o.agent_id && !o.datamart_response?.agent_id && !o.datamart_response?.store_slug;
    };

    const cacheKey = targetAgentId ? `agent_orders:${targetAgentId}` : "agent_orders_all";
    if (isCacheFresh(cacheKey, CACHE_TTLS.agent_orders) && globalStore.__bmgh_agent_orders && globalStore.__bmgh_agent_orders.length > 0) {
      const cleaned = globalStore.__bmgh_agent_orders.filter((o) => !isMasterPlatformOrder(o));
      if (targetAgentId) {
        return cleaned.filter((o) => o.agent_id === targetAgentId || o.agent_id === targetSlug);
      }
      return cleaned;
    }

    // 1. Populate orderMap with ALL existing memory / disk store orders to prevent dropping data
    const memoryOrders = globalStore.__bmgh_agent_orders || [];
    memoryOrders.forEach((o) => {
      if (isMasterPlatformOrder(o)) return;
      const key = o.reference || o.id;
      if (key) orderMap.set(key, o);
    });

    if (isSupabaseConfigured && supabaseAdmin) {
      // 2. Direct agent_orders table
      try {
        let query = supabaseAdmin
          .from("agent_orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (targetAgentId) {
          query = query.or(`agent_id.eq.${targetAgentId}${targetSlug ? `,agent_id.eq.${targetSlug}` : ""}`);
        }
        const { data: dbOrders } = await query;
        if (Array.isArray(dbOrders)) {
          dbOrders.forEach((o: any) => {
            if (isMasterPlatformOrder(o)) return;
            const mapped: AgentOrder = {
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
            };
            const key = mapped.reference || mapped.id;
            if (key) orderMap.set(key, mapped);
          });
        }
      } catch {}

      // 3. Settings table registry
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "agent_orders_registry_config")
          .maybeSingle();
        if (data?.announcement_text) {
          try {
            const list = JSON.parse(data.announcement_text);
            if (Array.isArray(list)) {
              list.forEach((o: any) => {
                if (isMasterPlatformOrder(o)) return;
                const key = o.reference || o.id;
                if (key && !orderMap.has(key)) orderMap.set(key, o);
              });
            }
          } catch {}
        }
      } catch {}

      // 4. Also retrieve any orders placed through this agent's store from the master orders table
      try {
        let storeQuery = supabaseAdmin
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (targetAgentId) {
          storeQuery = storeQuery.or(
            `datamart_response->>agent_id.eq.${targetAgentId},datamart_response->>store_slug.eq.${targetSlug || targetAgentId}${targetSlug ? `,datamart_response->>agent_id.eq.${targetSlug}` : ""}`
          );
        }
        const { data: storeOrders } = await storeQuery;
        if (Array.isArray(storeOrders)) {
          storeOrders.forEach((so: any) => {
            const respAgentId = so.datamart_response?.agent_id || (so.datamart_response?.store_slug === targetSlug ? targetAgentId : "");
            if (!respAgentId && targetAgentId) return;

            const profit = Number(so.datamart_response?.agent_profit) || 0;
            const mapped: AgentOrder = {
              id: "agord-" + (so.id || so.reference),
              agent_id: respAgentId || targetAgentId,
              reference: so.reference,
              network: so.network,
              package_size: so.package_size,
              phone: so.phone,
              amount: Number(so.amount),
              base_price: Math.max(0, Number(so.amount) - profit),
              agent_profit: profit,
              paystack_ref: so.paystack_ref,
              payment_status: so.payment_status || "paid",
              delivery_status: so.delivery_status || "delivered",
              status: so.status || "delivered",
              datamart_response: so.datamart_response,
              created_at: so.created_at,
            };
            const existingInMap = orderMap.get(mapped.reference);
            if (existingInMap) {
              // Master order in orders table has latest delivery_status from Admin / DataMart
              existingInMap.delivery_status = so.delivery_status || existingInMap.delivery_status;
              existingInMap.status = so.status || existingInMap.status;
              existingInMap.payment_status = so.payment_status || existingInMap.payment_status;
              if (so.datamart_response) {
                existingInMap.datamart_response = {
                  ...(existingInMap.datamart_response || {}),
                  ...so.datamart_response,
                };
              }
            } else {
              orderMap.set(mapped.reference, mapped);
            }
          });
        }
      } catch {}
    }

    // Cross-sync status from master orders in memory so admin status changes are instantly reflected
    const masterMemoryOrders = globalStore.__bmgh_orders || [];
    masterMemoryOrders.forEach((mo) => {
      if (!mo?.reference) return;
      const match = orderMap.get(mo.reference);
      if (match) {
        match.delivery_status = mo.delivery_status || match.delivery_status;
        match.status = mo.status || match.status;
        match.payment_status = mo.payment_status || match.payment_status;
      }
    });

    const allMerged = Array.from(orderMap.values())
      .filter((o) => !isMasterPlatformOrder(o))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Never wipe out orders from other agents in globalStore or disk
    const existingGlobal = globalStore.__bmgh_agent_orders || [];
    const combinedMap = new Map<string, AgentOrder>();
    existingGlobal.forEach((o) => {
      const k = o.reference || o.id;
      if (k) combinedMap.set(k, o);
    });
    allMerged.forEach((o) => {
      const k = o.reference || o.id;
      if (k) combinedMap.set(k, o);
    });

    const finalFullList = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    globalStore.__bmgh_agent_orders = finalFullList;
    markCacheFresh(cacheKey);
    saveToDisk();

    if (targetAgentId) {
      return finalFullList.filter(
        (o) => o.agent_id === targetAgentId || o.agent_id === targetSlug
      );
    }

    return finalFullList;
  },

  async createAgentOrder(orderData: Omit<AgentOrder, "id" | "created_at">): Promise<AgentOrder> {
    // 0. Deduplication check: if order with this reference already exists, return existing to avoid duplicate entries and double-crediting!
    if (orderData.reference) {
      const existingList = globalStore.__bmgh_agent_orders || [];
      const match = existingList.find((o) => o.reference === orderData.reference);
      if (match) {
        return match;
      }
    }

    const newOrder: AgentOrder = {
      ...orderData,
      id: "agord-" + crypto.randomUUID().slice(0, 8),
      created_at: new Date().toISOString(),
    };

    // 1. Ensure agents are loaded and match by id or slug
    const agents = await this.getAgents();
    const agent = agents.find(
      (a) =>
        a.id === newOrder.agent_id ||
        a.store_slug.toLowerCase() === newOrder.agent_id.toLowerCase()
    );
    if (agent) {
      newOrder.agent_id = agent.id;
    }

    // Strictly credit the agent's wallet ONLY when payment is confirmed successful
    const ps = (newOrder.payment_status || "").toLowerCase().trim();
    const st = (newOrder.status || "").toLowerCase().trim();
    const isPaymentConfirmed = ps === "paid" || ps === "completed" || ps === "success" || st === "delivered";

    if (isPaymentConfirmed && newOrder.agent_profit > 0 && agent) {
      agent.wallet_balance = Number(((agent.wallet_balance || 0) + newOrder.agent_profit).toFixed(2));
      agent.total_earned = Number(((agent.total_earned || 0) + newOrder.agent_profit).toFixed(2));
    }

    // 2. Ensure in-memory cache is populated
    if (!globalStore.__bmgh_agent_orders) globalStore.__bmgh_agent_orders = [];
    globalStore.__bmgh_agent_orders.unshift(newOrder);

    invalidateDbCache("agents");
    invalidateDbCache("agent_orders");
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
    const cleanTarget = (orderId || "").trim().toLowerCase();
    const o = orders.find((x) => x.id?.toLowerCase() === cleanTarget || x.reference?.toLowerCase() === cleanTarget);
    if (o) {
      o.delivery_status = deliveryStatus;
      o.status = deliveryStatus;
      if (response) {
        o.datamart_response = {
          ...(typeof o.datamart_response === "object" ? o.datamart_response : {}),
          ...(typeof response === "object" ? response : { response }),
        };
      }
    }

    if (globalStore.__bmgh_agent_orders) {
      const match = globalStore.__bmgh_agent_orders.find(
        (x) => x.id?.toLowerCase() === cleanTarget || x.reference?.toLowerCase() === cleanTarget
      );
      if (match) {
        match.delivery_status = deliveryStatus;
        match.status = deliveryStatus;
        if (response) {
          match.datamart_response = {
            ...(typeof match.datamart_response === "object" ? match.datamart_response : {}),
            ...(typeof response === "object" ? response : { response }),
          };
        }
      }
    }

    invalidateDbCache("agent_orders");
    invalidateDbCache("agents");
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin
          .from("agent_orders")
          .update({
            delivery_status: deliveryStatus,
            status: deliveryStatus,
            ...(o?.datamart_response ? { datamart_response: o.datamart_response } : {}),
          })
          .or(`id.ilike.${orderId},reference.ilike.${orderId}`);
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
    const listMap = new Map<string, AgentWithdrawal>();

    let targetAgentId = agentId ? agentId.trim() : "";
    let targetSlug = "";
    if (targetAgentId) {
      const allAgents = await this.getAgents();
      const matched = allAgents.find(
        (a) => a.id === targetAgentId || a.store_slug.toLowerCase() === targetAgentId.toLowerCase()
      );
      if (matched) {
        targetAgentId = matched.id;
        targetSlug = matched.store_slug.toLowerCase();
      }
    }

    const cacheKey = targetAgentId ? `agent_withdrawals:${targetAgentId}` : "agent_withdrawals_all";
    if (isCacheFresh(cacheKey, CACHE_TTLS.agent_withdrawals) && globalStore.__bmgh_agent_withdrawals && globalStore.__bmgh_agent_withdrawals.length > 0) {
      if (targetAgentId) {
        return globalStore.__bmgh_agent_withdrawals.filter((w) => w.agent_id === targetAgentId || w.agent_id === targetSlug);
      }
      return globalStore.__bmgh_agent_withdrawals;
    }

    // 1. Populate listMap with ALL existing in-memory / disk withdrawals first
    const memoryList = globalStore.__bmgh_agent_withdrawals || [];
    memoryList.forEach((w) => {
      if (w.id) listMap.set(w.id, w);
    });

    if (isSupabaseConfigured && supabaseAdmin) {
      // 2. Direct agent_withdrawals table in Supabase
      try {
        let query = supabaseAdmin
          .from("agent_withdrawals")
          .select("*")
          .order("created_at", { ascending: false });
        if (targetAgentId) {
          query = query.or(`agent_id.eq.${targetAgentId}${targetSlug ? `,agent_id.eq.${targetSlug}` : ""}`);
        }
        const { data: dbWithdrawals } = await query;
        if (Array.isArray(dbWithdrawals)) {
          dbWithdrawals.forEach((w: any) => {
            const mapped: AgentWithdrawal = {
              id: w.id,
              agent_id: w.agent_id,
              amount: Number(w.amount),
              momo_number: w.momo_number,
              momo_network: w.momo_network,
              status: w.status,
              verification_code: w.verification_code,
              verified: w.verified !== false,
              note: w.note,
              created_at: w.created_at,
            };
            listMap.set(mapped.id, mapped);
          });
        }
      } catch {}

      // 3. Settings table registry
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "agent_withdrawals_registry_config")
          .maybeSingle();
        if (data?.announcement_text) {
          try {
            const list = JSON.parse(data.announcement_text);
            if (Array.isArray(list)) {
              list.forEach((w: any) => {
                if (w.id && !listMap.has(w.id)) listMap.set(w.id, w);
              });
            }
          } catch {}
        }
      } catch {}
    }

    const allMerged = Array.from(listMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Merge into globalStore without dropping existing records for other agents
    const existingGlobal = globalStore.__bmgh_agent_withdrawals || [];
    const combinedMap = new Map<string, AgentWithdrawal>();
    existingGlobal.forEach((w) => {
      if (w.id) combinedMap.set(w.id, w);
    });
    allMerged.forEach((w) => {
      if (w.id) combinedMap.set(w.id, w);
    });

    const finalFullList = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    globalStore.__bmgh_agent_withdrawals = finalFullList;
    markCacheFresh(cacheKey);
    saveToDisk();

    if (targetAgentId) {
      return finalFullList.filter(
        (w) => w.agent_id === targetAgentId || w.agent_id === targetSlug
      );
    }

    return finalFullList;
  },

  async createAgentWithdrawal(w: Omit<AgentWithdrawal, "id" | "status" | "verified" | "created_at">): Promise<AgentWithdrawal> {
    const newWithdrawal: AgentWithdrawal = {
      ...w,
      id: "wd-" + crypto.randomUUID().slice(0, 8),
      status: "pending",
      verified: true,
      created_at: new Date().toISOString(),
    };

    // Resolve target agent by ID or slug
    const agents = await this.getAgents();
    const agent = agents.find(
      (a) => a.id === w.agent_id || a.store_slug.toLowerCase() === w.agent_id.toLowerCase()
    );

    if (agent) {
      newWithdrawal.agent_id = agent.id; // Normalize to canonical agent id
      agent.wallet_balance = Math.max(0, Number(((agent.wallet_balance || 0) - w.amount).toFixed(2)));
      agent.total_withdrawn = Number(((agent.total_withdrawn || 0) + w.amount).toFixed(2));
    }

    if (!globalStore.__bmgh_agent_withdrawals) globalStore.__bmgh_agent_withdrawals = [];
    globalStore.__bmgh_agent_withdrawals.unshift(newWithdrawal);

    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Direct agent_withdrawals table
      try {
        await supabaseAdmin.from("agent_withdrawals").upsert({
          id: newWithdrawal.id,
          agent_id: newWithdrawal.agent_id,
          amount: newWithdrawal.amount,
          momo_number: newWithdrawal.momo_number,
          momo_network: newWithdrawal.momo_network,
          status: newWithdrawal.status,
          verification_code: newWithdrawal.verification_code,
          verified: newWithdrawal.verified,
          note: newWithdrawal.note,
          created_at: newWithdrawal.created_at,
        });
      } catch {}

      // 2. Direct agents table update
      if (agent) {
        try {
          await supabaseAdmin.from("agents").update({
            wallet_balance: agent.wallet_balance,
            total_withdrawn: agent.total_withdrawn,
          }).eq("id", agent.id);
        } catch {}
      }

      // 3. Fallback registries
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

  async updateWithdrawalStatus(
    id: string,
    status: "pending" | "completed" | "rejected",
    note?: string,
    extra?: { paystack_transfer_code?: string; paystack_status?: string }
  ): Promise<AgentWithdrawal | null> {
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
    if (extra?.paystack_transfer_code) w.paystack_transfer_code = extra.paystack_transfer_code;
    if (extra?.paystack_status) w.paystack_status = extra.paystack_status;
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

  // ================= DEVELOPER API METHODS =================
  async getDeveloperApiConfig(): Promise<DeveloperApiConfig> {
    if (isCacheFresh("developer_api_config", CACHE_TTLS.developer_api_config) && globalStore.__bmgh_developer_api_config) {
      return globalStore.__bmgh_developer_api_config;
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("store_name, announcement_text")
          .eq("id", "developer_api_config")
          .maybeSingle();
        if (data && data.store_name) {
          try {
            const parsed = JSON.parse(data.store_name);
            const is_enabled = parsed.is_enabled !== false;
            const api_key_price = Number(parsed.api_key_price) || 0;
            const min_wallet_funding = Number(parsed.min_wallet_funding) || 10;
            const notice_message = data.announcement_text || parsed.notice_message || "";
            globalStore.__bmgh_developer_api_config = {
              is_enabled,
              api_key_price,
              min_wallet_funding,
              notice_message,
            };
            markCacheFresh("developer_api_config");
            return globalStore.__bmgh_developer_api_config;
          } catch {}
        }
      } catch (err) {}
    }
    markCacheFresh("developer_api_config");
    const fallback =
      globalStore.__bmgh_developer_api_config || {
        is_enabled: true,
        api_key_price: 0,
        min_wallet_funding: 10,
        notice_message: "FastData Developer API Gateway",
      };
    return fallback;
  },

  async updateDeveloperApiConfig(config: Partial<DeveloperApiConfig>): Promise<DeveloperApiConfig> {
    invalidateDbCache("developer_api_config");
    const current = await this.getDeveloperApiConfig();
    const updated: DeveloperApiConfig = {
      is_enabled: config.is_enabled !== undefined ? Boolean(config.is_enabled) : current.is_enabled,
      api_key_price: config.api_key_price !== undefined ? Number(config.api_key_price) : current.api_key_price,
      min_wallet_funding:
        config.min_wallet_funding !== undefined ? Number(config.min_wallet_funding) : current.min_wallet_funding,
      notice_message: config.notice_message !== undefined ? config.notice_message : current.notice_message,
    };
    globalStore.__bmgh_developer_api_config = updated;
    invalidateDbCache("developer_api_config");
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("settings").upsert({
          id: "developer_api_config",
          store_name: JSON.stringify(updated),
          announcement_text: updated.notice_message || "",
        });
      } catch (err) {}
    }
    return updated;
  },

  async getDeveloperApiProducts(): Promise<DeveloperApiProduct[]> {
    if (isCacheFresh("developer_api_products", CACHE_TTLS.developer_api_products) && globalStore.__bmgh_developer_api_products && globalStore.__bmgh_developer_api_products.length > 0) {
      return globalStore.__bmgh_developer_api_products;
    }

    if (
      isSupabaseConfigured &&
      supabaseAdmin &&
      (!globalStore.__bmgh_developer_api_products || globalStore.__bmgh_developer_api_products.length === 0)
    ) {
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "developer_api_products_config")
          .maybeSingle();
        if (data?.announcement_text) {
          try {
            const list = JSON.parse(data.announcement_text);
            if (Array.isArray(list) && list.length > 0) {
              globalStore.__bmgh_developer_api_products = list;
              markCacheFresh("developer_api_products");
              return list;
            }
          } catch {}
        }
      } catch (err) {}
    }
    markCacheFresh("developer_api_products");
    const current =
      globalStore.__bmgh_developer_api_products && globalStore.__bmgh_developer_api_products.length > 0
        ? globalStore.__bmgh_developer_api_products
        : initialDeveloperApiProducts;
    globalStore.__bmgh_developer_api_products = current;
    return current;
  },

  async saveDeveloperApiProducts(products: DeveloperApiProduct[]): Promise<DeveloperApiProduct[]> {
    invalidateDbCache("developer_api_products");
    globalStore.__bmgh_developer_api_products = products;
    saveToDisk();
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("settings").upsert({
          id: "developer_api_products_config",
          announcement_text: JSON.stringify(products),
        });
      } catch (err) {}
    }
    return products;
  },

  async updateDeveloperApiProductPrice(id: string, api_price: number, cost_price?: number): Promise<DeveloperApiProduct | null> {
    invalidateDbCache("developer_api_products");
    const list = await this.getDeveloperApiProducts();
    const item = list.find((p) => p.id === id);
    if (!item) return null;
    item.api_price = Number(api_price);
    if (cost_price !== undefined) item.cost_price = Number(cost_price);
    await this.saveDeveloperApiProducts(list);
    return item;
  },

  async createDeveloperApiProduct(p: Omit<DeveloperApiProduct, "id" | "created_at">): Promise<DeveloperApiProduct> {
    const list = await this.getDeveloperApiProducts();
    const newProd: DeveloperApiProduct = {
      ...p,
      id: "dap-" + crypto.randomUUID().slice(0, 8),
      created_at: new Date().toISOString(),
    };
    list.push(newProd);
    await this.saveDeveloperApiProducts(list);
    return newProd;
  },

  async toggleDeveloperApiProduct(id: string): Promise<DeveloperApiProduct | null> {
    const list = await this.getDeveloperApiProducts();
    const item = list.find((p) => p.id === id);
    if (!item) return null;
    item.is_active = !item.is_active;
    await this.saveDeveloperApiProducts(list);
    return item;
  },

  async deleteDeveloperApiProduct(id: string): Promise<boolean> {
    const list = await this.getDeveloperApiProducts();
    const filtered = list.filter((p) => p.id !== id);
    await this.saveDeveloperApiProducts(filtered);
    return true;
  },

  async getDeveloperAccounts(): Promise<DeveloperAccount[]> {
    if (
      isSupabaseConfigured &&
      supabaseAdmin &&
      (!globalStore.__bmgh_developer_accounts || globalStore.__bmgh_developer_accounts.length === 0)
    ) {
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("announcement_text")
          .eq("id", "developer_accounts_config")
          .maybeSingle();
        if (data?.announcement_text) {
          try {
            const list = JSON.parse(data.announcement_text);
            if (Array.isArray(list)) {
              globalStore.__bmgh_developer_accounts = list;
              return list;
            }
          } catch {}
        }
      } catch (err) {}
    }
    return globalStore.__bmgh_developer_accounts || [];
  },

  async saveDeveloperAccounts(accounts: DeveloperAccount[]): Promise<DeveloperAccount[]> {
    globalStore.__bmgh_developer_accounts = accounts;
    saveToDisk();
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("settings").upsert({
          id: "developer_accounts_config",
          announcement_text: JSON.stringify(accounts),
        });
      } catch (err) {}
    }
    return accounts;
  },

  async getDeveloperAccountByApiKey(apiKey: string): Promise<DeveloperAccount | null> {
    if (!apiKey) return null;
    const cleanKey = apiKey.trim();
    const all = await this.getDeveloperAccounts();
    return all.find((a) => a.api_key === cleanKey) || null;
  },

  async getDeveloperAccountByEmail(email: string): Promise<DeveloperAccount | null> {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const all = await this.getDeveloperAccounts();
    return all.find((a) => a.email.toLowerCase() === cleanEmail) || null;
  },

  async getDeveloperAccountById(id: string): Promise<DeveloperAccount | null> {
    const all = await this.getDeveloperAccounts();
    return all.find((a) => a.id === id) || null;
  },

  async createDeveloperAccount(data: { name: string; email: string; phone: string }): Promise<DeveloperAccount> {
    const all = await this.getDeveloperAccounts();
    const existing = all.find((a) => a.email.toLowerCase() === data.email.trim().toLowerCase());
    if (existing) {
      return existing;
    }
    const rawRandom = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const newAccount: DeveloperAccount = {
      id: "dev-" + crypto.randomUUID().slice(0, 8),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      api_key: `fd_live_${rawRandom}`,
      balance: 0,
      total_spent: 0,
      total_orders: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    all.push(newAccount);
    await this.saveDeveloperAccounts(all);
    return newAccount;
  },

  async updateDeveloperAccount(id: string, updates: Partial<DeveloperAccount>): Promise<DeveloperAccount | null> {
    const all = await this.getDeveloperAccounts();
    const acc = all.find((a) => a.id === id);
    if (!acc) return null;
    Object.assign(acc, updates);
    await this.saveDeveloperAccounts(all);
    return acc;
  },

  async deleteDeveloperAccount(id: string): Promise<boolean> {
    const all = await this.getDeveloperAccounts();
    const filtered = all.filter((a) => a.id !== id);
    await this.saveDeveloperAccounts(filtered);
    return true;
  },

  async creditDeveloperWallet(id: string, amount: number, note?: string): Promise<{ success: boolean; new_balance: number; message: string }> {
    const all = await this.getDeveloperAccounts();
    const acc = all.find((a) => a.id === id);
    if (!acc) return { success: false, new_balance: 0, message: "Developer account not found." };
    const num = Number(amount);
    acc.balance = Number((acc.balance + num).toFixed(2));
    if (acc.balance < 0) acc.balance = 0;
    await this.saveDeveloperAccounts(all);
    return {
      success: true,
      new_balance: acc.balance,
      message: `Developer wallet successfully ${num >= 0 ? "credited" : "debited"} by GHS ${Math.abs(num).toFixed(2)}.`,
    };
  },

  // ================= CUSTOMERS & WALLET SYSTEM =================
  async getCustomers(): Promise<Customer[]> {
    if (isCacheFresh("customers", CACHE_TTLS.customers) && globalStore.__bmgh_customers) {
      return globalStore.__bmgh_customers;
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data)) {
          globalStore.__bmgh_customers = data.map((c: any) => ({
            ...c,
            wallet_balance: Number(c.wallet_balance || 0),
          }));
          markCacheFresh("customers");
          saveToDisk();
          return globalStore.__bmgh_customers;
        }
      } catch (err) {
        console.warn("Supabase customers fetch error:", err);
      }
    }

    if (!globalStore.__bmgh_customers) globalStore.__bmgh_customers = [];
    markCacheFresh("customers");
    return globalStore.__bmgh_customers;
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    const cleanId = String(id).trim();
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("customers")
          .select("*")
          .eq("id", cleanId)
          .maybeSingle();
        if (!error && data) {
          const cust: Customer = { ...data, wallet_balance: Number(data.wallet_balance || 0) };
          const all = await this.getCustomers();
          const idx = all.findIndex((c) => c.id === cleanId);
          if (idx !== -1) all[idx] = cust;
          else all.unshift(cust);
          return cust;
        }
      } catch {}
    }
    const all = await this.getCustomers();
    return all.find((c) => c.id === cleanId) || null;
  },

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const clean = phone.replace(/[^0-9]/g, "");
    if (!clean) return null;
    const all = await this.getCustomers();
    return (
      all.find((c) => {
        const cPhone = c.phone.replace(/[^0-9]/g, "");
        return cPhone === clean || (clean.length >= 9 && cPhone.endsWith(clean.slice(-9)));
      }) || null
    );
  },

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    const clean = email.toLowerCase().trim();
    if (!clean) return null;
    const all = await this.getCustomers();
    return all.find((c) => c.email && c.email.toLowerCase().trim() === clean) || null;
  },

  async getCustomerByGoogleId(googleId: string): Promise<Customer | null> {
    const clean = String(googleId).trim();
    if (!clean) return null;
    const all = await this.getCustomers();
    return all.find((c) => c.google_id && c.google_id === clean) || null;
  },

  async createCustomer(
    data: Omit<Customer, "id" | "wallet_balance" | "is_active" | "created_at"> & {
      wallet_balance?: number;
      is_active?: boolean;
      is_verified?: boolean;
    }
  ): Promise<Customer> {
    const newCustomer: Customer = {
      ...data,
      id: "cust-" + crypto.randomUUID().slice(0, 8),
      phone: (data.phone || "").replace(/[^0-9]/g, ""),
      wallet_balance: data.wallet_balance !== undefined ? data.wallet_balance : 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      is_verified: data.is_verified !== undefined ? data.is_verified : false,
      provider: data.provider || "local",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!globalStore.__bmgh_customers) globalStore.__bmgh_customers = [];
    globalStore.__bmgh_customers.unshift(newCustomer);
    invalidateServerCache("customers");
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("customers").insert([newCustomer]);
      } catch (err) {
        console.warn("Supabase customer create error:", err);
      }
    }

    return newCustomer;
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    invalidateServerCache("customers");
    const all = await this.getCustomers();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin
          .from("customers")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id);
      } catch (err) {
        console.warn("Supabase customer update error:", err);
      }
    }
    return all[idx];
  },

  async creditCustomerWallet(
    customerId: string,
    amount: number,
    reference: string,
    paystackRef?: string,
    description: string = "Wallet Deposit via Paystack"
  ): Promise<{ success: boolean; customer: Customer; new_balance: number }> {
    const cust = await this.getCustomerById(customerId);
    if (!cust) throw new Error("Customer account not found");

    const creditAmount = Number(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) throw new Error("Invalid deposit amount");

    // Check duplicate reference in transactions
    const txs = await this.getCustomerTransactions(customerId);
    const existing = txs.find(
      (t) => t.reference === reference || (paystackRef && t.paystack_ref === paystackRef)
    );
    if (existing) {
      return { success: true, customer: cust, new_balance: cust.wallet_balance };
    }

    const newBalance = Number(((cust.wallet_balance || 0) + creditAmount).toFixed(2));
    cust.wallet_balance = newBalance;
    await this.updateCustomer(customerId, { wallet_balance: newBalance });

    await this.createCustomerTransaction({
      customer_id: customerId,
      amount: creditAmount,
      type: "deposit",
      reference,
      paystack_ref: paystackRef || reference,
      status: "success",
      description,
    });

    return { success: true, customer: cust, new_balance: newBalance };
  },

  async debitCustomerWallet(
    customerId: string,
    amount: number,
    reference: string,
    description: string = "Data Bundle Purchase"
  ): Promise<{ success: boolean; customer: Customer; new_balance: number }> {
    const cust = await this.getCustomerById(customerId);
    if (!cust) throw new Error("Customer account not found");

    const debitAmount = Number(amount);
    if (isNaN(debitAmount) || debitAmount <= 0) throw new Error("Invalid debit amount");

    if ((cust.wallet_balance || 0) < debitAmount) {
      throw new Error(
        `Insufficient wallet balance. You have GHS ${Number(cust.wallet_balance || 0).toFixed(2)}.`
      );
    }

    const newBalance = Number(((cust.wallet_balance || 0) - debitAmount).toFixed(2));
    cust.wallet_balance = newBalance;
    await this.updateCustomer(customerId, { wallet_balance: newBalance });

    await this.createCustomerTransaction({
      customer_id: customerId,
      amount: -debitAmount,
      type: "purchase",
      reference,
      paystack_ref: "WALLET_BAL",
      status: "success",
      description,
    });

    return { success: true, customer: cust, new_balance: newBalance };
  },

  async getCustomerTransactions(customerId?: string): Promise<CustomerTransaction[]> {
    if (
      isCacheFresh("customer_transactions", CACHE_TTLS.customer_transactions) &&
      globalStore.__bmgh_customer_transactions
    ) {
      if (customerId) {
        return globalStore.__bmgh_customer_transactions.filter((t) => t.customer_id === customerId);
      }
      return globalStore.__bmgh_customer_transactions;
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from("customer_transactions")
          .select("*")
          .order("created_at", { ascending: false });
        if (customerId) {
          query = query.eq("customer_id", customerId);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          const list = data.map((t: any) => ({ ...t, amount: Number(t.amount || 0) }));
          if (!customerId) {
            globalStore.__bmgh_customer_transactions = list;
            markCacheFresh("customer_transactions");
            saveToDisk();
          }
          return list;
        }
      } catch (err) {
        console.warn("Supabase customer_transactions fetch error:", err);
      }
    }

    if (!globalStore.__bmgh_customer_transactions) globalStore.__bmgh_customer_transactions = [];
    markCacheFresh("customer_transactions");
    if (customerId) {
      return globalStore.__bmgh_customer_transactions.filter((t) => t.customer_id === customerId);
    }
    return globalStore.__bmgh_customer_transactions;
  },

  async createCustomerTransaction(
    data: Omit<CustomerTransaction, "id" | "created_at">
  ): Promise<CustomerTransaction> {
    const newTx: CustomerTransaction = {
      ...data,
      id: "ctx-" + crypto.randomUUID().slice(0, 8),
      amount: Number(data.amount),
      created_at: new Date().toISOString(),
    };

    if (!globalStore.__bmgh_customer_transactions) globalStore.__bmgh_customer_transactions = [];
    globalStore.__bmgh_customer_transactions.unshift(newTx);
    invalidateServerCache("customer_transactions");
    saveToDisk();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("customer_transactions").insert([newTx]);
      } catch (err) {
        console.warn("Supabase customer transaction create error:", err);
      }
    }

    return newTx;
  },
};

