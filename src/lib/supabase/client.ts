import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export function createClient(url?: string, key?: string) {
  return createBrowserClient(url ?? supabaseUrl(), key ?? supabasePublishableKey());
}
