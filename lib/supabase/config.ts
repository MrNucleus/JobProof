import "server-only";

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

/**
 * Reads only the public Supabase client configuration. Never use a service-role
 * key in this app: Row Level Security must remain the final data boundary.
 */
export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim(),
    anonKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim()
  };
}

export function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}
