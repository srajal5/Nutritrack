import { getServerlessHandler } from './_serverless';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    
    console.log('Register endpoint called:', { method: req.method, url: req.url });
    const serverlessHandler = await getServerlessHandler();
    return serverlessHandler(req, res);
  } catch (error) {
    console.error('Register handler error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}


