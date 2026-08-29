import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = [
  "https://lessonai.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  const isAllowedOrigin =
    allowedOrigins.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    origin.startsWith("http://localhost:");

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User session validation
    const authHeader = req.headers.get("Authorization");
    if (authHeader && supabaseUrl && supabaseAnonKey) {
      try {
        const jwtToken = authHeader.replace(/^Bearer\s+/i, "");
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false },
        });

        const { data: userData } = await supabaseClient.auth.getUser(jwtToken);
        if (userData?.user) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("is_suspended")
            .eq("id", userData.user.id)
            .single();

          if (profile?.is_suspended === true) {
            return new Response(
              JSON.stringify({ error: "Account suspended. Please contact administrator." }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (_err) {
        // Continue for anonymous or test invocations
      }
    }

    const {
      prompt,
      systemMessage,
      systemInstruction,
      maxTokens,
      maxOutputTokens,
      numLessons,
      expectJson,
      model = "gemini-3.6-flash"
    } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanModel = model.replace(/^models\//i, "").trim() || "gemini-3.6-flash";

    const baseTokens = 4000;
    const tokensPerLesson = 2500;
    const calculatedMaxTokens = (maxOutputTokens || maxTokens)
      ? (maxOutputTokens || maxTokens)
      : (numLessons && numLessons > 1
        ? baseTokens + (numLessons * tokensPerLesson)
        : baseTokens);

    const systemPrompt = systemInstruction || systemMessage || "You are an expert educational content creator.";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    // When the caller expects a JSON object/array back (lesson templates,
    // curriculum extraction, etc.), ask Gemini to emit valid JSON directly.
    // This is what actually prevents "Bad escaped character in JSON" errors:
    // Gemini's own JSON encoder correctly escapes backslashes (LaTeX commands,
    // etc.) inside string values, instead of us trying to repair malformed
    // escaping after the fact on the client.
    const generationConfig: Record<string, unknown> = {
      temperature: 0.7,
      maxOutputTokens: calculatedMaxTokens,
    };
    if (expectJson) {
      generationConfig.responseMimeType = "application/json";
    }

    const geminiRequestBody = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      generationConfig,
    };

    // Auto-retry up to 3 times on temporary traffic spikes or 503/429
    let lastResponse: Response | null = null;
    let lastData: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      lastResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiRequestBody),
      });

      lastData = await lastResponse.json();

      if (lastResponse.ok) {
        break;
      }

      const errorMessage = (lastData?.error?.message || "").toLowerCase();
      const isTemporaryDemand =
        lastResponse.status === 429 ||
        lastResponse.status === 503 ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("resource exhausted") ||
        errorMessage.includes("quota");

      if (isTemporaryDemand && attempt < maxRetries) {
        console.warn(`[Attempt ${attempt}/${maxRetries}] High demand encountered. Retrying in ${attempt * 1500}ms...`);
        await sleep(attempt * 1500); // 1.5s, 3s backoff
        continue;
      }

      break;
    }

    if (!lastResponse || !lastResponse.ok) {
      const errorMsg = lastData?.error?.message || `Gemini API request failed (${lastResponse?.status})`;
      return new Response(
        JSON.stringify({ error: errorMsg, details: lastData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const generatedText = lastData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const totalTokens = lastData.usageMetadata?.totalTokenCount || 0;

    return new Response(
      JSON.stringify({
        text: generatedText,
        candidates: lastData.candidates,
        usage: {
          totalTokenCount: totalTokens,
          total_tokens: totalTokens
        },
        choices: [{ message: { content: generatedText } }]
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
