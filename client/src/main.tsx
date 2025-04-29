import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add CSS Variables for coffee theme colors
document.documentElement.style.setProperty('--coffee-primary', '#6F4E37');
document.documentElement.style.setProperty('--coffee-secondary', '#A67C52');
document.documentElement.style.setProperty('--coffee-accent', '#D4A76A');
document.documentElement.style.setProperty('--coffee-light', '#F9F3EE');
document.documentElement.style.setProperty('--coffee-dark', '#3C2A1E');

// Function to update page title based on store name from API
async function setTitleFromSettings() {
  try {
    const response = await fetch('/api/settings/value/store_name');
    if (response.ok) {
      const data = await response.json();
      if (data && data.value) {
        document.title = `${data.value} POS`;
        console.log('Updated page title to:', `${data.value} POS`);
      }
    }
  } catch (error) {
    console.error('Failed to fetch store name for title:', error);
  }
}

// Set title when the app starts
setTitleFromSettings();

createRoot(document.getElementById("root")!).render(<App />);
