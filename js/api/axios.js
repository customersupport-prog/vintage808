// js/api/axios.js
// Central axios instance for the Vintage 808 API.

import axios from 'https://cdn.jsdelivr.net/npm/axios@1.7.2/dist/esm/axios.min.js';

const api = axios.create({
  baseURL: 'https://vintage808-api-six.vercel.app//api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ───────────────────────────────────────
// Automatically attach the JWT token to every request if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('v808_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor ──────────────────────────────────────
// If the server returns 401 (expired / invalid token), clear storage
// and bounce the user back to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('v808_token');
      localStorage.removeItem('v808_user');
      window.location.href = './login.html';
    }
    return Promise.reject(error);
  }
);

export default api;