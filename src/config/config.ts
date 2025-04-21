import env from "@/lib/env";

const config = {
  env: env.NODE_ENV,
  server: {
    port: env.PORT || env.SERVER_PORT,
    host: env.NODE_ENV === "production" ? undefined : env.SERVER_HOST,
    corsOrigins: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
  },
  database: {
    port: env.DB_PORT,
    host: env.DB_HOST,
    name: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    url: env.DB_URL.includes("?") ? env.DB_URL : `${env.DB_URL}?ssl=true`,
  },
  jwt: {
    accessTokenSecret: env.JWT_ACCESS_SECRET,
    refreshTokenSecret: env.JWT_REFRESH_SECRET,
  }
};

export default config;
