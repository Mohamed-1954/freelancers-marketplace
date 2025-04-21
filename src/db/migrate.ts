import { migrate } from "drizzle-orm/node-postgres/migrator";
import config from "../../drizzle.config";
import { db, pool } from "@/db";

async function main() {
  if (config.out) {
    await migrate(db, { migrationsFolder: config.out });
    console.log("Migration done!");
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await pool.end();
  });