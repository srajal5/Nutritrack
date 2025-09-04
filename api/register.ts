import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Define the user schema directly in the API
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, default: 1 },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String },
  firebaseId: { 
    type: String, 
    unique: true,
    sparse: true
  },
  profilePicture: { type: String },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Database connection function
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB already connected');
    return;
  }
  
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set');
  }
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected successfully');
}

// Storage functions
async function getUserByUsername(username: string) {
  return await User.findOne({ username });
}

async function createUser(userData: any) {
  const lastUser = await User.findOne().sort({ id: -1 });
  const newId = lastUser ? lastUser.id + 1 : 1;
  
  const userDataWithId = {
    ...userData,
    id: newId,
    firebaseId: userData.firebaseId || `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  };
  
  const user = new User(userDataWithId);
  return await user.save();
}

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
    const existingUser = await getUserByUsername(username);
    console.log('Existing user check result:', existingUser ? 'User exists' : 'No existing user');
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');
    
    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log('Generated localId:', localId);
    
    console.log('Creating user with data:', {
      username,
      email,
      firebaseId: localId,
      hasPassword: !!hashedPassword
    });
    
    const user = await createUser({
      username,
      password: hashedPassword,
      email,
      firebaseId: localId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('User created successfully:', { id: user.id, username: user.username });

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


