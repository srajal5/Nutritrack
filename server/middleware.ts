import { Request, Response, NextFunction } from "express";

// Middleware to ensure user is authenticated
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth check:', {
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user,
      cookies: req.headers.cookie
    });
  }
  
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticatd" });
}; 