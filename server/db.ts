import 'dotenv/config';
import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI must be set. Did you forget to set up your MongoDB connection?",
  );
}

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error; // Don't exit process in serverless
  }
};

export { connectDB };