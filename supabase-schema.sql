-- ========================================================================
-- BundleMartGh / FastData - Complete Supabase Database Schema
-- Run this complete script in the SQL Editor of your new Supabase project.
-- ========================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================================
-- 1. PRODUCTS TABLE
-- Main storefront packages (MTN, Telecel, AT)
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network TEXT NOT NULL,
    size TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_network ON public.products(network);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- ========================================================================
-- 2. ORDERS TABLE
-- Customer orders from the main website and developer API
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT UNIQUE NOT NULL,
    network TEXT NOT NULL,
    package_size TEXT NOT NULL,
    phone TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    paystack_ref TEXT,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    delivery_status TEXT NOT NULL DEFAULT 'pending',
    status TEXT NOT NULL DEFAULT 'pending',
    datamart_response JSONB DEFAULT '{}'::jsonb,
    source TEXT DEFAULT 'web',
    api_key_id TEXT,
    developer_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders(reference);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_paystack_ref ON public.orders(paystack_ref);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ========================================================================
-- 3. SETTINGS TABLE
-- Global store configuration, API keys, AI settings & data stores
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT NOT NULL DEFAULT 'BundleMartGh',
    support_phone TEXT NOT NULL DEFAULT '+233 55 123 4567',
    whatsapp_number TEXT NOT NULL DEFAULT '233551234567',
    whatsapp_channel_url TEXT DEFAULT '',
    email TEXT NOT NULL DEFAULT 'support@bundlemartgh.com',
    paystack_public_key TEXT DEFAULT '',
    paystack_secret_key TEXT DEFAULT '',
    datamart_api_key TEXT DEFAULT '',
    datamart_api_url TEXT DEFAULT 'https://api.datamartgh.shop/api/developer',
    announcement_text TEXT DEFAULT '⚡ Instant Delivery Guarantee: MTN, Telecel & AT packages delivered in under 60 seconds! 24/7 Automated.',
    announcement_active BOOLEAN NOT NULL DEFAULT true,
    gemini_api_key TEXT DEFAULT '',
    gemini_model TEXT DEFAULT 'gemini-2.5-flash',
    groq_api_key TEXT DEFAULT '',
    groq_model TEXT DEFAULT 'llama-3.3-70b-versatile',
    grok_api_key TEXT DEFAULT '',
    grok_model TEXT DEFAULT 'grok-2-latest',
    openai_api_key TEXT DEFAULT '',
    openai_model TEXT DEFAULT 'gpt-4o-mini',
    ai_system_instructions TEXT DEFAULT '',
    resend_api_key TEXT DEFAULT '',
    smtp_user TEXT DEFAULT '',
    smtp_pass TEXT DEFAULT '',
    smtp_host TEXT DEFAULT '',
    smtp_port INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed default settings record if not exists
INSERT INTO public.settings (
    id, store_name, support_phone, whatsapp_number, email, 
    paystack_public_key, paystack_secret_key, datamart_api_key, datamart_api_url, 
    announcement_text, announcement_active
) VALUES (
    'default',
    'BundleMartGh',
    '+233 55 123 4567',
    '233551234567',
    'support@bundlemartgh.com',
    '',
    '',
    '',
    'https://api.datamartgh.shop/api/developer',
    '⚡ Instant Delivery Guarantee: MTN, Telecel & AT packages delivered in under 60 seconds! 24/7 Automated.',
    true
) ON CONFLICT (id) DO NOTHING;

-- ========================================================================
-- 4. MESSAGES TABLE
-- Live chat, customer support inquiries & AI replies
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    phone TEXT,
    message TEXT NOT NULL,
    image_url TEXT,
    reply TEXT,
    replied_at TIMESTAMPTZ,
    ai_reply TEXT,
    ai_replied_at TIMESTAMPTZ,
    session_id TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);

-- ========================================================================
-- 5. VOUCHERS TABLE
-- Free promotional data voucher drops
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    network TEXT NOT NULL,
    package_size TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '🎁 FREE DATA VOUCHER DROP! Type code to claim instantly.',
    max_claims INTEGER NOT NULL DEFAULT 1,
    claimed_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON public.vouchers(code);

-- ========================================================================
-- 6. VOUCHER CLAIMS TABLE
-- Prevents duplicate claims from the same phone number
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.voucher_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE,
    voucher_code TEXT NOT NULL,
    phone TEXT NOT NULL,
    network TEXT NOT NULL,
    package_size TEXT NOT NULL,
    order_reference TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_voucher_claims_phone ON public.voucher_claims(phone);

