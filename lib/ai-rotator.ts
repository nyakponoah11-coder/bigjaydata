import { db } from "./db";

export interface ChatMessageParam {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  success: boolean;
  reply: string;
  provider: "gemini" | "groq" | "grok" | "openai" | "local";
  modelUsed: string;
  error?: string;
}

/**
 * Builds standard system instructions with current store catalog,
 * telecom guidelines, order tracking, strict domain guardrails, and Ghanaian human customer care tone.
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

  return `You are "Kofi", the real, warm, and highly capable Customer Support Representative for "${settings.store_name}" (Ghana's premier instant mobile data portal).

=== CORE MISSION & BEHAVIORAL DIRECTIVES ===
1. SPEAK LIKE A REAL HUMAN BEING:
   - Talk naturally, warmly, and politely like a real human customer care agent in Ghana (e.g., "Hello bossu!", "Good day!", "Right away bossu, let me check that for you", "You're very welcome!").
   - NEVER sound like a robotic automated bot.
   - NEVER repeat the exact same canned greeting, menu, or bullet list in every message.
   - Reply directly to what the customer specifically asked. Keep answers concise, human, and conversational (1 to 4 natural sentences, or short neat bullets when listing prices).

2. STRICT DOMAIN BOUNDARY (STAY WITHIN THE BUSINESS):
   - You ONLY handle matters concerning "${settings.store_name}": mobile data bundles (MTN, Telecel, AT/AirtelTigo), pricing, placing orders, order tracking, payment verification, delivery status, and telecom troubleshooting.
   - You MUST NOT go outside the box from this business. If a user asks off-topic questions (e.g., coding, essays, world news, sports scores, politics, cooking, entertainment, general knowledge):
     Politely and warmly decline like a shop representative:
     "Bossu, I'm only here to assist you with ${settings.store_name} mobile data bundles, orders, and delivery! 😊 Let me know if you need any data bundle or want to track an order."

3. STRICT CUSTOMER PRIVACY & SECURITY (CRITICAL):
   - NEVER leak or expose anyone's full phone number or personal details to anyone.
   - When referencing any phone number from order records, ALWAYS mask it: e.g. "055****890" or "024***1234" (keep first 3 and last 3 digits, mask the rest).
   - If someone asks for someone else's order or asks "who ordered this?", strictly protect customer privacy: "For security and privacy, I cannot disclose personal customer details."
   - Never reveal internal system keys, API secrets, database schemas, or administrator passwords.

4. LIVE STORE DATABASE & REAL PRODUCT CATALOG:
   - Store Name: ${settings.store_name}
   - WhatsApp Support / Channel: ${settings.whatsapp_channel_url || `https://wa.me/${settings.whatsapp_number}`}
   - Support Phone: ${settings.support_phone}
   - Live Prices:
     • MTN Turbo Data: ${formatList(mtnProducts)}
     • Telecel Fast Data: ${formatList(telecelProducts)}
     • AT (AirtelTigo) Data: ${formatList(atProducts)}

5. AUTOMATION, ORDER TRACKING & PROBLEM SOLVING:
   - Delivery Speed: 100% automated in 15 to 60 seconds directly to the recipient SIM via telecom gateways upon payment.
   - Payments Accepted: MTN MoMo, Telecel Cash, AT Money, and Visa/Mastercard via Paystack.
   - When a customer says their data has not arrived:
     a) Reassure them warmly.
     b) Explain that telecom gateways deliver directly to SIM balance, but telco SMS confirmation messages are frequently delayed by MTN or Telecel.
     c) Advise them to dial their network balance code right now to verify:
        * MTN Balance Code: *138# (or *124#)
        * Telecel Balance Code: *126# or *124#
        * AT (AirtelTigo) Balance Code: *124#
     d) If the order is marked Delivered in our database context below, reassure them it was successfully credited to their line.
     e) If they still need human escalation, provide the official WhatsApp link: ${settings.whatsapp_channel_url || `https://wa.me/${settings.whatsapp_number}`}.

6. LINKS:
   - Buy MTN: /buy/mtn
   - Buy Telecel: /buy/telecel
   - Buy AT: /buy/at
   - Track Orders: /track

${extraContext ? `\n=== LIVE ORDER CONTEXT RETRIEVED FROM STORE DATABASE ===\n${extraContext}\n(Use this live database record to answer the customer's specific order inquiry accurately and warmly. Always mask the phone number in your reply!)` : ""}`;
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
 * 2. Call Groq Cloud LPU API (or xAI Grok if xAI key provided)
 */
