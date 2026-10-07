import { db } from "./db";

export interface ChatMessageParam {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  success: boolean;
  reply: string;
  provider: "gemini" | "grok" | "openai" | "local";
  modelUsed: string;
  error?: string;
}

/**
 * Builds standard system instructions with current store catalog,
 * telecom guidelines, order tracking, and Ghanaian customer care tone.
 */
export async function buildCustomerSupportSystemPrompt(extraContext?: string): Promise<string> {
  const settings = await db.getSettings();
  const products = await db.getProducts();

  // Group products by network
  const mtnProducts = products.filter((p) => p.is_active && p.network.toLowerCase() === "mtn");
  const telecelProducts = products.filter((p) => p.is_active && p.network.toLowerCase() === "telecel");
  const atProducts = products.filter((p) => p.is_active && p.network.toLowerCase() === "at");

  const formatList = (prods: typeof products) =>
    prods.length > 0
      ? prods.map((p) => `${p.size}: GHS ${p.price.toFixed(2)}`).join(" | ")
      : "Contact support for available sizes";

  return `You are "Kofi", the friendly, super-efficient AI Customer Support Specialist for "${settings.store_name}" (Ghana's premier instant mobile data portal).

=== STORE INFORMATION ===
• Store Name: ${settings.store_name}
• Official WhatsApp Number: +${settings.whatsapp_number}
• Official WhatsApp Channel: ${settings.whatsapp_channel_url || `https://wa.me/${settings.whatsapp_number}`}
• Support Phone: ${settings.support_phone}
• Live Catalog:
  - MTN Data: ${formatList(mtnProducts)}
  - Telecel Data: ${formatList(telecelProducts)}
  - AT (AirtelTigo) Data: ${formatList(atProducts)}

=== IMPORTANT BUSINESS RULES YOU MUST KNOW & ENFORCE ===
1. Automated Delivery: All data orders are credited to the customer's phone line automatically in under 60 seconds (usually 15 - 45s).
2. Payment: Processed securely via Paystack. Supports MTN Mobile Money, Telecel Cash, AT Money, and Visa/Mastercard.
3. Order Tracking: Customers can track their orders at /track using their Order Reference (e.g., BMGH-98234120) or recipient phone number.
4. Wrong Numbers: Phone numbers entered mistakenly cannot be refunded once delivered by the telecom gateway.
5. Duplicate Prevention: Advise customers to wait 5 minutes after a bundle arrives before ordering again on the same line to avoid telecom queue delays.
6. Ineligible SIMs: Turbonet, Broadband, Agent SIMs, and Ported SIMs are not eligible for standard consumer bundles.
7. Brand New MTN SIMs: Brand new SIMs are subject to MTN's new-beneficiary freeze and cannot receive bundles until fully activated with MTN.
8. Store Links:
   - Buy MTN: /buy/mtn
   - Buy Telecel: /buy/telecel
   - Buy AT: /buy/at
   - Track Order: /track

=== YOUR PERSONALITY & TONE ===
• Friendly, respectful, warm Ghanaian customer service. Use natural expressions when appropriate (e.g., "Welcome bossu!", "Hello dear", "Right away bossu").
• Keep replies concise, helpful, and formatted with clean bullet points or short paragraphs.
• If asked to track an order and details are provided in context, give the customer the exact live status with reassurance.
• If the customer wants human takeover, politely provide the WhatsApp link (${settings.whatsapp_channel_url || `https://wa.me/${settings.whatsapp_number}`}).

${extraContext ? `\n=== LIVE ORDER / CUSTOMER CONTEXT ===\n${extraContext}` : ""}`;
}

/**
 * 1. Call Google Gemini API
 */
async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: ChatMessageParam[],
  apiKey: string,
  model = "gemini-2.0-flash"
): Promise<{ reply: string; model: string }> {
  // Cascades starting with the selected model, rotating through all Gemini variants
  const modelsToTry = Array.from(
    new Set([
      model,
      "gemini-3.8-flash",
      "gemini-3.8-lite",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.1-pro",
      "gemini-3.0-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
    ])
  );

  let lastError = "";

  for (const mod of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${apiKey}`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      // Add recent history (up to last 6 messages)
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        });
      }

      // Add current user prompt
      contents.push({
        role: "user",
        parts: [{ text: userMessage }],
      });

      const body = {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = `Gemini (${mod}) status ${res.status}: ${errText.substring(0, 150)}`;
        console.warn(`[AI Rotator] ${lastError}`);
        continue; // Try next gemini model
      }

      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { reply: text.trim(), model: mod };
      }
    } catch (e: any) {
      lastError = e?.message || "Gemini network error";
      console.warn(`[AI Rotator] Gemini exception on ${mod}:`, lastError);
    }
  }

  throw new Error(`Gemini rotation failed: ${lastError}`);
}

