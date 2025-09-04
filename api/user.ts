import { getServerlessHandler } from './_serverless';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    
    console.log('User endpoint called:', { method: req.method, url: req.url });
    const serverlessHandler = await getServerlessHandler();
    return serverlessHandler(req, res);
  } catch (error) {
    console.error('User handler error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}


