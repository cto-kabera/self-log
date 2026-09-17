import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dns from "node:dns";
import net from "node:net";
import * as schema from "./schema";

dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
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
        hypothesisId: "A",
        location: "db/index.ts:databaseUrl",
        message: "DATABASE_URL missing",
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw new Error("Set DATABASE_URL to your Supabase Postgres connection string.");
  }
  return value;
}

function createDb() {
  const raw = databaseUrl();
  let host = "unparsed";
  let port = "";
  try {
    const parsed = new URL(raw.replace(/^postgresql:/, "http:"));
    host = parsed.hostname;
    port = parsed.port;
  } catch {
    host = "parse-failed";
  }
  console.error("[db] creating postgres client", {
    host,
    port,
    resultOrder: dns.getDefaultResultOrder(),
    autoSelectFamily: net.getDefaultAutoSelectFamily(),
  });
  // #region agent log
  fetch("http://127.0.0.1:7925/ingest/d17156d8-f8fd-4c26-b6f7-e30874c84942", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "77e8bf",
    },
    body: JSON.stringify({
      sessionId: "77e8bf",
        runId: "post-fix",
        hypothesisId: "D,E",
        location: "db/index.ts:createDb",
        message: "creating postgres client",
        data: {
          host,
          port,
          resultOrder: dns.getDefaultResultOrder(),
          autoSelectFamily: net.getDefaultAutoSelectFamily(),
        },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const client = postgres(raw, { prepare: false, ssl: "require" });
  return drizzle(client, { schema });
}

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof createDb>;
};

function getDb() {
  if (!globalForDb.db) {
    globalForDb.db = createDb();
  }
  return globalForDb.db;
}

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop, _receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
