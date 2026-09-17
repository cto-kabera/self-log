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
  if (!hasSupabaseConfig()) {
    // #region agent log
    fetch("http://127.0.0.1:7925/ingest/d17156d8-f8fd-4c26-b6f7-e30874c84942", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "77e8bf",
      },
      body: JSON.stringify({
        sessionId: "77e8bf",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "session.ts:getSession",
        message: "no supabase config",
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return null;
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    // #region agent log
    fetch("http://127.0.0.1:7925/ingest/d17156d8-f8fd-4c26-b6f7-e30874c84942", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "77e8bf",
      },
      body: JSON.stringify({
        sessionId: "77e8bf",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "session.ts:getSession",
        message: "getUser result",
        data: {
          hasUser: Boolean(data.user),
          authError: error?.message ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (error || !data.user) return null;
    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
        name: displayName(data.user),
      },
    };
  } catch (err) {
    // #region agent log
    fetch("http://127.0.0.1:7925/ingest/d17156d8-f8fd-4c26-b6f7-e30874c84942", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "77e8bf",
      },
      body: JSON.stringify({
        sessionId: "77e8bf",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "session.ts:getSession",
        message: "getSession threw",
        data: {
          errName: err instanceof Error ? err.name : "unknown",
          errMessage: err instanceof Error ? err.message : String(err),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw err;
  }
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