/**
 * 2. Call xAI Grok API
 */
async function callGrok(
  systemPrompt: string,
  userMessage: string,
  history: ChatMessageParam[],
  apiKey: string,
  model = "grok-2-latest"
): Promise<{ reply: string; model: string }> {
  const modelsToTry = [model, "grok-beta"];
  let lastError = "";

  for (const mod of modelsToTry) {
    try {
      const url = "https://api.x.ai/v1/chat/completions";

      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      for (const h of history.slice(-6)) {
        messages.push({
          role: h.role === "assistant" ? "assistant" : "user",
          content: h.content,
        });
      }

      messages.push({ role: "user", content: userMessage });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: mod,
          messages,
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = `Grok (${mod}) status ${res.status}: ${errText.substring(0, 150)}`;
        console.warn(`[AI Rotator] ${lastError}`);
        continue;
      }

      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      if (text) {
        return { reply: text.trim(), model: mod };
      }
    } catch (e: any) {
      lastError = e?.message || "Grok network error";
      console.warn(`[AI Rotator] Grok exception on ${mod}:`, lastError);
    }
  }

  throw new Error(`Grok rotation failed: ${lastError}`);
}

/**
 * 3. Call OpenAI API
 */
async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  history: ChatMessageParam[],
  apiKey: string,
  model = "gpt-4o-mini"
): Promise<{ reply: string; model: string }> {
  const modelsToTry = [model, "gpt-4o", "gpt-3.5-turbo"];
  let lastError = "";

  for (const mod of modelsToTry) {
    try {
      const url = "https://api.openai.com/v1/chat/completions";

      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      for (const h of history.slice(-6)) {
        messages.push({
          role: h.role === "assistant" ? "assistant" : "user",
          content: h.content,
        });
      }

      messages.push({ role: "user", content: userMessage });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: mod,
          messages,
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = `OpenAI (${mod}) status ${res.status}: ${errText.substring(0, 150)}`;
        console.warn(`[AI Rotator] ${lastError}`);
        continue;
      }

      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      if (text) {
        return { reply: text.trim(), model: mod };
      }
    } catch (e: any) {
      lastError = e?.message || "OpenAI network error";
      console.warn(`[AI Rotator] OpenAI exception on ${mod}:`, lastError);
    }
  }

  throw new Error(`OpenAI rotation failed: ${lastError}`);
}

/**
 * 4. Smart Local Ghanaian Assistant Engine (Fallback if all external APIs are missing or exhausted)
 */
