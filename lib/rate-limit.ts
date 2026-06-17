interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const loginStore = new Map<string, RateLimitBucket>();
const aiStore = new Map<string, RateLimitBucket>();
const apiStore = new Map<string, RateLimitBucket>();

// Helper to clean up expired buckets
setInterval(() => {
  const now = Date.now();
  [loginStore, aiStore, apiStore].forEach((store) => {
    store.forEach((bucket, key) => {
      if (now > bucket.resetTime) {
        store.delete(key);
      }
    });
  });
}, 60 * 1000).unref?.(); // run every minute and don't block event loop

export function limitLogin(email: string): { success: boolean; message?: string } {
  const now = Date.now();
  const bucket = loginStore.get(email);

  if (!bucket || now > bucket.resetTime) {
    loginStore.set(email, { count: 1, resetTime: now + 15 * 60 * 1000 });
    return { success: true };
  }

  if (bucket.count >= 5) {
    return {
      success: false,
      message: "Too many attempts. Wait 15 minutes.",
    };
  }

  bucket.count += 1;
  return { success: true };
}

export function limitAI(userId: string): { success: boolean; message?: string } {
  const now = Date.now();
  const bucket = aiStore.get(userId);

  if (!bucket || now > bucket.resetTime) {
    aiStore.set(userId, { count: 1, resetTime: now + 60 * 60 * 1000 });
    return { success: true };
  }

  if (bucket.count >= 50) {
    return {
      success: false,
      message: "AI request limit reached. Try in 1 hour.",
    };
  }

  bucket.count += 1;
  return { success: true };
}

export function limitAPI(ip: string): { success: boolean; message?: string } {
  const now = Date.now();
  const bucket = apiStore.get(ip);

  if (!bucket || now > bucket.resetTime) {
    apiStore.set(ip, { count: 1, resetTime: now + 60 * 1000 });
    return { success: true };
  }

  if (bucket.count >= 100) {
    return {
      success: false,
      message: "API request limit reached. Too many requests.",
    };
  }

  bucket.count += 1;
  return { success: true };
}
