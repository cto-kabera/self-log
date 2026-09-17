export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ default: dns }, { default: net }] = await Promise.all([
    import("node:dns"),
    import("node:net"),
  ]);
  dns.setDefaultResultOrder("ipv4first");
  net.setDefaultAutoSelectFamily(false);
  const { ensureDb } = await import("@/db");
  await ensureDb();
}
