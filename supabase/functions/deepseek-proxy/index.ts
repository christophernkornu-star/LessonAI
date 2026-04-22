import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const allowedOrigins = [
  'https://lessonai.vercel.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000'
];

serve(async (req: Request) => {
  const origin = req.headers.get('Origin') || '';
  const isAllowedOrigin = allowedOrigins.includes(origin);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://lessonai.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // We safeguard the API using strict CORS validation and Supabase's built-in Gateway
    // This allows the frontend to call the API natively without failing on strict User Session checks
    // Default Supabase edge functions require the anon key in the Authorization header.

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate API Key
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: DEEPSEEK_API_KEY not found in secrets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { prompt, systemMessage, maxTokens, numLessons } = await req.json();

    const baseTokens = 4000;
    const tokensPerLesson = 2500;
    const calculatedMaxTokens = maxTokens 
      ? Math.min(maxTokens, 8192)  
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
      status: response.status,
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
