function env(key: string, defaultValue?: string): string {
  const value = Deno.env.get(key) ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function envOptional(key: string): string | undefined {
  return Deno.env.get(key);
}

function envInt(key: string, defaultValue: number): number {
  const value = Deno.env.get(key);
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer, got: ${value}`);
  }
  return parsed;
}

export function getConfig() {
  return {
    database: {
      url: env(
        "DATABASE_URL",
        "postgresql://redirect_center:dev_password@localhost:5432/redirect_center",
      ),
    },

    smtp: {
      host: envOptional("SMTP_HOST"),
      port: envInt("SMTP_PORT", 587),
      user: envOptional("SMTP_USER"),
      pass: envOptional("SMTP_PASS"),
      from: envOptional("SMTP_FROM"),
    },

    stripe: {
      secretKey: envOptional("STRIPE_SECRET_KEY"),
      publishableKey: envOptional("STRIPE_PUBLISHABLE_KEY"),
      webhookSecret: envOptional("STRIPE_WEBHOOK_SECRET"),
      prices: {
        simpleMonthly: envOptional("STRIPE_PRICE_SIMPLE_MONTHLY"),
        simpleYearly: envOptional("STRIPE_PRICE_SIMPLE_YEARLY"),
        wildcardMonthly: envOptional("STRIPE_PRICE_WILDCARD_MONTHLY"),
        wildcardYearly: envOptional("STRIPE_PRICE_WILDCARD_YEARLY"),
      },
    },

    baseUrl: env("BASE_URL", "http://localhost:8000"),
    sessionDurationHours: envInt("SESSION_DURATION_HOURS", 3),
    magicLinkDurationHours: envInt("MAGIC_LINK_DURATION_HOURS", 24),

    fqdn: envOptional("FQDN"),
    entryIp: envOptional("ENTRY_IP"),
    listenPort: envInt("LISTEN_PORT", 8000),
    listenIp: env("LISTEN_IP", "0.0.0.0"),
    environment: env("ENVIRONMENT", "development"),
    projectName: env("PROJECT_NAME", "redirect-center"),
    loggerLevel: env("LOGGER_LEVEL", "info"),
  };
}

export type Config = ReturnType<typeof getConfig>;
