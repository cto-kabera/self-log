import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatLocalDate, isISODate } from "@/lib/dates";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
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
