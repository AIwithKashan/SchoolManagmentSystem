const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "OPENAI_API_KEY",
];

export function checkEnv() {
  const isProd = process.env.NODE_ENV === "production";
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    const errorMsg = `[CRITICAL ENV CHECK ERROR] The following required environment variables are missing: ${missing.join(
      ", "
    )}.`;
    console.error(errorMsg);

    if (isProd) {
      throw new Error(errorMsg);
    }
  }
}

// Auto-run checks immediately on import
checkEnv();
