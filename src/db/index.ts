import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schemas";
import config from "@/config/config"; // Use validated config
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.database.url,
});

pool.on('connect', () => {
    console.log('🐘 Database pool connected');
});

pool.on('error', (err) => {
    console.error('❌ Database pool error:', err);
    // Consider exiting or implementing retry logic depending on the error
});

export const db = drizzle(pool, {
  schema,
  // Enable logger only in development
  logger: config.env === "development",
});

export type DbInstance = typeof db; // Use a more descriptive type name

export default db;