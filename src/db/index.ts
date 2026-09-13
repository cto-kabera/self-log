import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("Set DATABASE_URL to your Supabase Postgres connection string.");
  }
  return value;
}

function createDb() {
  const client = postgres(databaseUrl(), { prepare: false });
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
