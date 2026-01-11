// Test DeepSeek API Connection
// Run this in browser console to test API

const API_KEY = "sk-70bf7507cbbd417283457b9e5cc9c65a";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

async function testDeepSeekAPI() {
  console.log("Testing DeepSeek API...");
  console.log("API Key:", API_KEY.substring(0, 10) + "...");
  
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: "Say 'API is working!' in one sentence."
          }
        ],
        max_tokens: 50,
      }),
    });

    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("API Error:", error);
      return;
    }

    const data = await response.json();
    console.log("Success! Response:", data);
    console.log("AI said:", data.choices[0]?.message?.content);
  } catch (error) {
    console.error("Network error:", error);
  }
}

testDeepSeekAPI();
