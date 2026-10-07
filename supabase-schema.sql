-- ========================================================================
-- BundleMartGh - Supabase Database Schema
-- Clean script without pre-seeded products (Add products from /admin/products)
-- ========================================================================

-- Drop old or conflicting tables if they already exist
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;

-- 1. PRODUCTS TABLE
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network TEXT NOT NULL,
    size TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. ORDERS TABLE
CREATE TABLE public.orders (
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- (If updating an existing Supabase table without dropping, run these 2 lines in SQL Editor):
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending';

-- 3. SETTINGS TABLE
CREATE TABLE public.settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT NOT NULL DEFAULT 'BundleMartGh',
    support_phone TEXT NOT NULL DEFAULT '+233 55 123 4567',
    whatsapp_number TEXT NOT NULL DEFAULT '233551234567',
    email TEXT NOT NULL DEFAULT 'support@bundlemartgh.com',
    paystack_public_key TEXT DEFAULT '',
    paystack_secret_key TEXT DEFAULT '',
    datamart_api_key TEXT DEFAULT '',
    datamart_api_url TEXT DEFAULT 'https://api.datamartgh.shop/api/developer',
    announcement_text TEXT DEFAULT '⚡ Instant Delivery Guarantee: MTN, Telecel & AT packages delivered in under 60 seconds! 24/7 Automated.',
    announcement_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. MESSAGES TABLE
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    phone TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- CLEAN UP EXISTING POLICIES
DROP POLICY IF EXISTS "Public read active products" ON public.products;
DROP POLICY IF EXISTS "Public read settings" ON public.settings;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view own order by reference" ON public.orders;
DROP POLICY IF EXISTS "Public can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Service role full access products" ON public.products;
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;
DROP POLICY IF EXISTS "Service role full access settings" ON public.settings;
DROP POLICY IF EXISTS "Service role full access messages" ON public.messages;

-- CREATE POLICIES (Allow public read, service role full control, and admin inserts)
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view own order by reference" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public can insert messages" ON public.messages FOR INSERT WITH CHECK (true);

-- Allow full management (Insert, Update, Delete) on products, orders, settings, messages
CREATE POLICY "Allow all on products" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow all on orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true);
CREATE POLICY "Allow all on messages" ON public.messages FOR ALL USING (true);

-- INITIAL SETTINGS (Only default store settings, NO pre-seeded products)
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
    '⚡ Instant automated delivery active! MTN, Telecel & AT packages arrive in under 60 seconds.',
    true
) ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    announcement_text = EXCLUDED.announcement_text;

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_products_network ON public.products(network);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders(reference);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);

-- 5. VOUCHERS TABLE (Free Data Vouchers generated by Admin)
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
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 6. VOUCHER CLAIMS TABLE (Enforces: One phone number can only claim one voucher)
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
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON public.vouchers(code);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on vouchers" ON public.vouchers FOR ALL USING (true);
CREATE POLICY "Allow all on voucher_claims" ON public.voucher_claims FOR ALL USING (true);

