import 'dotenv/config';
import express from 'express';
import serverless from 'serverless-http';
import { registerRoutes } from "../server/routes";
import { connectDB } from "../server/db";

// Create a new Express app instance for the serverless function
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize DB and register routes once per cold start
const initPromise: Promise<void> = (async () => {
  await connectDB();
  await registerRoutes(app);
})();

// Wrap the Express app with serverless-http for Vercel
const handler = serverless(app);

export default async function (req: any, res: any) {
  await initPromise;
  return handler(req, res);


  
}


