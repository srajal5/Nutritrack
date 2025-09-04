declare module 'serverless-http' {
  import type { Express } from 'express';
  type Handler = (app: Express) => (req: any, res: any) => any;
  const serverless: Handler;
  export default serverless;
}


