import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
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
        res.status(status).json({ message: err?.message || 'Internal Server Error' });
      });
    })().catch((err) => {
      initPromise = null; // allow the next invocation to retry
      throw err;
    });
  }
  return initPromise;
}

export default async function handler(req: any, res: any) {
  try {
    await init();
  } catch (err) {
    console.error('API initialization failed:', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Service temporarily unavailable' }));
    return;
  }
  return app(req, res);
}
