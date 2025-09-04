import 'dotenv/config';
import { connectDB } from '../server/db';
import storage from '../server/storage';
import bcrypt from 'bcrypt';

export default async function handler(req: any, res: any) {
  try {
    console.log('Login endpoint called:', { 
      method: req.method, 
      url: req.url,
      body: req.body ? { ...req.body, password: '[REDACTED]' } : 'No body'
    });

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');

    console.log('Looking up user...');
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    console.log('Verifying password...');
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ 
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    console.log('Login successful for user:', user.id);

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: userWithoutPassword,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login handler error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}


