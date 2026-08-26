import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import storage from "./storage.js";
import type { UserDocument } from "./storage.js";
// bcryptjs, not the native "bcrypt": the native build resolves its .node binary
// at runtime, which serverless bundlers cannot trace, so the module fails to
// load once deployed. The hash format is identical ($2b$), so existing
// passwords keep verifying.
import bcrypt from "bcryptjs";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import cors from "cors";
import config from "./config.js";

declare global {
  namespace Express {
    interface User extends UserDocument {}
  }
}

const isProduction = config.isProduction;

/**
 * In production the session secret must come from the environment — a hard-coded
 * fallback would let anyone forge a session cookie.
 */
function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length > 0) return secret;
  if (isProduction) {
    throw new Error(
      'SESSION_SECRET must be set in production. Add it to your environment variables.'
    );
  }
  console.warn('[auth] SESSION_SECRET is not set — using an insecure development fallback.');
  return 'dev-only-insecure-session-secret';
}

/**
 * Reuse the connection mongoose already opened instead of letting connect-mongo
 * dial a second pool. On serverless that halves the connections per cold start.
 */
function createSessionStore() {
  if (mongoose.connection.readyState === 1) {
    return MongoStore.create({
      client: mongoose.connection.getClient() as any,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60,
      autoRemove: 'native',
      touchAfter: 24 * 3600,
    });
  }

  const mongoUrl = process.env.MONGODB_URI;
  if (!mongoUrl) {
    throw new Error('MONGODB_URI must be set to persist sessions.');
  }
  return MongoStore.create({
    mongoUrl,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
    autoRemove: 'native',
    touchAfter: 24 * 3600,
  });
}

function buildCorsOptions() {
  const allowed = config.allowedOrigins;
  return {
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Same-origin requests and non-browser clients send no Origin header.
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      if (isProduction && /^https:\/\/[^/]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400,
    optionsSuccessStatus: 204,
  };
}

/**
 * Look the user up by the trimmed name first — pasted credentials routinely
 * carry stray whitespace. Some accounts were created before registration
 * trimmed, so their stored username really does contain the spaces; fall back
 * to the raw value rather than locking those people out.
 */
async function findUserForLogin(rawUsername: string) {
  const trimmed = rawUsername.trim();
  const user = await storage.getUserByUsername(trimmed);
  if (user || trimmed === rawUsername) return user;
  return storage.getUserByUsername(rawUsername);
}

/** Strip password and mongo internals before sending a user to the client. */
function toPublicUser(user: any) {
  const plain = typeof user?.toObject === 'function' ? user.toObject() : { ...user };
  const { password, _id, __v, ...rest } = plain;
  return rest;
}

export function setupAuth(app: Express) {
  const corsOptions = buildCorsOptions();
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Required for secure cookies behind Vercel's proxy.
  app.set('trust proxy', 1);

  app.use(session({
    secret: resolveSessionSecret(),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: createSessionStore(),
    cookie: {
      secure: isProduction,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      httpOnly: true,
      path: '/',
    },
    name: 'foodfitness.sid',
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
        session: true,
      },
      async (username, password, done) => {
        try {
          const user = await findUserForLogin(String(username));
          if (!user) {
            return done(null, false, { message: 'Invalid username or password.' });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: 'Invalid username or password.' });
          }

          return done(null, user);
        } catch (err) {
          console.error('Error in LocalStrategy:', err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      console.error('Error in deserializeUser:', err);
      done(err);
    }
  });

  /**
   * Regenerate the session before establishing the login so a pre-auth session
   * id cannot be reused afterwards (session fixation). Passport 0.6+ no longer
   * does this for us.
   */
  function establishSession(req: any, user: UserDocument): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.regenerate((regenErr: unknown) => {
        if (regenErr) return reject(regenErr);
        req.login(user, (loginErr: unknown) => {
          if (loginErr) return reject(loginErr);
          req.session.save((saveErr: unknown) => {
            if (saveErr) return reject(saveErr);
            resolve();
          });
        });
      });
    });
  }

  const registerHandler = async (req: any, res: any) => {
    try {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!username || !password || !email) {
        return res.status(400).json({
          message: "Username, password, and email are required",
          code: 'MISSING_FIELDS',
        });
      }
      if (username.length < 3) {
        return res.status(400).json({
          message: "Username must be at least 3 characters",
          code: 'INVALID_USERNAME',
        });
      }
      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
          code: 'WEAK_PASSWORD',
        });
      }

      if (await storage.getUserByUsername(username)) {
        return res.status(409).json({ message: "Username already exists", code: 'USERNAME_TAKEN' });
      }
      if (await storage.getUserByEmail(email)) {
        return res.status(409).json({ message: "Email already registered", code: 'EMAIL_TAKEN' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Non-Firebase accounts still need a unique firebaseId — the index is
      // sparse-unique, so a shared null would collide.
      const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        firebaseId: localId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await establishSession(req, user);

      return res.status(201).json({
        user: toPublicUser(user),
        message: "Registration successful",
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      // Duplicate key from a race between the checks above and the insert.
      if (error?.code === 11000) {
        return res.status(409).json({
          message: "An account with those details already exists",
          code: 'DUPLICATE',
        });
      }
      return res.status(500).json({ message: "Registration failed", code: 'SERVER_ERROR' });
    }
  };
  app.post("/api/register", registerHandler);

  const loginHandler = async (req: any, res: any) => {
    try {
      const username = typeof req.body?.username === 'string' ? req.body.username : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!username.trim() || !password) {
        return res.status(400).json({
          message: 'Username and password are required',
          code: 'MISSING_CREDENTIALS',
        });
      }

      const user = await findUserForLogin(username);
      if (!user) {
        return res.status(401).json({
          message: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({
          message: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      await establishSession(req, user);

      // NOTE: express-session sets the signed `foodfitness.sid` cookie itself.
      // Writing that cookie manually here would overwrite it with an unsigned
      // value, and every following request would then read as logged out.
      return res.json({ user: toPublicUser(user) });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Login failed', code: 'SERVER_ERROR' });
    }
  };
  app.post("/api/login", loginHandler);

  const logoutHandler = (req: any, res: any, next: (err?: unknown) => void) => {
    const username = req.user?.username;

    const finish = () => {
      res.clearCookie('foodfitness.sid', {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
      });
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).json({
        message: username ? `${username} logged out successfully` : 'Logged out',
      });
    };

    if (typeof req.logout !== 'function' || !req.session) {
      return finish();
    }

    req.logout((err: unknown) => {
      if (err) return next(err);
      req.session.destroy((destroyErr: unknown) => {
        if (destroyErr) return next(destroyErr);
        finish();
      });
    });
  };
  app.post("/api/logout", logoutHandler);

  const userHandler = (req: any, res: any) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated", code: 'NOT_AUTHENTICATED' });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(toPublicUser(req.user));
  };
  app.get("/api/user", userHandler);
  // NOTE: SPA fallback is handled by setupVite (dev) and express.static (prod) in index.ts
}
