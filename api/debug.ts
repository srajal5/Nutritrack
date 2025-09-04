import 'dotenv/config';
import { connectDB } from '../server/db';
import storage from '../server/storage';

export default async function handler(req: any, res: any) {
  try {
    console.log('Debug endpoint called');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
        SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
      },
      steps: []
    };

    try {
      results.steps.push('Step 1: Starting database connection...');
      console.log('Step 1: Starting database connection...');
      
      await connectDB();
      results.steps.push('Step 2: Database connected successfully');
      console.log('Step 2: Database connected successfully');

      results.steps.push('Step 3: Testing storage.getUserByUsername...');
      console.log('Step 3: Testing storage.getUserByUsername...');
      
      const testUser = await storage.getUserByUsername('testuser123');
      results.steps.push(`Step 4: getUserByUsername returned: ${testUser ? 'User found' : 'No user found'}`);
      console.log('Step 4: getUserByUsername test completed');

      results.steps.push('Step 5: Testing storage.createUser...');
      console.log('Step 5: Testing storage.createUser...');
      
      const testUserData = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'hashedpassword123',
        firebaseId: `test_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newUser = await storage.createUser(testUserData);
      results.steps.push(`Step 6: createUser successful, user ID: ${newUser.id}`);
      console.log('Step 6: createUser successful');

      results.steps.push('Step 7: All tests passed!');
      results.success = true;

    } catch (dbError) {
      results.steps.push(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      results.steps.push(`Stack trace: ${dbError instanceof Error ? dbError.stack : 'No stack trace'}`);
      results.success = false;
      console.error('Database error:', dbError);
    }

    res.status(200).json(results);

  } catch (error) {
    console.error('Debug handler error:', error);
    res.status(500).json({ 
      message: 'Debug endpoint error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
