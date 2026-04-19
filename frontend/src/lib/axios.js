/**
 * lib/axios.js — Pre-configured Axios instance
 *
 * Reads VITE_BACKEND_URL from environment.
 * Sends cookies automatically (withCredentials: true).
 */
import axios from 'axios';

const api = axios.create({
  baseURL:         import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
