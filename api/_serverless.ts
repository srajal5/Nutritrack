import 'dotenv/config';
import express from 'express';
import serverless from 'serverless-http';
import { registerRoutes } from "../server/routes";
import { connectDB } from "../server/db";

let cachedHandler: ((req: any, res: any) => any) | null = null;
let initError: Error | null = null;

export async function getServerlessHandler() {
  if (cachedHandler) return cachedHandler;
  if (initError) throw initError;

  try {
    console.log('Initializing serverless handler...');
    
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');

    console.log('Registering routes...');
    await registerRoutes(app);
    console.log('Routes registered successfully');

    const handler = serverless(app);
    cachedHandler = (req: any, res: any) => {
      console.log(`Handling ${req.method} ${req.url}`);
      return handler(req, res);
    };
    
    console.log('Serverless handler initialized successfully');
    return cachedHandler;
  } catch (error) {
    console.error('Failed to initialize serverless handler:', error);
    initError = error as Error;
    throw error;
  }
}

export const config = { runtime: 'nodejs' };


