import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { registerRoutes } from "./routes.js";
import { setupVite, log } from "./vite.js";
import { connectDB } from "./db.js";
import storage from "./storage.js";
import mongoose from 'mongoose';
import helmet from 'helmet';
import config from './config.js';


console.log('Environment:', config.env);
console.log('OpenRouter API Key configured:', !!config.ai.apiKey);

const app = express();

app.use(helmet({
  contentSecurityPolicy: config.isProduction
    ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://api.dicebear.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    }
    : false,
}));
app.disable('x-powered-by');
// Food photos are posted as base64 data URLs, which blow past the 100kb default.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Enhanced Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// NOTE: CORS is configured in one place only — setupAuth() in server/auth.ts.
// A second hand-rolled layer here used to answer preflights before that ran,
// which meant the two could disagree about which origins are allowed.

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
  try {
    // Connect to MongoDB first
    await connectDB();

    // Verify MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection failed');
    }


    // Verify storage instance is properly initialized
    if (!storage || typeof storage.getUserByUsername !== 'function') {
      throw new Error('Storage instance not properly initialized');
    }
    console.log('Storage instance initialized successfully');

    // Create HTTP server
    // snyk-ignore-next-line javascript/HttpToHttps
    const server = createServer(app);

    // Register routes after database connection is established
    await registerRoutes(app);

    // Unknown /api routes must answer with JSON. Without this they fall through
    // to the SPA catch-all below and the client receives an HTML page where it
    // expects JSON, which surfaces as a confusing parse error.
    app.use('/api', (req, res) => {
      res.status(404).json({ message: `Not found: ${req.method} /api${req.path}` });
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('Unhandled server error:', err);
      if (res.headersSent) return;
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      const distPath = path.resolve(import.meta.dirname, '..', 'public');
      // Serve static files from the built client
      app.use(express.static(distPath));
      // Serve index.html for all other routes (SPA fallback)
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    // Use port from centralized config
    const port = config.port;
    server.listen(port, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
