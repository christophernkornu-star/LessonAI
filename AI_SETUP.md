# AI Integration Setup Guide

## AI Provider Options

This project supports **two AI providers**:
- **Groq** (FREE - Recommended) ✅
- **DeepSeek** (Paid - Alternative)

---

## Option 1: Groq (FREE & Fast) - RECOMMENDED

### Why Groq?
✅ **100% FREE** - No credit card required  
✅ **Super Fast** - Optimized inference  
✅ **Generous Limits** - 30 req/min, 14,400/day  
✅ **High Quality** - Meta Llama 3.1 70B model  

### Getting Your FREE Groq API Key

1. Visit [Groq Console](https://console.groq.com)
2. Sign up with Google/GitHub
3. Click "API Keys" in sidebar
4. Click "Create API Key"
5. Copy your key (starts with `gsk_...`)

### Setup Instructions

1. Open the `.env` file in the project root
2. Update with your Groq key:
   ```env
   VITE_AI_PROVIDER=groq
   VITE_GROQ_API_KEY=gsk_YOUR_KEY_HERE
   ```
3. Save the file
4. Restart the dev server: `npm run dev`

---

## Option 2: DeepSeek (Paid Alternative)

### Getting Your DeepSeek API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com)
2. Sign up or log in
3. **Add credits** to your account (requires payment)
4. Go to API Keys section
5. Create a new API key
6. Copy your API key

### Setup Instructions

1. Open the `.env` file in the project root
2. Configure DeepSeek:
   ```env
   VITE_AI_PROVIDER=deepseek
   VITE_DEEPSEEK_API_KEY=sk-YOUR_KEY_HERE
   ```
3. Save the file
4. Restart the dev server

---

## How It Works

1. **Generator Page**: Users fill in lesson details (curriculum, subject, Basic 1-10, etc.)
2. **AI Generation**: When "Generate Lesson Note" is clicked, the app sends data to your chosen AI provider
3. **Processing**: AI creates a comprehensive lesson note tailored to Ghana's National Pre-tertiary Curriculum with:
   - Lesson objectives
   - Materials needed
   - Step-by-step teaching activities
   - Assessment methods
   - Differentiation strategies
   - And more!
4. **Download Page**: Users can preview and download their generated lesson note

### Features

- ✅ **Cost-Effective** - Competitive pricing for API usage
- ✅ **High Quality** - Powered by DeepSeek's advanced language model
- ✅ **Fast Generation** - Typically takes 5-15 seconds
- ✅ **Professional Output** - Formatted lesson notes ready for classroom use
- ✅ **Flexible** - Works with custom templates and curriculum data

### API Model

- **Model**: `deepseek-chat`
- **Max Tokens**: 4000
- **Temperature**: 0.7 (balanced creativity and consistency)

### Troubleshooting

**Error: "Failed to generate lesson note"**
- Check that your API key is correctly set in the `.env` file
- Make sure the `.env` file is in the project root directory
- Restart the development server after adding the API key

**Rate Limit Errors**
- Free tier allows 15 requests per minute
- Wait a minute and try again
- Consider upgrading to a paid plan if you need higher limits

### Alternative: Use Without Payment System

The app currently routes through a checkout page. If you want to skip payment:
1. Open `src/pages/Generator.tsx`
2. Change `navigate("/checkout")` to `navigate("/download")`
3. Users can generate and download lesson notes immediately for free!

### Files Modified

- `src/services/aiService.ts` - AI service handling Gemini API calls
- `src/pages/Generator.tsx` - Added AI generation with loading states
- `src/pages/Download.tsx` - Display generated content
- `.env` - Environment variables for API key

Enjoy your AI-powered lesson note generator! 🎓✨
