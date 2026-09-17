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
    throw new Error("Set DATABASE_URL to your Supabase Postgres connection string.");
  }
  return value;
}

function decodeMaybe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Split a postgres URI without WHATWG URL, which treats `#` in passwords as a fragment. */
function parseDatabaseUrl(raw: string) {
  const protocol = raw.match(/^(postgres(?:ql)?:\/\/)/i)?.[1];
  if (!protocol) {
    throw new Error("DATABASE_URL must be a postgres:// or postgresql:// URI.");
  }
  const rest = raw.slice(protocol.length);
  const at = rest.lastIndexOf("@");
  if (at === -1) {
    throw new Error("DATABASE_URL is missing a host.");
  }
  const userinfo = rest.slice(0, at);
  const hostAndPath = rest.slice(at + 1);
  const colon = userinfo.indexOf(":");
  const username = decodeMaybe(colon === -1 ? userinfo : userinfo.slice(0, colon));
  const password = decodeMaybe(colon === -1 ? "" : userinfo.slice(colon + 1));
  const slash = hostAndPath.search(/[/?]/);
  const hostPort = slash === -1 ? hostAndPath : hostAndPath.slice(0, slash);
  const pathAndQuery = slash === -1 ? "/postgres" : hostAndPath.slice(slash);
  const [hostname, portText] = hostPort.split(":");
  if (!hostname) {
    throw new Error("DATABASE_URL is missing a hostname.");
  }
  const port = Number(portText || 5432);
  const encoded = `${protocol}${encodeURIComponent(username)}:${encodeURIComponent(password)}@${hostPort}${pathAndQuery}`;
  return { hostname, port, encoded };
}

function connectIpv4Socket(hostname: string, port: number) {
  return new Promise<net.Socket>((resolve, reject) => {
    void (async () => {
      try {
        const { address, family } = net.isIPv4(hostname)
          ? { address: hostname, family: 4 as const }
          : await lookup(hostname, { family: 4 });
        console.error("[db] ipv4 socket", { hostname, address, family, port });
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
  const { hostname, port, encoded } = parseDatabaseUrl(databaseUrl());
  console.error("[db] creating postgres client", { host: hostname, port });
  const client = postgres(encoded, {
    host: hostname,
    port,
    prepare: false,
    ssl: "require",
    socket: () => connectIpv4Socket(hostname, port),
  } as Parameters<typeof postgres>[1]);
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
