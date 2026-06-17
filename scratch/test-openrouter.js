const OpenAI = require('openai').default;
require('dotenv').config({ path: 'd:/SchoolManagementSystem/.env' });

async function test() {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("Using API Key prefix:", apiKey ? apiKey.substring(0, 15) : "undefined");
  
  const openai = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/google/antigravity',
      'X-Title': 'EduMind AI',
    }
  });

  console.log("Testing OpenRouter API connection with model: openrouter/free");
  try {
    const response = await openai.chat.completions.create({
      model: "openrouter/free",
      messages: [{ role: "user", content: "Hello! Reply with a one-sentence greeting." }],
    });
    console.log("\nResponse status: SUCCESS");
    console.log("Output content:", response.choices[0]?.message?.content);
  } catch (error) {
    console.error("\nAPI call failed:", error);
  }
}

test();
