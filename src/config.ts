// Set VITE_API_URL in your .env.local (dev) or .env.production (prod)
// e.g. VITE_API_URL=https://your-api.railway.app/graphql
export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/graphql'
