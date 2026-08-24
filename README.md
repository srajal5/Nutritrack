# NutriTrackAI

NutriTrackAI is a modern, AI-powered food and fitness tracking application. It features intelligent food logging, a personalized AI fitness coach, and deep statistical analysis of your nutritional habits.

## Key Features

- **AI-Powered Food Analysis**: Log meals using natural language. The system automatically extracts nutritional information, calculating calories and macronutrients.
- **AI Fitness Coach**: A personalized conversational agent that offers tailored workout advice, nutritional guidance, and motivation.
- **Dashboard & Progress Tracking**: Real-time statistics visualization with responsive charts showcasing your dietary progress over time.
- **Modern UI**: A polished, unified user interface utilizing Tailwind CSS, interactive charts via Recharts, and a dynamic theming system.
- **Open-Source AI Integration**: Powered by OpenRouter using high-performance, free-tier models (such as `google/gemini-2.0-flash-lite-preview-02-05:free`).

## Tech Stack

- **Frontend**: React (Vite SPA), Wouter (Routing), Tailwind CSS, Framer Motion, Recharts, React Query, shadcn/ui.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB Atlas with Mongoose.
- **AI Services**: OpenRouter API.

## Getting Started

### Prerequisites

- Node.js (v20 or newer)
- A MongoDB Atlas instance (or local MongoDB)
- An OpenRouter API Key for the AI functionalities

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   OPENROUTER_API_KEY=your_openrouter_api_key
   SESSION_SECRET=your_secure_session_secret
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   The application will start in a unified development mode. Both the Express backend and the Vite frontend (served via middleware) will run on a single port, accessible at `http://localhost:3001`.

## Recent Architectural Updates

- **Unified Server Architecture**: Consolidated the development environment to run the Vite frontend and Express backend on a single port (3001) using Vite middleware, eliminating CORS and proxy connection issues.
- **Unified Navigation**: Transitioned from fragmented, legacy component-level back buttons to a sticky, globally available `Navbar` for authenticated users.
- **OpenRouter Migration**: Shifted away from legacy/paid OpenAI endpoints to the OpenRouter gateway, making the project cost-effective to run and deploy.
- **Codebase Cleanup**: Removed experimental test files (`ThemeTest`, `BackButtonTest`) and obsolete development components to maintain a tight, production-ready codebase.

## License

This project is licensed under the MIT License.
