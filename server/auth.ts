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
      ? 'https://your-production-domain.com' 
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400 // 24 hours
  };
  
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

  // Configure session store with updated settings
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
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
      sameSite: 'lax', // Changed from 'strict' to 'lax' for development
      httpOnly: true,
      path: '/'
    },
    name: 'foodfitness.sid'
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Add session logging middleware AFTER passport initialization
  

  // Updated LocalStrategy with better error handling
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Invalid username or password.' });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid username or password.' });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
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
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
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

      req.login(user, (err) => {
        if (err) return next(err);
        req.session.save((err) => {
          if (err) return next(err);
          const { password, ...userWithoutPassword } = user;
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
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      console.log('Login attempt:', {
        error: err,
        user: user ? { id: user.id, username: user.username } : null,
        info
      });

      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Login failed' });
      }

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({ message: 'Session creation failed' });
        }

        console.log('Session created:', {
          sessionID: req.sessionID,
          user: { id: user.id, username: user.username }
        });

        return res.json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName
          },
          sessionID: req.sessionID
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('foodfitness.sid');
        res.status(200).json({ message: `${username} logged out successfully` });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...userWithoutPassword } = req.user as UserDocument;
    res.json({ user: userWithoutPassword });
  });
}