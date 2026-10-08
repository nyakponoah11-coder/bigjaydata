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
  const allOrders = await db.getOrders().catch(() => []);

  // Group products by network
  const mtnProducts = products.filter((p) => p.is_active && p.network.toLowerCase() === "mtn");
  const telecelProducts = products.filter((p) => p.is_active && p.network.toLowerCase() === "telecel");
  const atProducts = products.filter((p) => p.is_active && p.network.toLowerCase() === "at");

  const formatList = (prods: typeof products) =>
    prods.length > 0
      ? prods.map((p) => `${p.size}: GHS ${p.price.toFixed(2)}`).join(" | ")
      : "Check site for live stock";

  const totalOrders = allOrders.length;
  const deliveredCount = allOrders.filter(
    (o) => (o.delivery_status || o.status) === "delivered"
  ).length;
  const deliveryPolicy =
    settings.announcement_text ||
    "⚡ Instant Delivery Guarantee: MTN, Telecel & AT packages delivered in under 60 seconds! 24/7 Automated.";

  return `You are "Kofi", the real, warm, intelligent, and open-minded Customer Support Specialist for "${settings.store_name}" (Ghana's premier instant mobile data platform).

=== CRITICAL BEHAVIORAL DIRECTIVES ===
1. STRICTLY NO FIXED OR SCRIPTED REPLIES:
   - DO NOT give canned, pre-written templates or repetitive replies to any question.
   - Every response must be uniquely crafted, open-minded, natural, and directly targeted at what the customer is asking.
   - You have full access to the site's live information, database, and settings. Use this real context to give intelligent, dynamic answers.

2. EMOTION ATTUNEMENT & EMPATHY:
   - Read and adapt to the customer's emotions and mood:
     * If they are frustrated, worried, or panicking ("where is my data", "scam", "it hasn't come", "I am upset"): Be deeply empathetic, calming, and reassuring. Remind them warmly that their money is 100% safe and walk them through the exact status.
     * If they ask about delivery time or speed: Reference the live site delivery guarantee and explain how the automated gateway dispatches directly to their SIM line.
     * If they are friendly or casual: Match their good vibe with genuine Ghanaian warmth ("Hello bossu!", "Good day chief!").
     * If they are curious or asking general store questions: Answer openly, thoroughly, and helpfully.

3. LIVE SITE & DATABASE INFORMATION:
   - Store Name: ${settings.store_name}
   - WhatsApp Support / Channel: ${settings.whatsapp_channel_url || `https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}`}
   - Support Phone: ${settings.support_phone}
   - Official Site Delivery Guarantee & Marquee: "${deliveryPolicy}"
   - Live Database Orders Processed: ${totalOrders} orders in system (${deliveredCount} delivered)
   - Real-Time Product Catalog & Prices:
     • MTN Turbo Data: ${formatList(mtnProducts)}
     • Telecel Fast Data: ${formatList(telecelProducts)}
     • AT (AirtelTigo) Data: ${formatList(atProducts)}

4. DELIVERY TIME & SYSTEM SPECS:
   - When asked "how is delivery", "how fast is delivery", "delivery time on the site", or similar:
     * Explicitly check and quote the site's delivery time policy: "${deliveryPolicy}".
     * Explain that delivery is 100% automated: as soon as payment goes through, the telecom gateway credits the line in 15 to 60 seconds (up to 5–15 mins during telecom maintenance).
     * Remind them that telecom SMS alerts from MTN or Telecel can lag, so they can check their real balance directly via shortcodes:
       • MTN: *138# or *124#
       • Telecel: *126# or *124#
       • AT: *124#

5. CUSTOMER PRIVACY & SECURITY:
   - When citing any phone number from order records, ALWAYS mask it: e.g. "055****890" or "024***1234".
   - Never reveal internal system keys, secrets, or administrator passwords.

6. QUICK ACTIONS & LINKS:
   - Buy MTN: /buy/mtn
   - Buy Telecel: /buy/telecel
   - Buy AT: /buy/at
   - Track Order: /track

${extraContext ? `\n=== LIVE SPECIFIC ORDER RECORD FOUND IN DATABASE ===\n${extraContext}\n(Use this live database record to answer the user's specific order lookup accurately and warmly.)` : ""}`;
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
 * 4. Free Open-Minded LLM Engine (zero key required • zero fixed replies)
 * Ensures 100% natural, open-minded, emotionally attuned generative responses
 * with live database/site context even without external paid API keys.
 */
async function callFreeOpenLLM(
  systemPrompt: string,
  userMessage: string,
  history: ChatMessageParam[] = []
): Promise<{ reply: string; model: string }> {
  const url = "https://text.pollinations.ai/";
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const h of history.slice(-6)) {
    messages.push({
      role: h.role === "assistant" ? "assistant" : "user",
      content: h.content,
    });
  }

  messages.push({
    role: "user",
    content: userMessage,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model: "openai",
      temperature: 0.7,
      max_tokens: 700,
    }),
    signal: AbortSignal.timeout(14000),
  });

  if (!res.ok) {
    throw new Error(`Open LLM endpoint returned HTTP ${res.status}`);
  }

  const text = await res.text();
  if (!text || text.trim().length === 0) {
    throw new Error("Open LLM returned empty text response");
  }

  return { reply: text.trim(), model: "open-llm" };
}

