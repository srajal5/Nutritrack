import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { connectDB } from "./db";
import storage from "./storage";
import mongoose from 'mongoose';
import helmet from 'helmet';
import config from './config';

// Log environment variables (without sensitive values)
console.log('Environment:', config.env);
console.log('OpenRouter API Key configured:', !!config.ai.apiKey);

const app = express();
app.use(helmet({
  contentSecurityPolicy: config.env === 'production' ? undefined : false,
}));
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use((req, res, next) => {
  const allowedOrigins = config.allowedOrigins;
  
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.some(ao => origin.startsWith(ao)))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin && config.env === 'development') {
    // Allow server-to-server or non-browser requests in dev
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
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
      // Serve static files from the dist/public directory
      app.use(express.static('dist/public'));
      // Serve index.html for all other routes (SPA fallback)
      app.get('*', (_req, res) => {
        res.sendFile('dist/public/index.html', { root: '.' });
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
