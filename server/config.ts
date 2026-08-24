/**
 * Server Configuration
 * Centralizes all environment variables and default values
 */

import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Security
  appUrl: process.env.APP_URL || 'http://localhost:3001',
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : [
        'http://localhost:5173', 
        'http://127.0.0.1:5173', 
        'http://localhost:3000', 
        'http://127.0.0.1:3000', 
        'http://localhost:3001',
        'http://127.0.0.1:3001'
      ],

  // AI Configuration
  ai: {
    model: process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free",
    fallbackModel: process.env.OPENROUTER_FALLBACK_MODEL || "google/gemma-3-4b-it:free",
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    referer: process.env.OPENROUTER_REFERER || "http://localhost:3001",
    title: process.env.OPENROUTER_TITLE || "NutriTrackAI",
  },

  // Default Nutrition Goals
  defaults: {
    nutrition: {
      calorieGoal: parseInt(process.env.DEFAULT_CALORIE_GOAL || '2000', 10),
      proteinGoal: parseInt(process.env.DEFAULT_PROTEIN_GOAL || '150', 10),
      carbGoal: parseInt(process.env.DEFAULT_CARB_GOAL || '250', 10),
      fatGoal: parseInt(process.env.DEFAULT_FAT_GOAL || '65', 10),
      fiberGoal: parseInt(process.env.DEFAULT_FIBER_GOAL || '30', 10),
      sugarGoal: parseInt(process.env.DEFAULT_SUGAR_GOAL || '50', 10),
    }
  },

  // Database
  databaseUrl: process.env.DATABASE_URL,
};

export default config;