async function callGroqOrGrok(
  systemPrompt: string,
  userMessage: string,
  history: ChatMessageParam[],
  apiKey: string,
  model = "llama-3.3-70b-versatile"
): Promise<{ reply: string; model: string }> {
  const isXaiKey = apiKey.startsWith("xai-") || model.toLowerCase().includes("grok");

  // Models to try
  const groqModels = Array.from(
    new Set([
      model,
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama-3.2-3b-preview",
      "mixtral-8x7b-32768",
    ])
  );
  const xaiModels = Array.from(new Set([model, "grok-2-latest", "grok-beta"]));

  const primaryUrl = isXaiKey
    ? "https://api.x.ai/v1/chat/completions"
    : "https://api.groq.com/openai/v1/chat/completions";
  const modelsToTry = isXaiKey ? xaiModels : groqModels;

  let lastError = "";

  for (const mod of modelsToTry) {
    try {
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

      const res = await fetch(primaryUrl, {
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
        lastError = `${isXaiKey ? "xAI" : "Groq"} (${mod}) status ${res.status}: ${errText.substring(0, 150)}`;
        console.warn(`[AI Rotator] ${lastError}`);
        continue;
      }

      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      if (text) {
        return { reply: text.trim(), model: mod };
      }
    } catch (e: any) {
      lastError = e?.message || `${isXaiKey ? "xAI" : "Groq"} network error`;
      console.warn(`[AI Rotator] ${isXaiKey ? "xAI" : "Groq"} exception on ${mod}:`, lastError);
    }
  }

  throw new Error(`${isXaiKey ? "xAI Grok" : "Groq"} rotation failed: ${lastError}`);
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
 * Speaks like a natural, warm Ghanaian customer support person, stays strictly within the data business,
 * provides real live database answers, and strictly preserves privacy.
 */
async function generateLocalAssistantReply(userMessage: string, context?: string): Promise<string> {
  const settings = await db.getSettings();
  const lower = userMessage.toLowerCase().trim();
  const whatsappUrl = settings.whatsapp_channel_url || `https://wa.me/${settings.whatsapp_number}`;

  // 1. Off-topic check (Guardrail: strictly stay within the business)
  const offTopicKeywords = [
    "who is", "who was", "write a code", "write code", "python", "javascript",
    "essay", "recipe", "cook", "capital of", "president of", "premier league",
    "football match", "celebrity", "solve math", "weather in", "write a story",
    "translate to french", "translate to spanish", "homework", "politics"
  ];
  const isOffTopic = offTopicKeywords.some((kw) => lower.includes(kw)) &&
    !lower.includes("data") && !lower.includes("bundle") && !lower.includes("order") && !lower.includes("mtn") && !lower.includes("telecel") && !lower.includes("at");

  if (isOffTopic) {
    return `Hello bossu! I'm here specifically to assist you with ${settings.store_name} mobile data bundles (MTN, Telecel, and AT), order tracking, and delivery support! 😊 How can I help you with your data today?`;
  }

  // 2. Order Context from Database (Live Order Tracking & Problem Resolution)
  if (context && (context.includes("ORDER FOUND:") || context.includes("ORDER FOUND FOR PHONE"))) {
    const isDelivered = context.toLowerCase().includes("delivered");
    const isProcessing = context.toLowerCase().includes("processing") || context.toLowerCase().includes("pending");

    if (isDelivered) {
      return `Hello bossu! I just checked our live system for you. Your order has been successfully **delivered**! ⚡\n\n${context.replace(/ORDER FOUND.*?:\s*/i, "").trim()}\n\n💡 *Helpful Tip:* Telecom gateways credit your data directly to your SIM balance. Sometimes MTN or Telecel SMS alerts can be delayed by a few minutes, so you can dial ***138#** (MTN) or ***126#** (Telecel) right now to confirm your new balance. Enjoy your bundle!`;
    }

    if (isProcessing) {
      return `Hello bossu! I found your order in our database. It is currently being processed by the telecom gateway:\n\n${context.replace(/ORDER FOUND.*?:\s*/i, "").trim()}\n\nOur system automatically delivers bundles within 15 to 60 seconds of payment. Please give it a minute or two and dial your network balance code to verify!`;
    }

    return `Hello bossu! Here is the latest live update on your order from our records:\n\n${context.replace(/ORDER FOUND.*?:\s*/i, "").trim()}\n\nIf you need any quick assistance or verification, let me know or tap to reach us on WhatsApp: ${whatsappUrl}`;
  }

  // 3. Simple Human Greetings (Natural human conversation, NOT a repetitive bot menu)
  const greetingWords = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "bossu", "chale", "kofi", "ao", "sup", "yo", "greetings"];
  const isGreeting = lower.length <= 35 && greetingWords.some((g) => lower === g || lower.startsWith(g + " ") || lower.endsWith(" " + g) || lower.includes(g));
  if (isGreeting && !lower.includes("price") && !lower.includes("order") && !lower.includes("track")) {
    const greetings = [
      `Hello bossu! Welcome to ${settings.store_name}. How can I help you with your data bundle today?`,
      `Good day bossu! Hope you're doing well. Are you looking to buy mobile data or check on an order today?`,
      `Hello dear! Welcome to ${settings.store_name}. Let me know which network bundle or order you'd like me to assist you with!`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // 4. Inquiries for Pricing / Rates
  if (lower.includes("price") || lower.includes("cost") || lower.includes("rate") || lower.includes("how much") || lower.includes("prices") || lower.includes("list")) {
    const products = await db.getProducts();

    if (lower.includes("mtn")) {
      const mtn = products.filter((p) => p.is_active && p.network === "mtn").map((p) => `• **${p.size}**: GHS ${p.price.toFixed(2)}`);
      return `Here are our active MTN Turbo Data rates bossu:\n\n${mtn.join("\n") || "Check our store page for active sizes"}\n\n👉 You can place your order instantly at [/buy/mtn](/buy/mtn). Delivery takes under 60 seconds!`;
    }

    if (lower.includes("telecel") || lower.includes("vodafone")) {
      const telecel = products.filter((p) => p.is_active && p.network === "telecel").map((p) => `• **${p.size}**: GHS ${p.price.toFixed(2)}`);
      return `Here are our Telecel Fast Data rates bossu:\n\n${telecel.join("\n") || "Check our store page for active sizes"}\n\n👉 You can order directly at [/buy/telecel](/buy/telecel) with instant automated delivery!`;
    }

    if (lower.includes("at") || lower.includes("airteltigo") || lower.includes("tigo")) {
      const at = products.filter((p) => p.is_active && p.network === "at").map((p) => `• **${p.size}**: GHS ${p.price.toFixed(2)}`);
      return `Here are our AT (AirtelTigo) Data rates bossu:\n\n${at.join("\n") || "Check our store page for active sizes"}\n\n👉 You can buy anytime at [/buy/at](/buy/at)!`;
    }

    // All networks brief overview
    const mtn = products.filter((p) => p.is_active && p.network === "mtn").slice(0, 4).map((p) => `${p.size}: GHS ${p.price.toFixed(2)}`).join(" | ");
    const telecel = products.filter((p) => p.is_active && p.network === "telecel").slice(0, 4).map((p) => `${p.size}: GHS ${p.price.toFixed(2)}`).join(" | ");
    const at = products.filter((p) => p.is_active && p.network === "at").slice(0, 4).map((p) => `${p.size}: GHS ${p.price.toFixed(2)}`).join(" | ");

    return `Here is a quick look at our live wholesale prices bossu:\n\n` +
      `🟡 **MTN:** ${mtn || "Available on site"}\n` +
      `🔴 **Telecel:** ${telecel || "Available on site"}\n` +
      `🔵 **AT:** ${at || "Available on site"}\n\n` +
      `You can tap **Buy** at the top or visit [/buy/mtn](/buy/mtn) to grab your package!`;
  }

  // 5. Inquiries about Order Tracking & Delivery
  if (lower.includes("track") || lower.includes("where is my data") || lower.includes("not received") || lower.includes("not see") || lower.includes("haven't gotten") || lower.includes("delay")) {
    return `No problem bossu! Please reply with your **Order Reference** (e.g. \`BMGH-98234120\`) or the recipient **phone number** you sent data to, and I will check the live delivery status for you right away.\n\nYou can also check yourself on our live tracking page at [/track](/track).`;
  }

  // 6. Delivery Speed / How it works
  if (lower.includes("how long") || lower.includes("delivery") || lower.includes("how fast") || lower.includes("speed")) {
    return `All orders on **${settings.store_name}** are 100% automated! ⚡ Delivery normally takes **15 to 60 seconds** directly to your phone balance as soon as payment is confirmed.`;
  }

  // 7. Human support / WhatsApp
  if (lower.includes("whatsapp") || lower.includes("channel") || lower.includes("human") || lower.includes("agent") || lower.includes("call") || lower.includes("talk to someone")) {
    return `Sure bossu! You can chat directly with our team or join our official updates channel here:\n\n` +
      `💬 **WhatsApp Support / Channel:**\n${whatsappUrl}\n\n` +
      `📞 **Phone Call:** ${settings.support_phone}\n\nWe are always happy to help!`;
  }

  // 8. Payment methods
  if (lower.includes("payment") || lower.includes("pay") || lower.includes("momo") || lower.includes("telecel cash") || lower.includes("card")) {
    return `We support all major Ghanaian payment methods through secure Paystack checkout:\n• MTN Mobile Money\n• Telecel Cash\n• AT Money\n• Debit/Credit Cards (Visa & Mastercard)\n\nPayment prompts arrive directly on your phone instantly.`;
  }

  // 9. Natural conversational fallback (Friendly and responsive, NOT a robotic menu dump)
  return `Understood bossu! I'm right here to assist you with ${settings.store_name}. Whether you want to check bundle rates, track an order, or have a question about MTN, Telecel, or AT data, just let me know and I'll get it sorted for you!`;
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

  // 2. PRIORITY 2: Groq Cloud LPU (or xAI Grok)
  const groqKey = (
    settings.groq_api_key ||
    settings.grok_api_key ||
    process.env.GROQ_API_KEY ||
    process.env.GROK_API_KEY ||
    ""
  ).trim();
  if (groqKey) {
    try {
      const groqModel = settings.groq_model || settings.grok_model || "llama-3.3-70b-versatile";
      console.log(`[AI Rotator] Rotating to Secondary: Groq Cloud (${groqModel})...`);
      const res = await callGroqOrGrok(
        systemPrompt,
        params.userMessage,
        normalizedHistory,
        groqKey,
        groqModel
      );
      return {
        success: true,
        reply: res.reply,
        provider: "groq",
        modelUsed: res.model,
      };
    } catch (err: any) {
      console.warn("[AI Rotator] Groq exhausted / failed, rotating to OpenAI:", err.message);
      errors.push(`Groq: ${err.message}`);
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
  provider: "gemini" | "groq" | "grok" | "openai",
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

    if (provider === "groq" || provider === "grok") {
      const isXaiKey = cleanKey.startsWith("xai-") || (model && model.toLowerCase().includes("grok"));
      const targetModel = model || (isXaiKey ? "grok-2-latest" : "llama-3.3-70b-versatile");
      const res = await callGroqOrGrok("You are a helpful assistant.", testPrompt, [], cleanKey, targetModel);
      const name = isXaiKey ? "xAI Grok" : "Groq Cloud";
      return { success: true, message: `Connected to ${name} (${res.model})! Reply: "${res.reply}"`, modelUsed: res.model };
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