async function generateLocalAssistantReply(userMessage: string, context?: string): Promise<string> {
  const settings = await db.getSettings();
  const lower = userMessage.toLowerCase();
  const whatsappUrl = settings.whatsapp_channel_url || `https://wa.me/${settings.whatsapp_number}`;

  // If order context was already retrieved
  if (context && context.includes("ORDER FOUND:")) {
    return `Hello bossu! I found your order details in our system:\n\n${context.replace("ORDER FOUND:", "").trim()}\n\nIf you have any questions or need a quick recheck, feel free to ask or connect with us directly on WhatsApp (${settings.whatsapp_number})!`;
  }

  // Price inquiries
  if (lower.includes("price") || lower.includes("cost") || lower.includes("rate") || lower.includes("how much")) {
    const products = await db.getProducts();
    const mtn = products.filter((p) => p.is_active && p.network === "mtn").map((p) => `• ${p.size}: GHS ${p.price}`).slice(0, 4);
    const telecel = products.filter((p) => p.is_active && p.network === "telecel").map((p) => `• ${p.size}: GHS ${p.price}`).slice(0, 4);
    const at = products.filter((p) => p.is_active && p.network === "at").map((p) => `• ${p.size}: GHS ${p.price}`).slice(0, 4);

    return `Hello bossu! Here are our best wholesale rates on ${settings.store_name}:\n\n` +
      `🟡 **MTN Turbo Data:**\n${mtn.join("\n") || "Available on store page"}\n\n` +
      `🔴 **Telecel Fast Data:**\n${telecel.join("\n") || "Available on store page"}\n\n` +
      `🔵 **AT (AirtelTigo):**\n${at.join("\n") || "Available on store page"}\n\n` +
      `👉 Tap **"Buy"** at the top or visit /buy/mtn to place your order now with instant 60-second delivery!`;
  }

  // Order tracking
  if (lower.includes("track") || lower.includes("where is my data") || lower.includes("not received") || lower.includes("order")) {
    return `Hello bossu! You can track your data order instantly on our live tracking page:\n\n` +
      `👉 **Go to Tracking:** [/track](/track)\n\n` +
      `Just enter your Order Reference (e.g., BMGH-98234120) or recipient phone number. If payment is completed, your bundle is automatically pushed to your SIM within 60 seconds!`;
  }

  // Delivery speed
  if (lower.includes("how long") || lower.includes("delivery") || lower.includes("time") || lower.includes("speed")) {
    return `All data bundles on **${settings.store_name}** are 100% automated! ⚡\n\n` +
      `Delivery typically completes in **15 to 60 seconds** directly to your phone line after payment. You will receive an official telecom SMS confirmation immediately.`;
  }

  // WhatsApp / Human agent
  if (lower.includes("whatsapp") || lower.includes("channel") || lower.includes("call") || lower.includes("human") || lower.includes("agent") || lower.includes("person")) {
    return `Sure bossu! You can connect with our live human team and join our official updates channel right here:\n\n` +
      `💬 **WhatsApp Channel & Live Agent:**\n${whatsappUrl}\n\n` +
      `📞 **Phone Call:** ${settings.support_phone}\n\nOur team is available 24/7 to assist you with any questions!`;
  }

  // Default helpful response
  return `Hello bossu! Welcome to **${settings.store_name}** Customer Care.\n\n` +
    `How can I assist you today?\n` +
    `• 📱 **Check Data Prices & Networks**\n` +
    `• 🔍 **Track an Existing Order** (provide your BMGH reference or phone number)\n` +
    `• ⚡ **Delivery Inquiries & Network Issues**\n` +
    `• 💬 **Join Our WhatsApp Channel:** ${whatsappUrl}`;
}

/**
 * MAIN DISPATCHER: Executes model rotation
 * Order: 1. Google Gemini ➔ 2. xAI Grok ➔ 3. OpenAI ➔ 4. Local Engine
 */
