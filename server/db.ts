import 'dotenv/config';
import mongoose from 'mongoose';
// These imports are needed for mongoose model registration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { User, FoodEntry, ChatMessage, NutritionGoal } from './models';

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI must be set. Did you forget to set up your MongoDB connection?",
  );
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export { connectDB };