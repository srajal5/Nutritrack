import 'dotenv/config';
import express from 'express';
import serverless from 'serverless-http';
import { registerRoutes } from "../server/routes";
import { connectDB } from "../server/db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const initPromise: Promise<void> = (async () => {
  await connectDB();
  await registerRoutes(app);
})();

const handler = serverless(app);

export default async function (req: any, res: any) {
  await initPromise;
  return handler(req, res);
}


