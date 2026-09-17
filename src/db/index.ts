import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dns from "node:dns";
import net from "node:net";
import * as schema from "./schema";

dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

const DIRECT_SUPABASE_DB = /^db\.([a-z0-9]+)\.supabase\.co$/i;

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
  return { protocol, username, password, hostname, port, pathAndQuery };
}

function encodeDatabaseUrl(parts: {
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: number;
  pathAndQuery: string;
}) {
  return `${parts.protocol}${encodeURIComponent(parts.username)}:${encodeURIComponent(parts.password)}@${parts.hostname}:${parts.port}${parts.pathAndQuery}`;
}

/** Direct db.*.supabase.co is IPv6-only. Render needs the shared IPv4 pooler. */
function forIpv4Network(parsed: ReturnType<typeof parseDatabaseUrl>) {
  const match = parsed.hostname.match(DIRECT_SUPABASE_DB);
  if (!match) {
    return { ...parsed, lookupHosts: [parsed.hostname] };
  }
  const projectRef = match[1];
  const region = process.env.SUPABASE_REGION || "eu-west-1";
  const configured = process.env.SUPABASE_POOLER_HOST;
  // aws-0 accepted TCP but does not host this tenant.
  const lookupHosts = configured
    ? [configured]
    : [
        `aws-1-${region}.pooler.supabase.com`,
        `aws-0-${region}.pooler.supabase.com`,
      ];
  const username = parsed.username.includes(".")
    ? parsed.username
    : `${parsed.username}.${projectRef}`;
  return {
    ...parsed,
    username,
    hostname: lookupHosts[0],
    port: parsed.port || 6543,
    lookupHosts,
  };
}

function createClient(connection: ReturnType<typeof forIpv4Network>, hostname: string) {
  return postgres(encodeDatabaseUrl({ ...connection, hostname }), {
    host: hostname,
    port: connection.port,
    prepare: false,
    ssl: "require",
    connect_timeout: 15,
  });
}

function createDrizzle(hostname: string, connection: ReturnType<typeof forIpv4Network>) {
  return drizzle(createClient(connection, hostname), { schema });
}

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof createDrizzle>;
  dbProbe?: Promise<ReturnType<typeof createDrizzle>>;
};

async function openWorkingClient() {
  const connection = forIpv4Network(parseDatabaseUrl(databaseUrl()));
  console.error("[db] creating postgres client", {
    host: connection.hostname,
    port: connection.port,
    lookupHosts: connection.lookupHosts,
  });
  let lastError: unknown;
  for (const hostname of connection.lookupHosts) {
    const client = createClient(connection, hostname);
    try {
      await client`select 1`;
      console.error("[db] pooler ready", { hostname, port: connection.port });
      return drizzle(client, { schema });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[db] pooler rejected", { hostname, message: message.slice(0, 240) });
      await client.end({ timeout: 0 }).catch(() => {});
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not connect to the Supabase pooler.");
}

export async function ensureDb() {
  if (globalForDb.db) return globalForDb.db;
  globalForDb.dbProbe ??= openWorkingClient().then((db) => {
    globalForDb.db = db;
    return db;
  });
  return globalForDb.dbProbe;
}

function getDb() {
  if (!globalForDb.db) {
    throw new Error("Database is still connecting. Refresh in a moment.");
  }
  return globalForDb.db;
}

export const db = new Proxy({} as ReturnType<typeof createDrizzle>, {
  get(_target, prop, _receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
