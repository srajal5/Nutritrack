export default async function handler(req: any, res: any) {
  try {
    console.log('Test endpoint called:', { method: req.method, url: req.url });
    
    // Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
    };
    
    console.log('Environment check:', envCheck);
    
    res.status(200).json({
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
      environment: envCheck
    });
  } catch (error) {
    console.error('Test handler error:', error);
    res.status(500).json({ 
      message: 'Test endpoint error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
