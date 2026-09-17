import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { formatLocalDate, isISODate } from "@/lib/dates";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function displayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata ?? {};
  if (typeof metadata.name === "string" && metadata.name.trim()) {
    return metadata.name.trim();
  }
  if (typeof metadata.full_name === "string" && metadata.full_name.trim()) {
    return metadata.full_name.trim();
  }
  return user.email?.split("@")[0] || "there";
}

export async function getSession() {
  if (!hasSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      name: displayName(data.user),
    },
  };
}

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session.user;
}

export async function getToday() {
  const store = await cookies();
  const fromCookie = store.get("local-date")?.value;
  if (isISODate(fromCookie)) return fromCookie;
  return formatLocalDate();
}
