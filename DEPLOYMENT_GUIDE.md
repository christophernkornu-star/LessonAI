# Deployment Guide for DeepSeek Proxy

To resolve the CORS error, you need to deploy the Supabase Edge Function that acts as a proxy for the DeepSeek API.

## Prerequisites

Ensure you are logged in to Supabase CLI:

```bash
npx supabase login
```

## Deploy the Function

Run the following command to deploy the `deepseek-proxy` function:

```bash
npx supabase functions deploy deepseek-proxy
```

## Troubleshooting

If you see an error about "Project not linked":

```bash
npx supabase link --project-ref uihhwjloceffyksuscmg
```

Then try deploying again.

## Verification

After deployment, the CORS error should disappear, and the lesson generator should work.
