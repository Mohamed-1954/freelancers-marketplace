import { config } from "dotenv";
import { expand } from "dotenv-expand";

import { ZodError, z } from "zod";

const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    PORT: z.coerce.number().optional(),
    SERVER_HOST: z.string().default("localhost"),
    SERVER_PORT: z.coerce.number().default(5273),
    CORS_ORIGINS: z.string().default("http://localhost:3000"),
    DB_HOST: z.string(),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string(),
    DB_PORT: z.coerce.number().default(5432),
    DB_URL: z.string().refine((url) => {
        if (process.env.NODE_ENV === "production" && !url.includes("?ssl=true")) {
            console.warn(
                "⚠️  Production DB_URL should include ?ssl=true for Render PostgreSQL"
            );
        }
        return true;
    }),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
});

export type EnvSchema = z.infer<typeof EnvSchema>;

expand(config());

try {
    EnvSchema.parse(process.env);
} catch (error) {
    if (error instanceof ZodError) {
        let message = "Missing required values in .env:\n";
        for (const issue of error.issues) {
            message += `${issue.path[0]}\n`;
        }
        const e = new Error(message);
        e.stack = "";
        throw e;
    }
    console.error(error);
}

export default EnvSchema.parse(process.env);