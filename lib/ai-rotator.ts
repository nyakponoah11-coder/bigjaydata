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
 * 4. Human-like Ghanaian Assistant Engine
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
    lower.includes("pending") ||
    lower.includes("how long");

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

  // 16. Natural Conversational Fallback
  const fallbacks = [
    `I'm right here with you bossu! Feel free to ask me anything about our bundles, delivery speed, or tracking an order. How can I help you right now?`,
    `Always happy to help bossu! Are you looking to buy an MTN, Telecel, or AT bundle, or did you want to track a recent order? Let me know!`,
    `Understood bossu! Let me know what you need—whether it's checking live rates, order delivery, or network assistance, I'm right here for you!`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
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
