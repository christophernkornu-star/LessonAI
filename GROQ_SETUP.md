# How to Get a FREE Groq API Key

## Problem
Your DeepSeek API has no credits (402 Payment Required error).

## Solution: Use Groq (FREE)

Groq offers **completely FREE** AI API access with generous limits - perfect for testing and even production use!

### Step 1: Get Groq API Key (2 minutes)

1. Go to: **https://console.groq.com**
2. Click "Sign Up" or "Get Started"
3. Sign in with Google/GitHub (easiest)
4. Once logged in, click **"API Keys"** in left sidebar
5. Click **"Create API Key"**
6. Give it a name (e.g., "LessonAI")
7. **Copy the API key** (starts with `gsk_...`)

### Step 2: Update Your .env File

Open `.env` file and update:

```env
# AI API Configuration
VITE_AI_PROVIDER=groq
VITE_GROQ_API_KEY=gsk_YOUR_ACTUAL_KEY_HERE
```

Replace `gsk_YOUR_ACTUAL_KEY_HERE` with the key you just copied.

### Step 3: Restart Dev Server

Stop your current server (Ctrl+C) and restart:

```powershell
npm run dev
```

### Step 4: Test It!

1. Go to http://localhost:8080/generator
2. Fill in the lesson details
3. Click "Generate Lesson Note"
4. Should work instantly! ✅

## Groq Benefits

✅ **100% FREE** - No credit card required  
✅ **Fast** - Llama 3.1 70B model is super fast  
✅ **Generous limits** - 30 requests/minute, 14,400/day  
✅ **High quality** - Meta's Llama 3.1 70B model  
✅ **No setup fees** - Just sign up and use  

## Alternative: Add Credits to DeepSeek

If you prefer DeepSeek:

1. Go to https://platform.deepseek.com
2. Navigate to Billing
3. Add credits (costs money)
4. Your existing key will work again

Update `.env`:
```env
VITE_AI_PROVIDER=deepseek
VITE_DEEPSEEK_API_KEY=sk-70bf7507cbbd417283457b9e5cc9c65a
```

## What Changed

The app now supports BOTH providers:
- **Groq** (FREE) - Default, recommended
- **DeepSeek** (Paid) - Alternative option

Switch between them by changing `VITE_AI_PROVIDER` in `.env`

## Get Your Free Groq Key Now!

👉 **https://console.groq.com** 👈
