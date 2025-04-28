import { createServer } from "node:http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import helmet from "helmet";
import config from "./config/config";
import cookieParser from "cookie-parser";
import cors from "cors";

// Import Routers
import authService from "@/services/auth/routes";
import usersService from "@/services/users/routes";
import jobsService from "@/services/jobs/routes";
import applicationsService from "@/services/applications/routes";
import chatService from "@/services/chat/routes";
import statisticsService from "@/services/statistics/routes";

import { ensureToken } from "./services/auth/middlewares";
import { validationErrorHandler } from "./common/middlewares";
import { centralizedErrorHandler } from "./common/error-handlers";
import { initializeSocketIO } from "./services/chat/socket";

const app = express();
const httpServer = createServer(app);

// socket instance
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.server.corsOrigins || "http://localhost:5173" ,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
initializeSocketIO(io); // Setup Socket.IO authentication and event handlers

if (config.env === "production") {
  app.set("trust proxy", 1);
  // Force HTTPS redirect
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    return next();
  });
}

app.use(helmet());
app.disable("x-powered-by");
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: config.server.corsOrigins || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

const API_PREFIX = "/api/v1";

// Public route group (Auth)
app.use(`${API_PREFIX}/auth`, authService);

// Protected route groups
app.use(`${API_PREFIX}/users`, ensureToken, usersService);
app.use(`${API_PREFIX}/jobs`, ensureToken, jobsService);
app.use(`${API_PREFIX}/applications`, ensureToken, applicationsService);
app.use(`${API_PREFIX}/chat`, ensureToken, chatService);
app.use(`${API_PREFIX}/statistics`, ensureToken, statisticsService);

// --- Error Handling Middlewares (ORDER MATTERS) ---
// 1. Handle Zod validation errors first
app.use(validationErrorHandler);
// 2. Handle all other errors (generic handler)
app.use(centralizedErrorHandler);

// --- Catch-all for undefined routes (LAST) ---
// This middleware will handle any request that didn't match previous routes
app.use((req, res, next) => {
  if (req.path.startsWith(API_PREFIX)) {
    res.status(404).json({ message: "API route not found." });
  } else {
    res.status(404).json({ message: "Resource not found." });
  }
});

httpServer.listen(config.server.port, () => {
  console.log(`🚀 Server running in ${config.env} mode on port ${config.server.port}`);
  if (config.env === "development") {
    console.log(`➜ Local: http://${config.server.host}:${config.server.port}`);
  }
  console.log("🔌Socket.IO initialized and listening.");
});

// Optional: Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    // Close database connections, etc.
    process.exit(0);
  });
});
process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app