export async function askCustomerSupportAI(params: {
  userMessage: string;
  history?: Array<{ role?: string; sender?: string; content?: string; text?: string }>;
  extraContext?: string;
}): Promise<AIResponse> {
  const settings = await db.getSettings();
  const systemPrompt = await buildCustomerSupportSystemPrompt(params.extraContext);

  // Normalize history
  const normalizedHistory: ChatMessageParam[] = (params.history || []).map((h) => ({
    role: (h.role || (h.sender === "ai" ? "assistant" : "user")) as "user" | "assistant",
    content: h.content || h.text || "",
  }));

  const errors: string[] = [];

  // 1. PRIORITY 1: Google Gemini
  const geminiKey = (settings.gemini_api_key || process.env.GEMINI_API_KEY || "").trim();
  if (geminiKey) {
    try {
      console.log(`[AI Rotator] Attempting Primary: Google Gemini (${settings.gemini_model || "gemini-2.5-flash"})...`);
      const res = await callGemini(
        systemPrompt,
        params.userMessage,
        normalizedHistory,
        geminiKey,
        settings.gemini_model || "gemini-2.5-flash"
      );
      return {
        success: true,
        reply: res.reply,
        provider: "gemini",
        modelUsed: res.model,
      };
    } catch (err: any) {
      console.warn("[AI Rotator] Gemini exhausted / failed, rotating to Grok:", err.message);
      errors.push(`Gemini: ${err.message}`);
    }
  }

  // 2. PRIORITY 2: xAI Grok
  const grokKey = (settings.grok_api_key || process.env.GROK_API_KEY || "").trim();
  if (grokKey) {
    try {
      console.log(`[AI Rotator] Rotating to Secondary: xAI Grok (${settings.grok_model || "grok-2-latest"})...`);
      const res = await callGrok(
        systemPrompt,
        params.userMessage,
        normalizedHistory,
        grokKey,
        settings.grok_model || "grok-2-latest"
      );
      return {
        success: true,
        reply: res.reply,
        provider: "grok",
        modelUsed: res.model,
      };
    } catch (err: any) {
      console.warn("[AI Rotator] Grok exhausted / failed, rotating to OpenAI:", err.message);
      errors.push(`Grok: ${err.message}`);
    }
  }

  // 3. PRIORITY 3: OpenAI
  const openaiKey = (settings.openai_api_key || process.env.OPENAI_API_KEY || "").trim();
  if (openaiKey) {
    try {
      console.log(`[AI Rotator] Rotating to Tertiary: OpenAI (${settings.openai_model || "gpt-4o-mini"})...`);
      const res = await callOpenAI(
        systemPrompt,
        params.userMessage,
        normalizedHistory,
        openaiKey,
        settings.openai_model || "gpt-4o-mini"
      );
      return {
        success: true,
        reply: res.reply,
        provider: "openai",
        modelUsed: res.model,
      };
    } catch (err: any) {
      console.warn("[AI Rotator] OpenAI exhausted / failed, falling back to Local Engine:", err.message);
      errors.push(`OpenAI: ${err.message}`);
    }
  }

  // 4. PRIORITY 4: Built-in Intelligent Local Support Engine
  console.log("[AI Rotator] Using Local Smart Assistant Engine...");
  const localReply = await generateLocalAssistantReply(params.userMessage, params.extraContext);
  return {
    success: true,
    reply: localReply,
    provider: "local",
    modelUsed: "local-assistant-v1",
    error: errors.length > 0 ? errors.join(" | ") : undefined,
  };
}

/**
 * Diagnostic tool: Test individual provider credentials
 */
export async function testAIProvider(
  provider: "gemini" | "grok" | "openai",
  apiKey: string,
  model?: string
): Promise<{ success: boolean; message: string; modelUsed?: string }> {
  const cleanKey = (apiKey || "").trim();
  if (!cleanKey) {
    return { success: false, message: `Please enter an API key for ${provider.toUpperCase()}` };
  }

  const testPrompt = "Hello! Please reply in one short sentence confirming you are online and working.";

  try {
    if (provider === "gemini") {
      const targetModel = model || "gemini-2.5-flash";
      const res = await callGemini("You are a helpful assistant.", testPrompt, [], cleanKey, targetModel);
      return { success: true, message: `Connected to Google Gemini (${res.model})! Reply: "${res.reply}"`, modelUsed: res.model };
    }

    if (provider === "grok") {
      const targetModel = model || "grok-2-latest";
      const res = await callGrok("You are a helpful assistant.", testPrompt, [], cleanKey, targetModel);
      return { success: true, message: `Connected to xAI Grok (${res.model})! Reply: "${res.reply}"`, modelUsed: res.model };
    }

    if (provider === "openai") {
      const targetModel = model || "gpt-4o-mini";
      const res = await callOpenAI("You are a helpful assistant.", testPrompt, [], cleanKey, targetModel);
      return { success: true, message: `Connected to OpenAI (${res.model})! Reply: "${res.reply}"`, modelUsed: res.model };
    }

    return { success: false, message: "Unknown provider" };
  } catch (err: any) {
    return { success: false, message: err?.message || `Failed to connect to ${provider}` };
  }
}
