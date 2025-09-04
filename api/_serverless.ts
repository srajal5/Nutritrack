import 'dotenv/config';
import express from 'express';
import serverless from 'serverless-http';
import { registerRoutes } from "../server/routes";
import { connectDB } from "../server/db";

let cachedHandler: ((req: any, res: any) => any) | null = null;

export async function getServerlessHandler() {
  if (cachedHandler) return cachedHandler;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  await connectDB();
  await registerRoutes(app);

  const handler = serverless(app);
  cachedHandler = (req: any, res: any) => handler(req, res);
  return cachedHandler;
}

export const config = { runtime: 'nodejs' };


