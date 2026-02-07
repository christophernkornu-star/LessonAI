// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // SECURITY: Get key from server environment, NOT from the request body
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!apiKey) {
      throw new Error('Server configuration error: DEEPSEEK_API_KEY not found in secrets');
    }

    const { prompt, systemMessage, maxTokens, numLessons } = await req.json();

    // Calculate max_tokens based on number of lessons if not explicitly provided
    // DeepSeek has a max_tokens limit of 8192
    const baseTokens = 4000;
    const tokensPerLesson = 2500;
    const calculatedMaxTokens = maxTokens 
      ? Math.min(maxTokens, 8192)  // Cap explicit maxTokens at 8192
      : (numLessons && numLessons > 1 
        ? Math.min(baseTokens + (numLessons * tokensPerLesson), 8192)
        : Math.min(baseTokens, 8192));

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: systemMessage || "You are a helpful assistant."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: calculatedMaxTokens,
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
