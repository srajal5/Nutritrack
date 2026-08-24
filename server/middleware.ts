import { Request, Response, NextFunction } from "express";

// Middleware to ensure user is authenticated
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  console.log('Auth failed for:', req.method, req.originalUrl);
  return res.status(401).json({ message: "Not authenticated" });
};