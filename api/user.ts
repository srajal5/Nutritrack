import { getServerlessHandler } from './_serverless';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const serverlessHandler = await getServerlessHandler();
  return serverlessHandler(req, res);
}