-- ========================================================================
-- 7. AGENTS TABLE
-- Reseller agents, white-labeled storefront accounts & wallets
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    store_name TEXT NOT NULL,
    store_slug TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    momo_number TEXT,
    momo_network TEXT,
    description TEXT,
    logo_url TEXT DEFAULT '/agent-icon.png',
    password_hash TEXT NOT NULL,
    theme TEXT DEFAULT 'emerald',
    wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_earned NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_withdrawn NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    registration_paid BOOLEAN NOT NULL DEFAULT true,
    login_otp TEXT,
    login_otp_expires BIGINT,
    withdrawal_otp TEXT,
    withdrawal_otp_expires BIGINT,
    reset_otp TEXT,
    reset_otp_expires BIGINT,
    custom_prices JSONB DEFAULT '{}'::jsonb,
    cloaked_url TEXT,
    whatsapp_number TEXT,
    whatsapp_channel_url TEXT,
    support_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_agents_store_slug ON public.agents(store_slug);
CREATE INDEX IF NOT EXISTS idx_agents_email ON public.agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_phone ON public.agents(phone);

-- ========================================================================
-- 8. AGENT BASE PRODUCTS TABLE
-- Wholesale base packages configured by Admin for agents
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.agent_base_products (
    id TEXT PRIMARY KEY,
    network TEXT NOT NULL,
    size TEXT NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    suggested_price NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_agent_base_products_network ON public.agent_base_products(network);

-- ========================================================================
-- 9. AGENT CUSTOM PRODUCTS TABLE
-- Custom prices set by each agent for their storefront
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.agent_products (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    base_product_id TEXT NOT NULL,
    network TEXT NOT NULL,
    size TEXT NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    selling_price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_agent_products_agent_id ON public.agent_products(agent_id);

-- ========================================================================
-- 10. AGENT ORDERS TABLE
-- Orders placed by customers on agent storefronts
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.agent_orders (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    reference TEXT UNIQUE NOT NULL,
    network TEXT NOT NULL,
    package_size TEXT NOT NULL,
    phone TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    agent_profit NUMERIC(10, 2) NOT NULL,
    paystack_ref TEXT,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    delivery_status TEXT NOT NULL DEFAULT 'pending',
    status TEXT NOT NULL DEFAULT 'pending',
    datamart_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_agent_orders_agent_id ON public.agent_orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_orders_reference ON public.agent_orders(reference);
CREATE INDEX IF NOT EXISTS idx_agent_orders_created_at ON public.agent_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_orders_phone ON public.agent_orders(phone);

-- ========================================================================
-- 11. AGENT WITHDRAWALS TABLE
-- Agent profit withdrawal requests & payout records
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.agent_withdrawals (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    momo_number TEXT NOT NULL,
    momo_network TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    verification_code TEXT,
    verified BOOLEAN NOT NULL DEFAULT true,
    note TEXT,
    paystack_transfer_code TEXT,
    paystack_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_agent_id ON public.agent_withdrawals(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_status ON public.agent_withdrawals(status);

-- ========================================================================
-- 12. CUSTOMERS TABLE
-- Storefront customer accounts with Paystack wallet deposits
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    provider TEXT NOT NULL DEFAULT 'local',
    google_id TEXT,
    avatar_url TEXT,
    verification_code TEXT,
    verification_code_expires_at BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- ========================================================================
-- 13. CUSTOMER TRANSACTIONS TABLE
-- Wallet deposits via Paystack, bundle purchases, and transaction ledger
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.customer_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type TEXT NOT NULL DEFAULT 'deposit',
    reference TEXT UNIQUE NOT NULL,
    paystack_ref TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer ON public.customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_ref ON public.customer_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_created ON public.customer_transactions(created_at DESC);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS and allow full access for the application service role & public APIs
-- ========================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_base_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "Allow all on products" ON public.products;
DROP POLICY IF EXISTS "Allow all on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all on vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Allow all on voucher_claims" ON public.voucher_claims;
DROP POLICY IF EXISTS "Allow all on agents" ON public.agents;
DROP POLICY IF EXISTS "Allow all on agent_base_products" ON public.agent_base_products;
DROP POLICY IF EXISTS "Allow all on agent_products" ON public.agent_products;
DROP POLICY IF EXISTS "Allow all on agent_orders" ON public.agent_orders;
DROP POLICY IF EXISTS "Allow all on agent_withdrawals" ON public.agent_withdrawals;
DROP POLICY IF EXISTS "Allow all on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all on customer_transactions" ON public.customer_transactions;

-- Create open access policies for public storefront & backend
CREATE POLICY "Allow all on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vouchers" ON public.vouchers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on voucher_claims" ON public.voucher_claims FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on agents" ON public.agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on agent_base_products" ON public.agent_base_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on agent_products" ON public.agent_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on agent_orders" ON public.agent_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on agent_withdrawals" ON public.agent_withdrawals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on customer_transactions" ON public.customer_transactions FOR ALL USING (true) WITH CHECK (true);

-- ========================================================================
-- 14. SCHEMA MIGRATIONS (Run on existing databases to add new features)
-- ========================================================================
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS min_orders_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.voucher_claims ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.voucher_claims ADD COLUMN IF NOT EXISTS customer_orders_count INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pending_new_email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email_change_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email_change_expires_at BIGINT;
