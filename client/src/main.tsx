import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global styles for font families
const style = document.createElement('style');
style.textContent = `
  :root {
    --font-heading: 'Montserrat', sans-serif;
    --font-body: 'Open Sans', sans-serif;
    --font-mono: 'Roboto Mono', monospace;
  }
  
  body {
    font-family: var(--font-body);
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
  }
  
  .font-mono {
    font-family: var(--font-mono);
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .chat-bubble-ai {
    position: relative;
    border-radius: 1rem 1rem 1rem 0;
  }
  
  .chat-bubble-user {
    position: relative;
    border-radius: 1rem 1rem 0 1rem;
  }
`;

document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(<App />);
