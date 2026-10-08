import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testAIProvider } from "@/lib/ai-rotator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await db.getSettings();

    const maskKey = (k?: string) => {
      if (!k || k.length < 8) return k ? "••••••••" : "";
      return k.slice(0, 4) + "••••••••" + k.slice(-4);
    };

    const groqKey = settings.groq_api_key || settings.grok_api_key || "";
    const groqModel = settings.groq_model || settings.grok_model || "llama-3.3-70b-versatile";

    return NextResponse.json({
      success: true,
      settings: {
        gemini_api_key: settings.gemini_api_key || "",
        gemini_api_key_masked: maskKey(settings.gemini_api_key),
        gemini_model: settings.gemini_model || "gemini-3.8-flash",
        gemini_configured: Boolean(settings.gemini_api_key),

        groq_api_key: groqKey,
        groq_api_key_masked: maskKey(groqKey),
        groq_model: groqModel,
        groq_configured: Boolean(groqKey),

        // Backward compatibility alias for grok
        grok_api_key: groqKey,
        grok_api_key_masked: maskKey(groqKey),
        grok_model: groqModel,
        grok_configured: Boolean(groqKey),

        openai_api_key: settings.openai_api_key || "",
        openai_api_key_masked: maskKey(settings.openai_api_key),
        openai_model: settings.openai_model || "gpt-4o-mini",
        openai_configured: Boolean(settings.openai_api_key),

        ai_system_instructions: settings.ai_system_instructions || "",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "save";

    // 1. TEST PROVIDER CREDENTIALS
    if (action === "test") {
      const { provider, api_key, model } = body;
      if (!provider) {
        return NextResponse.json({ success: false, message: "Provider is required for testing" }, { status: 400 });
      }

      // If no key provided in test payload, load from saved settings
      let keyToTest = (api_key || "").trim();
      if (!keyToTest) {
        const settings = await db.getSettings();
        if (provider === "gemini") keyToTest = settings.gemini_api_key || "";
        if (provider === "groq" || provider === "grok") keyToTest = settings.groq_api_key || settings.grok_api_key || "";
        if (provider === "openai") keyToTest = settings.openai_api_key || "";
      }

      const testResult = await testAIProvider(provider, keyToTest, model);
      return NextResponse.json(testResult);
    }

    // 2. SAVE SETTINGS
    const updates: any = {};
    if (body.gemini_api_key !== undefined && !body.gemini_api_key.includes("••••")) {
      updates.gemini_api_key = (body.gemini_api_key || "").trim();
    }
    if (body.gemini_model !== undefined) updates.gemini_model = (body.gemini_model || "gemini-3.8-flash").trim();

    // Groq / Grok keys & models
    const incomingGroqKey = body.groq_api_key !== undefined ? body.groq_api_key : body.grok_api_key;
    if (incomingGroqKey !== undefined && !incomingGroqKey.includes("••••")) {
      updates.groq_api_key = incomingGroqKey.trim();
      updates.grok_api_key = incomingGroqKey.trim();
    }
    const incomingGroqModel = body.groq_model !== undefined ? body.groq_model : body.grok_model;
    if (incomingGroqModel !== undefined) {
      updates.groq_model = incomingGroqModel.trim();
      updates.grok_model = incomingGroqModel.trim();
    }

    if (body.openai_api_key !== undefined && !body.openai_api_key.includes("••••")) {
      updates.openai_api_key = (body.openai_api_key || "").trim();
    }
    if (body.openai_model !== undefined) updates.openai_model = (body.openai_model || "gpt-4o-mini").trim();

    if (body.ai_system_instructions !== undefined) {
      updates.ai_system_instructions = String(body.ai_system_instructions || "");
    }

    const saved = await db.updateSettings(updates);
    const maskKey = (k?: string) => {
      if (!k || k.length < 8) return k ? "••••••••" : "";
      return k.slice(0, 4) + "••••••••" + k.slice(-4);
    };

    const groqKey = saved.groq_api_key || saved.grok_api_key || "";
    const groqModel = saved.groq_model || saved.grok_model || "llama-3.3-70b-versatile";

    return NextResponse.json({
      success: true,
      message: "AI configuration and instructions successfully saved!",
      settings: {
        gemini_api_key: saved.gemini_api_key || "",
        gemini_api_key_masked: maskKey(saved.gemini_api_key),
        gemini_model: saved.gemini_model || "gemini-3.8-flash",
        gemini_configured: Boolean(saved.gemini_api_key),

        groq_api_key: groqKey,
        groq_api_key_masked: maskKey(groqKey),
        groq_model: groqModel,
        groq_configured: Boolean(groqKey),

        grok_api_key: groqKey,
        grok_api_key_masked: maskKey(groqKey),
        grok_model: groqModel,
        grok_configured: Boolean(groqKey),

        openai_api_key: saved.openai_api_key || "",
        openai_api_key_masked: maskKey(saved.openai_api_key),
        openai_model: saved.openai_model || "gpt-4o-mini",
        openai_configured: Boolean(saved.openai_api_key),

        ai_system_instructions: saved.ai_system_instructions || "",
      },
    });
  } catch (err: any) {
    console.error("[API /admin/ai-settings] Error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Failed to save AI settings" }, { status: 500 });
  }
}
