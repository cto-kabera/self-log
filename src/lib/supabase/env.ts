function readEnv(name: string) {
  return process.env[name];
}

export function hasSupabaseConfig() {
  return Boolean(
    readEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      (readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
        readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
  );
}

export function supabaseUrl() {
  const value = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!value) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL to your Supabase project URL.");
  }
  return value;
}

export function supabasePublishableKey() {
  const value =
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!value) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  return value;
}
