import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import storage from "./storage";
import type { UserDocument } from "./storage";
import bcrypt from "bcrypt";
import MongoStore from "connect-mongo";
import cors from "cors";

declare global {
  namespace Express {
    interface User extends UserDocument {}
  }
}

export function setupAuth(app: Express) {
  // Configure CORS with specific options
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? [/^https:\/\/.+\.vercel\.app$/, 'https://vercel.app']
      : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };
  
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

  // Configure session store with updated settings
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/foodfiness',
      collectionName: 'sessions',
      ttl: 24 * 60 * 60,
      autoRemove: 'native',
      touchAfter: 24 * 3600
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      httpOnly: true,
      path: '/'
    },
    name: 'foodfitness.sid'
  }));

  app.use(passport.initialize());
  app.use(passport.session());



  // Updated LocalStrategy with better error handling
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
        session: true
      },
      async (username, password, done) => {
        try {
          const user = await storage.getUserByUsername(username);
          if (!user) {
            return done(null, false, { message: 'Invalid username or password.' });
          }

          const isValid = await bcrypt.compare(password, user.password);
          
          if (!isValid) {
            return done(null, false, { message: 'Invalid username or password.' });
          }

          console.log('Login successful for:', username);
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

  const registerHandler = async (req: any, res: any, _next: (err?: unknown) => void) => {
    try {
      const { username, password, email } = req.body;
      
      if (!username || !password || !email) {
        return res.status(400).json({ message: "Username, password, and email are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Generate a unique local ID for non-Firebase users
      const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        firebaseId: localId, // Set a unique local ID instead of null
        createdAt: new Date(),
        updatedAt: new Date()
      });

      req.login(user, (err: unknown) => {
        if (err) return _next(err);
        req.session.save((err: unknown) => {
          if (err) return _next(err);
          const plainUser = typeof user.toObject === 'function' ? user.toObject() : { ...user };
          const { password, _id, __v, ...userWithoutPassword } = plainUser;
          res.status(201).json({ 
            user: userWithoutPassword, 
            message: "Registration successful",
            sessionId: req.sessionID 
          });
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Registration failed", error: errorMessage });
    }
  };
  app.post("/api/register", registerHandler);
  app.post("/register", registerHandler);

  const loginHandler = async (req: any, res: any, _next: (err?: unknown) => void) => {
    try {
      console.log('Login request received:', {
        body: { ...req.body, password: '[REDACTED]' },
        sessionID: req.sessionID,
        cookies: req.cookies
      });

      const { username, password } = req.body;
      
      if (!username || !password) {
        console.log('Missing credentials:', { username: !!username, password: !!password });
        return res.status(400).json({ 
          message: 'Username and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      // First, try to find the user
      const user = await storage.getUserByUsername(username);
      console.log('User lookup result:', { 
        found: !!user, 
        username,
        userId: user?.id 
      });

      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Then verify the password
      const isValid = await bcrypt.compare(password, user.password);
      console.log('Password verification:', { 
        username,
        isValid,
        userId: user.id
      });

      if (!isValid) {
        return res.status(401).json({ 
          message: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // If we get here, the credentials are valid
      req.login(user, (err: unknown) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ 
            message: 'Login failed',
            code: 'LOGIN_ERROR'
          });
        }

        console.log('User logged in successfully:', {
          userId: user.id,
          username: user.username,
          sessionID: req.sessionID
        });

        // Save session explicitly
        req.session.save((err: unknown) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ 
              message: 'Session save failed',
              code: 'SESSION_ERROR'
            });
          }

          console.log('Session saved successfully:', {
            sessionID: req.sessionID,
            cookie: req.session.cookie
          });

          // Set session cookie
          res.cookie('foodfitness.sid', req.sessionID, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
          });

          // Return user data
          const plainUser = typeof user.toObject === 'function' ? user.toObject() : { ...user };
          const { password: _, _id, __v, ...userWithoutPassword } = plainUser;
          return res.json({
            user: userWithoutPassword,
            sessionID: req.sessionID
          });
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ 
        message: 'Login failed',
        code: 'SERVER_ERROR'
      });
    }
  };
  app.post("/api/login", loginHandler);
  app.post("/login", loginHandler);

  const logoutHandler = (req: any, res: any, next: (err?: unknown) => void) => {
    const username = req.user?.username;
    req.logout((err: unknown) => {
      if (err) return next(err);
      req.session.destroy((err: unknown) => {
        if (err) return next(err);
        // Clear all session cookies
        res.clearCookie('foodfitness.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        // Clear any other potential auth cookies
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        // Add cache control headers
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json({ message: `${username} logged out successfully` });
      });
    });
  };
  app.post("/api/logout", logoutHandler);
  app.post("/logout", logoutHandler);

  const userHandler = (req: any, res: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userDoc = req.user as any;
    // Convert Mongoose document to plain object and strip password
    const plainUser = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
    const { password, _id, __v, ...userWithoutPassword } = plainUser;
    res.json(userWithoutPassword);
  };
  app.get("/api/user", userHandler);
  app.get("/user", userHandler);
  // NOTE: SPA fallback is handled by setupVite (dev) and express.static (prod) in index.ts
}