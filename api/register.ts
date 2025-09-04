import 'dotenv/config';
import { connectDB } from '../server/db';
import storage from '../server/storage';
import bcrypt from 'bcrypt';

export default async function handler(req: any, res: any) {
  try {
    console.log('Register endpoint called:', { 
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

    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ message: "Username, password, and email are required" });
    }

    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');

    console.log('Checking for existing user...');
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    console.log('Creating new user...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      email,
      firebaseId: localId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('User created successfully:', user.id);

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ 
      user: userWithoutPassword, 
      message: "Registration successful"
    });

  } catch (error) {
    console.error('Register handler error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}


