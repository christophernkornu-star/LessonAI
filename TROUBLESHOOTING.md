# Troubleshooting Guide

## Common Issues

### 1. API Error: 402 Insufficient Balance (DeepSeek)

**Symptoms:**
- The lesson generator fails with "API Error: 402 Insufficient Balance".
- The browser console shows `POST ... 402 (Payment Required)`.

**Cause:**
- Your DeepSeek API key has run out of credits. DeepSeek is a paid service (though very cheap).

**Solution:**
1.  Log in to [DeepSeek Platform](https://platform.deepseek.com).
2.  Go to the "Top up" or "Billing" section.
3.  Add credits to your account (e.g., $2-5 is usually enough for hundreds of lessons).

### 2. Switching to Free AI (Groq)

If you prefer to use a free provider, you can switch to Groq.

**Steps:**
1.  Open the `.env` file in the project root.
2.  Comment out the DeepSeek configuration:
    ```env
    # VITE_AI_PROVIDER=deepseek
    # VITE_DEEPSEEK_API_KEY=...
    ```
3.  Uncomment the Groq configuration:
    ```env
    VITE_AI_PROVIDER=groq
    VITE_GROQ_API_KEY=gsk_...
    ```
4.  Restart the development server:
    ```bash
    npm run dev
    ```

### 3. CORS Errors

If you see "CORS policy" errors:
- Ensure your `vite.config.ts` has the proxy configuration set up correctly.
- Restart the development server (`npm run dev`) to apply config changes.
