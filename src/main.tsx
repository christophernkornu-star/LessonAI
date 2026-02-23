import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Handle chunk load errors (e.g., after a new deployment)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error, reloading page...', event);
  window.location.reload();
});

// Handle dynamic import errors globally
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason &&
    event.reason.message &&
    (event.reason.message.includes('Failed to fetch dynamically imported module') ||
     event.reason.message.includes('Importing a module script failed'))
  ) {
    console.warn('Dynamic import failed, reloading page...', event.reason);
    event.preventDefault();
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
