type PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

type ServerEnv = PublicEnv & {
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  FORGE_BACKEND_URL: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const publicEnv: PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
};

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  cachedServerEnv = {
    ...publicEnv,
    SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    RESEND_API_KEY: requireEnv("RESEND_API_KEY"),
    RESEND_FROM_EMAIL: requireEnv("RESEND_FROM_EMAIL"),
    FORGE_BACKEND_URL: getOptionalEnv("FORGE_BACKEND_URL", "http://127.0.0.1:8000"),
  };

  return cachedServerEnv;
}

export function validateAppEnv() {
  return {
    public: publicEnv,
    server: getServerEnv(),
  };
}
