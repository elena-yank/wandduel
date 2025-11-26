import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { initializeSpells } from "./init-spells";
import { GameWebSocketServer } from "./websocket";
import pg from "pg";

const { Pool } = pg;

const app = express();

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Development CORS: allow requests from local Vite dev servers
app.use((req, res, next) => {
  if (app.get("env") === "development") {
    const origin = req.headers.origin as string | undefined;
    const isLocalOrigin = origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    if (isLocalOrigin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
    }
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  let storage;
  
  // Force in-memory storage if FORCE_MEMORY_STORAGE is set, or if DATABASE_URL is not set
  if (process.env.FORCE_MEMORY_STORAGE === "true" || !process.env.DATABASE_URL) {
    // Use in-memory storage
    console.log("Using in-memory storage");
    const { MemStorage } = await import("./storage");
    storage = new MemStorage();
  } else {
    // Use PostgreSQL storage when DATABASE_URL is provided and FORCE_MEMORY_STORAGE is not set
    console.log("Using PostgreSQL storage");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const { createPostgresStorage } = await import("./storage");
    storage = createPostgresStorage(pool);
  }
  
  const server = await registerRoutes(app, storage);
  
  // Initialize WebSocket server
  const wsServer = new GameWebSocketServer(server);
  
  // Make WebSocket server available globally for broadcasting updates
  (global as any).wsServer = wsServer;
  
  try {
    // Initialize spells
    await initializeSpells(storage);
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Настраиваем Vite только в dev через динамический импорт,
  // чтобы в production не тянуть dev-зависимость "vite"
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
    if (!fs.existsSync(distPath)) {
      throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  // In development on Windows, bind to 127.0.0.1 to avoid ENOTSUP issues.
  // In production (including Docker), bind to 0.0.0.0 so the container is reachable.
  const host = process.env.NODE_ENV === "development" ? "127.0.0.1" : "0.0.0.0";
  server.listen({
    port,
    host,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
