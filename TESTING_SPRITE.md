# Testsprite Testing Guide

This guide explains how to use Testsprite for visual testing of the FoodFitnessTracker frontend.

## Prerequisites

1. Testsprite browser extension installed (Chrome/Edge/Firefox)
2. The application running in development mode

## Running the Application for Testing

To run the application in development mode for Testsprite testing:

```bash
npm run dev:full
```

This command starts both the frontend and backend servers:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Using Testsprite

1. Navigate to http://localhost:5173 in your browser
2. Open the Testsprite extension
3. Create a new test project or open an existing one
4. Start capturing screenshots of different pages and components

## Key Pages to Test

1. **Home Page** - http://localhost:5173/
2. **Dashboard** - http://localhost:5173/dashboard
3. **Food Tracker** - http://localhost:5173/tracker
4. **Statistics** - http://localhost:5173/stats
5. **AI Coach** - http://localhost:5173/ai-chat
6. **Profile** - http://localhost:5173/profile

## Testing Dark/Light Mode

To test both themes:
1. Click the theme toggle button in the header
2. Capture screenshots in both light and dark modes
3. Compare visual differences between the two themes

## Testing Responsive Design

Resize your browser window to test different screen sizes:
- Desktop (1200px+)
- Tablet (768px-1199px)
- Mobile (767px and below)

## Tips for Effective Testing

1. **Consistent Viewport Size**: Keep the browser window size consistent when capturing screenshots for comparison
2. **Wait for Loading**: Allow pages to fully load before capturing screenshots
3. **Test Interactions**: Capture states before and after user interactions (hover, click, form input)
4. **Regular Intervals**: Run tests regularly to catch visual regressions early

## Troubleshooting

If Testsprite cannot access the application:
1. Ensure the development server is running (`npm run dev:full`)
2. Check that you can access http://localhost:5173 in your browser
3. Verify that no firewall is blocking the connection

If authentication is required:
1. The development server should automatically authenticate the test user
2. If prompted, use the default test credentials