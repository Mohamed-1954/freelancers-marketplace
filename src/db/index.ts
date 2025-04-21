import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schemas";
import config from "@/config/config";
import pg from "pg"; 

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.env === "production" ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, {
  schema,
  logger: config.env === "development",
});

export type db = typeof db;

export default db;