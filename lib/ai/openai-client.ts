import OpenAI from 'openai';
import { createOpenAI } from '@ai-sdk/openai';

const apiKey = process.env.OPENAI_API_KEY;

// Check if we have a valid key (and not the default placeholder)
export const isMockAI = !apiKey || apiKey === 'sk-your-openai-api-key-here';

if (isMockAI) {
  console.warn(
    '[EduMind AI] WARNING: No valid OPENAI_API_KEY found in environment variables. The AI service layer will run in MOCK MODE.'
  );
}

// OpenRouter detection
const isOpenRouter = apiKey?.startsWith('sk-or-v1-');

// Initialize the client. Under mock mode, we pass a dummy string to avoid constructor validation errors.
const openai = new OpenAI({
  apiKey: isMockAI ? 'dummy-mock-key' : apiKey,
  baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
  defaultHeaders: isOpenRouter ? {
    'HTTP-Referer': 'https://github.com/google/antigravity',
    'X-Title': 'EduMind AI',
  } : undefined,
  maxRetries: 3, // Retry logic (3 attempts) handled natively by OpenAI SDK
});

// Initialize Vercel AI SDK Provider
export const sdkOpenAIProvider = createOpenAI({
  apiKey: isMockAI ? 'dummy-mock-key' : apiKey,
  baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
  headers: isOpenRouter ? {
    'HTTP-Referer': 'https://github.com/google/antigravity',
    'X-Title': 'EduMind AI',
  } : undefined,
});

export default openai;
