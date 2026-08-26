export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'
export const API_MODE: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock'
