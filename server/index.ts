import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSpells } from "./init-spells";
import { initializeDatabase } from "./init-database";
import { GameWebSocketServer } from "./websocket";
import pg from "pg";

const { Pool } = pg;

const app = express();

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
    
    try {
      // Initialize database
      await initializeDatabase(pool);
    } catch (error) {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    }
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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  // In development on Windows, bind to 127.0.0.1 to avoid ENOTSUP issues.
  // In production (including Docker), bind to 0.0.0.0 so the container is reachable.
  const host = app.get("env") === "development" ? "127.0.0.1" : "0.0.0.0";
  server.listen({
    port,
    host,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
