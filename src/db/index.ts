import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { lookup } from "node:dns/promises";
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

function parseDatabaseUrl(raw: string) {
  const parsed = new URL(raw.replace(/^postgres(?:ql)?:/i, "https:"));
  return {
    hostname: parsed.hostname,
    port: Number(parsed.port || 5432),
  };
}

function connectIpv4Socket(hostname: string, port: number) {
  return new Promise<net.Socket>((resolve, reject) => {
    void (async () => {
      try {
        const { address, family } = net.isIPv4(hostname)
          ? { address: hostname, family: 4 as const }
          : await lookup(hostname, { family: 4 });
        console.error("[db] ipv4 socket", { hostname, address, family, port });
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
            hypothesisId: "F",
            location: "db/index.ts:connectIpv4Socket",
            message: "opening ipv4 socket",
            data: { hostname, address, family, port },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        const socket = net.connect({ host: address, port, family: 4 });
        socket.once("connect", () => {
          (socket as net.Socket & { host?: string }).host = hostname;
          resolve(socket);
        });
        socket.once("error", reject);
      } catch (error) {
        console.error("[db] ipv4 lookup failed", {
          hostname,
          port,
          err: error instanceof Error ? error.message : String(error),
        });
        reject(error);
      }
    })();
  });
}

function createDb() {
  const raw = databaseUrl();
  const { hostname, port } = parseDatabaseUrl(raw);
  console.error("[db] creating postgres client", {
    host: hostname,
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
      hypothesisId: "F",
      location: "db/index.ts:createDb",
      message: "creating postgres client with ipv4 socket",
      data: {
        host: hostname,
        port,
        resultOrder: dns.getDefaultResultOrder(),
        autoSelectFamily: net.getDefaultAutoSelectFamily(),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const client = postgres(raw, {
    prepare: false,
    ssl: "require",
    socket: () => connectIpv4Socket(hostname, port),
  });
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
