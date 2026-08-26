import 'dotenv/config';
import mongoose from 'mongoose';

// The missing-config check belongs inside connectDB, NOT at module scope.
// Throwing while the module is being imported takes down a serverless runtime
// before any request handler exists, so the platform can only report an opaque
// FUNCTION_INVOCATION_FAILED. Failing inside the function lets the error be
// caught and reported as a readable message instead.
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your environment variables (and redeploy, since variables are applied at deploy time).",
    );
  }

  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error; // Don't exit process in serverless
  }
};

export { connectDB };