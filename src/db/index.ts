import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schemas";
import config from "@/config/config"; // Use validated config
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,   // p@ssword works fine here
  database: process.env.DB_NAME,
  // connectionString: config.database.url,
  ssl: config.env === "production" ? { rejectUnauthorized: false } : false,
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
  logger: config.env === "development",
});

export type DbInstance = typeof db; // Use a more descriptive type name

export default db;