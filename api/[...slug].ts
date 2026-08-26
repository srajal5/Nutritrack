import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { registerRoutes } from "../server/routes";
import { connectDB } from "../server/db";

const app = express();
app.disable('x-powered-by');

// Vercel's Node runtime may have already consumed and parsed the request body.
// Flag it as read so body-parser keeps `req.body` instead of waiting on a
// stream that will never emit (which would otherwise hang the function).
app.use((req, _res, next) => {
  const anyReq = req as any;
  if (anyReq.body !== undefined && anyReq._body !== true) {
    anyReq._body = true;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Routes are registered once per warm instance. A failed boot must not poison
// the cached promise, otherwise every later invocation on this instance fails.
let initPromise: Promise<void> | null = null;
let lastInitError: Error | null = null;

function init(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await connectDB();
      await registerRoutes(app);

      // JSON error handler, registered after all routes.
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err?.status || err?.statusCode || 500;
        console.error('Unhandled API error:', err);
        if (res.headersSent) return;
        res.status(status).json({
          message: err?.message || 'Internal Server Error',
          code: err?.code,
        });
      });

      lastInitError = null;
    })().catch((err) => {
      lastInitError = err instanceof Error ? err : new Error(String(err));
      initPromise = null; // allow the next invocation to retry
      throw err;
    });
  }
  return initPromise;
}

/**
 * Reports which subsystems are reachable without needing the full route tree
 * to have booted. When a deployment misbehaves this is the fastest way to tell
 * a configuration gap (missing env var) from a runtime fault (module that
 * will not load in the serverless bundle).
 */
async function health(res: any) {
  const checks: Record<string, unknown> = {
    env: {
      MONGODB_URI: !!process.env.MONGODB_URI,
      SESSION_SECRET: !!process.env.SESSION_SECRET,
      OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
      NODE_ENV: process.env.NODE_ENV || null,
    },
  };

  try {
    const bcrypt = (await import('bcryptjs')).default;
    const hash = await bcrypt.hash('healthcheck', 4);
    checks.passwordHashing = (await bcrypt.compare('healthcheck', hash)) ? 'ok' : 'mismatch';
  } catch (err: any) {
    checks.passwordHashing = `failed: ${err?.message || err}`;
  }

  try {
    await connectDB();
    checks.database = mongoose.connection.readyState === 1 ? 'ok' : `readyState=${mongoose.connection.readyState}`;
  } catch (err: any) {
    checks.database = `failed: ${err?.message || err}`;
  }

  try {
    await init();
    checks.routes = 'ok';
  } catch (err: any) {
    checks.routes = `failed: ${err?.message || err}`;
  }

  const ok = checks.database === 'ok' && checks.routes === 'ok' && checks.passwordHashing === 'ok';
  res.statusCode = ok ? 200 : 503;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ ok, checks }, null, 2));
}

export default async function handler(req: any, res: any) {
  const path = (req.url || '').split('?')[0];
  if (path === '/api/health' || path === '/health') {
    return health(res);
  }

  try {
    await init();
  } catch (err: any) {
    // Log the full error for the platform logs, and return enough detail that
    // a broken deployment is diagnosable from the browser.
    console.error('API initialization failed:', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      message: `Server failed to start: ${err?.message || lastInitError?.message || 'unknown error'}`,
      code: 'INIT_FAILED',
    }));
    return;
  }

  return app(req, res);
}