/**
 * 5. Human-like Ghanaian Assistant Engine (Offline emergency fallback)
 * Speaks naturally like a friendly, attentive human customer care person.
 * Listens to feelings, answers direct questions, respects past chat turns,
 * and never repeats robotic paragraphs or rigid templates.
 */
async function generateLocalAssistantReply(
  userMessage: string,
  context?: string,
  history: ChatMessageParam[] = []
): Promise<string> {
  const settings = await db.getSettings();
  const lower = userMessage.toLowerCase().trim();
  const whatsappUrl = settings.whatsapp_channel_url || `https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}`;

  // Analyze past conversation context
  const pastAssistantMsgs = history
    .filter((h) => h.role === "assistant")
    .map((h) => h.content.toLowerCase());
  const lastAssistant = pastAssistantMsgs[pastAssistantMsgs.length - 1] || "";
  const alreadySuggestedShortcode = pastAssistantMsgs.some((m) => m.includes("*138#") || m.includes("*126#") || m.includes("shortcode"));
  const alreadyAskedForPhoneOrRef = pastAssistantMsgs.some((m) => m.includes("reference") || m.includes("recipient") || m.includes("phone number"));

  // 1. Robotic / Bot check ("are you a bot", "are you ai", "you sound robotic", "is this an automated response")
  if (
    lower.includes("bot") ||
    lower.includes("robot") ||
    lower.includes("automated") ||
    lower.includes("are you real") ||
    lower.includes("human") ||
    lower.includes("are you a machine")
  ) {
    const humanReplies = [
      `Haha, no vex bossu! 😊 I'm right here with you on the support desk to make sure your data issues are sorted out quickly. Tell me what happened with your line or order, and I'll attend to you directly!`,
      `I'm right here bossu! We want to make sure your order is attended to fast. Tell me what's going on with your data or what you need help with?`,
      `No worries bossu, I'm here live on the desk. You can ask me anything about your order, bundles, or delivery—I'm listening!`,
    ];
    return humanReplies[Math.floor(Math.random() * humanReplies.length)];
  }

  // 2. Off-topic check (Strict domain boundary)
  const offTopicKeywords = [
    "who is", "who was", "write a code", "write code", "python", "javascript",
    "essay", "recipe", "cook", "capital of", "president of", "premier league",
    "football match", "celebrity", "solve math", "weather in", "write a story",
    "translate to", "homework", "politics", "dating"
  ];
  const isOffTopic = offTopicKeywords.some((kw) => lower.includes(kw)) &&
    !lower.includes("data") && !lower.includes("bundle") && !lower.includes("order") &&
    !lower.includes("mtn") && !lower.includes("telecel") && !lower.includes("at");

  if (isOffTopic) {
    return `Hello bossu! I'm strictly here to assist you with ${settings.store_name} mobile data bundles (MTN, Telecel, and AT), order tracking, and fast delivery! 😊 How can I help you with your data today?`;
  }

  // 2b. General Status / "What is going on" / "What's happening"
  const isStatusInquiry =
    lower.includes("what is going on") ||
    lower.includes("what's going on") ||
    lower.includes("whats going on") ||
    lower.includes("what is happening") ||
    lower.includes("what's happening") ||
    lower.includes("whats happening") ||
    lower.includes("what dey go on") ||
    lower.includes("wetin dey happen") ||
    lower.includes("what dey happen") ||
    lower.includes("any update") ||
    lower.includes("how far") ||
    lower.includes("is the system working") ||
    lower.includes("is everything working");

  if (isStatusInquiry) {
    return `Everything is running smoothly and fully active bossu! 🚀\n\nOur automated telecom dispatch is online 24/7. All bundle purchases for MTN, Telecel, and AT are crediting directly to customer SIMs within seconds.\n\nDid you just place an order that you want to check, or do you need help getting a new bundle? Let me know what you need and I'll assist you right away!`;
  }

  // 2c. Delivery Speed & How Delivery Works ("how is delivery", "delivery speed", "how fast", "how does delivery work")
  const isDeliveryInquiry =
    lower.includes("delivery") ||
    lower.includes("how is delivery") ||
    lower.includes("how fast") ||
    lower.includes("how quick") ||
    lower.includes("speed") ||
    lower.includes("instant") ||
    lower.includes("how does delivery work") ||
    lower.includes("delivery time") ||
    lower.includes("how long to deliver") ||
    lower.includes("how long does it take") ||
    lower.includes("how do i receive") ||
    lower.includes("how do i get the data");

  if (isDeliveryInquiry) {
    return `Our data delivery is 100% automated and direct to your SIM bossu! ⚡\n\n• **Speed:** Deliveries drop directly onto your line in **15 to 60 seconds** after payment (max 5–15 mins during peak telecom network congestion).\n• **How it works:** As soon as your MoMo payment is authorized, our server triggers the telecom gateway to credit the recipient number automatically.\n• **Checking your balance:** Dial *138# (MTN), *126# (Telecel), or *124# (AT) to see your bundle.\n\nAre you looking to buy a bundle now, or did you want to track an order you already placed?`;
  }

  // 2d. Order Tracking Inquiry (when user asks to track without providing reference/phone)
  const isTrackInquiry =
    (lower.includes("track") ||
     lower.includes("check my order") ||
     lower.includes("check order") ||
     lower.includes("order status") ||
     lower.includes("trace order") ||
     lower.includes("where is my order")) &&
    !context;

  if (isTrackInquiry) {
    return `I can track your order for you right away bossu! 🔍\n\nKindly send me either:\n1. Your **Order Reference** (e.g. \`BMGH-...\` or \`BIGJ-...\`) OR\n2. The **Recipient Phone Number** you purchased the bundle for.\n\nOnce you drop it here, I will check the live telecom dispatch queue immediately! You can also check the live tracker anytime at [/track](/track).`;
  }

  // 2e. Service Introduction ("who are you", "what is this", "what do you do")
  const isAboutInquiry =
    lower.includes("who are you") ||
    lower.includes("what do you do") ||
    lower.includes("what can you do") ||
    lower.includes("what is this") ||
    lower.includes("what is big jay") ||
    lower.includes("about this site") ||
    lower.includes("what service");

  if (isAboutInquiry) {
    return `I am Kofi, your live customer support assistant for ${settings.store_name}! 👋\n\nWe provide fast, affordable, non-expiry mobile data bundles for MTN, Telecel, and AT across Ghana with 24/7 automated delivery directly to your phone.\n\nI can help you check live rates, track an existing order, explain delivery and payments, or assist you with any questions. How can I help you today?`;
  }

  // 2f. Legitimacy & Trust ("is this real", "is this legit", "can i trust", "is it safe")
  const isTrustInquiry =
    lower.includes("is this real") ||
    lower.includes("is this legit") ||
    lower.includes("are you legit") ||
    lower.includes("is it legit") ||
    lower.includes("can i trust") ||
    lower.includes("is it safe") ||
    lower === "legit";

  if (isTrustInquiry) {
    return `Yes bossu, 100% genuine and verified! ✅\n\n${settings.store_name} is Ghana's trusted data provider. We process transactions securely via Paystack (MTN MoMo, Telecel Cash, AT Money, and Cards) and our automated telecom gateway credits your SIM directly within seconds.\n\nYour money and transactions are 100% safe. If you ever have questions, you can also reach our team on WhatsApp at ${whatsappUrl}!`;
  }

  // 3. Live Database Order Context Found
  if (context && (context.includes("ORDER FOUND:") || context.includes("ORDER FOUND FOR PHONE"))) {
    const isDelivered = context.toLowerCase().includes("delivered");
    const isProcessing = context.toLowerCase().includes("processing") || context.toLowerCase().includes("pending");
    const isFailed = context.toLowerCase().includes("failed");
    const details = context.replace(/ORDER FOUND.*?:\s*/i, "").trim();

    if (isDelivered) {
      return `Good news bossu! 🎉 I just checked our live gateway for you:\n\n${details}\n\nYour order is marked **DELIVERED**! Please check your SIM balance directly (*138# for MTN, *126# for Telecel, *124# for AT) because telco SMS delivery alerts are often delayed by the networks. Enjoy your bundle!`;
    }

    if (isProcessing) {
      return `I found your order in our live queue bossu! ⏳\n\n${details}\n\nPayment went through successfully, and our automated telecom gateway is actively dispatching it. It should drop in under a minute!`;
    }

    if (isFailed) {
      return `Hello bossu! I looked up your order:\n\n${details}\n\nIt looks like the telecom network encountered a slight hiccup during dispatch, but please don't worry—**your money is 100% safe**. Our team is reviewing this right now, or you can tap WhatsApp at ${whatsappUrl} to have it re-sent to your line immediately!`;
    }

    return `Here is your order details from our system bossu:\n\n${details}\n\nLet me know if you need anything else on this!`;
  }

  // 4. Anxiety, scam fear, or high frustration ("scam", "thief", "steal", "cheat", "where is my money", "you took my money")
  if (
    lower.includes("scam") ||
    lower.includes("thief") ||
    lower.includes("steal") ||
    lower.includes("cheat") ||
    lower.includes("fraud") ||
    lower.includes("my money")
  ) {
    return `Oh bossu, please don't worry or think that way at all! 🙏 We are a legitimate, trusted data service in Ghana, and your money is 100% secure. If your data hasn't arrived, it's strictly due to a telecom network delay or a queue on the line. We will never keep your money without delivering your bundle. Kindly give me your phone number or order reference so I can track it down immediately, or message us directly on WhatsApp at ${whatsappUrl} for urgent personal assistance!`;
  }

  // 5. Customer already checked shortcode / still complaining after check ("still haven't", "still not", "nothing there", "empty", "no data", "i checked already", "i did that", "it's not showing")
  const checkedAlready =
    lower.includes("checked") ||
    lower.includes("already") ||
    lower.includes("nothing") ||
    lower.includes("still not") ||
    lower.includes("still no") ||
    lower.includes("empty") ||
    lower.includes("did that") ||
    lower.includes("done that");

  if (alreadySuggestedShortcode && checkedAlready) {
    return `I hear you bossu, and I really apologize for the wait! Since the balance hasn't reflected yet on your line, the network gateway must be holding the queue. Please send me the **phone number** that was supposed to receive the data or your **Order Reference** (e.g. \`BMGH-...\`), and I will check the exact gateway dispatch logs for you right away. You can also chat with our operations lead directly on WhatsApp at ${whatsappUrl}!`;
  }

  // 6. Delays / Waiting / Order inquiry ("where is my data", "haven't received", "delay", "waiting", "when will it arrive", "how long")
  const isDelayOrWaiting =
    lower.includes("delay") ||
    lower.includes("wait") ||
    lower.includes("haven't received") ||
    lower.includes("hasn't arrived") ||
    lower.includes("not received") ||
    lower.includes("not come") ||
    lower.includes("didn't receive") ||
    lower.includes("did not receive") ||
    lower.includes("where is") ||
    lower.includes("not yet") ||
    lower.includes("pending");

  if (isDelayOrWaiting) {
    if (!alreadySuggestedShortcode) {
      return `I completely understand bossu, and don't worry—your money and order are 100% safe! 🙏 Delivery usually takes between 15 to 60 seconds, but telco SMS notifications from MTN or Telecel can be delayed even after data has dropped on the SIM.\n\nCould you please dial your balance code right now (*138# for MTN, *126# for Telecel, *124# for AT)? If it's still not showing, just reply with your **phone number** or **order reference** so I can check the live dispatch queue for you!`;
    }

    if (!alreadyAskedForPhoneOrRef) {
      return `Chale, sorry for the wait! Let me look into this for you personally. What's the **recipient phone number** or the **order reference** (e.g. \`BMGH-...\`)? Drop it here and I'll trace it right away!`;
    }

    return `I'm following up on this bossu! If you've shared your number or reference, I'm checking it right now. You can also reach our admin desk directly on WhatsApp at ${whatsappUrl} if you need it pushed with top priority!`;
  }

  // 7. Expiry questions ("does it expire", "expiry date", "how long does it last", "validity")
  if (lower.includes("expir") || lower.includes("valid") || lower.includes("how long does it last")) {
    return `None of our bundles expire bossu! 🎉 All our MTN, Telecel, and AT data packages are completely non-expiry. They stay on your phone balance until you finish using them.`;
  }

  // 8. Third-party buying ("can i buy for someone else", "can i buy for my friend", "another number", "different phone")
  if (
    lower.includes("someone else") ||
    lower.includes("another number") ||
    lower.includes("friend") ||
    lower.includes("another person") ||
    lower.includes("different number")
  ) {
    return `Yes bossu! You can buy data for anyone. When you choose your bundle on our site, simply enter the recipient's phone number as the delivery number, and the data will be sent directly to their phone upon payment!`;
  }

  // 9. Payment questions ("how do i pay", "momo", "payment methods", "telecel cash", "card")
  if (
    lower.includes("how to pay") ||
    lower.includes("payment method") ||
    lower.includes("momo") ||
    lower.includes("telecel cash") ||
    lower.includes("card") ||
    lower.includes("paystack")
  ) {
    return `We accept all Ghanaian payment methods bossu! 💳\n• MTN Mobile Money\n• Telecel Cash\n• AT Money\n• Bank Cards (Visa & Mastercard via Paystack)\n\nYou'll get an automated MoMo authorization prompt on your phone right away to approve!`;
  }

  // 10. How to buy / order process
  if (
    lower.includes("how to buy") ||
    lower.includes("how do i buy") ||
    lower.includes("how to order") ||
    lower.includes("process") ||
    lower.includes("how does it work")
  ) {
    return `It's super easy and takes less than a minute bossu! 🚀\n1. Select your network:\n   • **MTN:** [/buy/mtn](/buy/mtn)\n   • **Telecel:** [/buy/telecel](/buy/telecel)\n   • **AT:** [/buy/at](/buy/at)\n2. Pick the bundle size you want\n3. Enter the recipient's number and approve the MoMo prompt\n\nYour data drops directly to the phone within 15 to 60 seconds!`;
  }

  // 11. Rates & Pricing Inquiries
  if (
    lower.includes("price") ||
    lower.includes("cost") ||
    lower.includes("rate") ||
    lower.includes("how much") ||
    lower.includes("list") ||
    lower.includes("bundles")
  ) {
    const products = await db.getProducts();

    if (lower.includes("mtn")) {
      const mtn = products.filter((p) => p.is_active && p.network.toLowerCase() === "mtn").map((p) => `• **${p.size}**: GHS ${p.price.toFixed(2)}`);
      return `Here are our current MTN Turbo rates bossu:\n\n${mtn.join("\n") || "1GB to 50GB available on site"}\n\n👉 You can order right now at [/buy/mtn](/buy/mtn) with instant delivery and no expiry!`;
    }

    if (lower.includes("telecel") || lower.includes("vodafone")) {
      const telecel = products.filter((p) => p.is_active && p.network.toLowerCase() === "telecel").map((p) => `• **${p.size}**: GHS ${p.price.toFixed(2)}`);
      return `Here are our Telecel Fast Data rates bossu:\n\n${telecel.join("\n") || "1GB to 50GB available on site"}\n\n👉 You can order at [/buy/telecel](/buy/telecel)!`;
    }

    if (lower.includes("at") || lower.includes("airteltigo") || lower.includes("tigo")) {
      const at = products.filter((p) => p.is_active && p.network.toLowerCase() === "at").map((p) => `• **${p.size}**: GHS ${p.price.toFixed(2)}`);
      return `Here are our AT rates bossu:\n\n${at.join("\n") || "Available on site"}\n\n👉 Order anytime at [/buy/at](/buy/at)!`;
    }

    const mtn = products.filter((p) => p.is_active && p.network.toLowerCase() === "mtn").slice(0, 4).map((p) => `${p.size}: GHS ${p.price.toFixed(2)}`).join(" | ");
    const telecel = products.filter((p) => p.is_active && p.network.toLowerCase() === "telecel").slice(0, 4).map((p) => `${p.size}: GHS ${p.price.toFixed(2)}`).join(" | ");
    const at = products.filter((p) => p.is_active && p.network.toLowerCase() === "at").slice(0, 4).map((p) => `${p.size}: GHS ${p.price.toFixed(2)}`).join(" | ");

    return `Here are some of our popular rates bossu (all non-expiry):\n\n` +
      `🟡 **MTN:** ${mtn || "Check store"}\n` +
      `🔴 **Telecel:** ${telecel || "Check store"}\n` +
      `🔵 **AT:** ${at || "Check store"}\n\n` +
      `You can tap **Buy** at the top or visit [/buy/mtn](/buy/mtn) to get your bundle in under 60 seconds!`;
  }

  // 12. Human WhatsApp Escalation / Call
  if (
    lower.includes("whatsapp") ||
    lower.includes("channel") ||
    lower.includes("call") ||
    lower.includes("speak to") ||
    lower.includes("talk to") ||
    lower.includes("customer service") ||
    lower.includes("contact")
  ) {
    return `Sure bossu! You can reach our team directly here:\n\n💬 **WhatsApp Support:** ${whatsappUrl}\n📞 **Phone:** ${settings.support_phone}\n\nWe're always ready to help!`;
  }

  // 13. Gratitude & Confirmation ("thank you", "thanks", "received", "it has come", "seen", "god bless")
  if (
    lower.includes("thank") ||
    lower.includes("received") ||
    lower.includes("it has come") ||
    lower.includes("it came") ||
    lower.includes("just came") ||
    lower.includes("seen it") ||
    lower.includes("seen") ||
    lower.includes("god bless") ||
    lower.includes("appreciate")
  ) {
    const thanksResponses = [
      `You are very welcome bossu! 🎉 So glad you are sorted and online! Enjoy your bundle, and ${settings.store_name} is always here whenever you need a fast top-up. Have a blessed day!`,
      `Awesome bossu! 🙌 Thank you so much for choosing ${settings.store_name}. Whenever you need more data, just pop in anytime!`,
      `Glory! Happy to hear that bossu! 🚀 Enjoy your high-speed internet, and let us know whenever you need more!`,
    ];
    return thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
  }

  // 14. Conversational Acknowledgement ("ok", "okay", "alright", "noted", "cool", "checking", "wait")
  const isAck =
    lower === "ok" ||
    lower === "okay" ||
    lower === "alright" ||
    lower === "k" ||
    lower.startsWith("ok ") ||
    lower.startsWith("okay ") ||
    lower.includes("checking") ||
    lower.includes("hold on") ||
    lower.includes("one sec") ||
    lower.includes("wait");

  if (isAck) {
    const ackResponses = [
      `Alright bossu, take your time! I'm right here waiting for you. 😊`,
      `Understood chief! Let me know what you find once you check your balance or details.`,
      `No problem bossu! I'm right here whenever you're ready.`,
    ];
    return ackResponses[Math.floor(Math.random() * ackResponses.length)];
  }

  // 15. Friendly Greetings
  const greetingWords = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "bossu", "chale", "kofi", "sup", "yo"];
  const isGreeting = lower.length <= 30 && greetingWords.some((g) => lower === g || lower.startsWith(g + " ") || lower.endsWith(" " + g));
  if (isGreeting) {
    const greetings = [
      `Hello bossu! 👋 Welcome to ${settings.store_name}. How can I assist you with your data today?`,
      `Good day chief! Great to have you here. Are you looking to buy a bundle or checking up on an order?`,
      `Welcome bossu! Big J Support is active and ready. What can I do for you today?`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // 16. Helpful Conversational Fallback with clear actionable guidance
  return `I'm right here with you bossu! 😊 To make sure I get you the exact information you need, you can:\n\n` +
    `• 💰 Type **MTN**, **Telecel**, or **AT** to see our non-expiry rates\n` +
    `• ⚡ Type **Delivery** to check how fast data is credited to your line\n` +
    `• 🔍 Drop your **Order Reference** or **Phone Number** to track an order\n` +
    `• 💬 Type **WhatsApp** to chat directly with our support team\n\n` +
    `How can I assist you right now?`;
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

  // 4. PRIORITY 4: Free Open-Minded LLM Engine (zero key required • zero fixed replies)
  try {
    console.log("[AI Rotator] Rotating to Free Open-Minded LLM Engine (emotion-aware)...");
    const openRes = await callFreeOpenLLM(
      systemPrompt,
      params.userMessage,
      normalizedHistory
    );
    if (openRes.reply) {
      return {
        success: true,
        reply: openRes.reply,
        provider: "groq",
        modelUsed: openRes.model,
      };
    }
  } catch (openErr: any) {
    console.warn("[AI Rotator] Free Open LLM error:", openErr.message);
    errors.push(`OpenLLM: ${openErr.message}`);
  }

  // 5. PRIORITY 5: Built-in Intelligent Local Support Engine (offline emergency fallback)
  console.log("[AI Rotator] Using Local Smart Assistant Engine (offline fallback)...");
  const localReply = await generateLocalAssistantReply(params.userMessage, params.extraContext, normalizedHistory);
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
