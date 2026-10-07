# BundleMartGh 🚀

Full-Stack, automated mobile data bundle selling platform for Ghana.

- **Frontend:** Next.js 16 App Router, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend:** Next.js API Routes (Node.js runtime)
- **Database:** Supabase PostgreSQL with automated fallback
- **Payment Gateway:** Paystack Inline Mobile Money & Card
- **Data Delivery:** DataMart API automated telco delivery
- **Deployment:** Vercel ready

---

## ⚡ Quick Start

### 1. Install & Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- Customer Store: [http://localhost:3000](http://localhost:3000)
- MTN Packages: [http://localhost:3000/buy/mtn](http://localhost:3000/buy/mtn)
- Telecel Packages: [http://localhost:3000/buy/telecel](http://localhost:3000/buy/telecel)
- AT Packages: [http://localhost:3000/buy/at](http://localhost:3000/buy/at)
- Track Order: [http://localhost:3000/track](http://localhost:3000/track)
- Admin Portal: [http://localhost:3000/admin](http://localhost:3000/admin) (Password: `bundlemart2026`)

---

## 🗄️ Supabase Database Setup

1. Create a project on [Supabase](https://app.supabase.com).
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Open [`supabase-schema.sql`](./supabase-schema.sql), copy its entire contents, and run it.
4. It will create:
   - `products` (managed via `/admin/products`)
   - `orders` (with unique reference IDs like `BMGH-XXXXXXXX`)
   - `settings` (store info, Paystack keys, DataMart API config, announcement toggle)
   - `messages` (customer contact inquiries)
   - Row Level Security (RLS) policies and performance indexes.
5. In your `.env.local` or Vercel dashboard, provide:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxx
   PAYSTACK_SECRET_KEY=sk_live_xxxx
   DATAMART_API_KEY=dm_live_xxxx
   DATAMART_API_URL=https://api.datamartgh.com/v1
   ADMIN_PASSWORD=bundlemart2026
   ```

---

## 💳 Paystack & DataMart Integration Flow

1. Customer selects package (e.g. MTN 5GB for GHS 28.50).
2. Customer enters their Ghanaian mobile number (with telco prefix detection).
3. Paystack inline payment verifies transaction.
4. System automatically calls `/api/orders/create` with generated reference `BMGH-XXXXXXXX`.
5. Server instantly triggers DataMart API:
   ```json
   {
     "network": "mtn",
     "package": "5GB",
     "phone": "055XXXXXXX",
     "reference": "BMGH-87654321"
   }
   ```
6. On success, order marks `delivered` and customer is redirected to `/receipt/[reference]` with celebratory confetti.

---

## 🤖 AI Agent Action Feature (`/admin/ai-agent`)

The admin panel features an interactive **AI Copilot** that takes real actions:
- `updateOrderStatus(orderId, status)`
- `sendSMS(phone, message)`
- `getOrderDetails(orderIdOrRef)`
- `refundOrder(orderId)`

When you type:
> *"mark order BMGH-98234120 as delivered"*

The AI executes the update and confirms:
> **"Done bossu, marked order BMGH-98234120 as delivered."**

---

## 🚢 Deploying to Vercel

```bash
git add .
git commit -m "BundleMartGh production ready"
git push
```
Connect your repository in [Vercel](https://vercel.com) and add the environment variables from [`.env.example`](./.env.example).
