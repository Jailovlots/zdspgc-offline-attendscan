// Use VITE_API_URL from .env if set, otherwise fall back to the Render production backend.
// This ensures the app always connects to a working backend whether running locally or deployed.
export const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://attendwise-offline.onrender.com';
