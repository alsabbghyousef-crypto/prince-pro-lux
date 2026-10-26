import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/backend/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor for Auth Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('prince_token') || localStorage.getItem('Prince Pro Lux_token') || localStorage.getItem('newpower_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for handling 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('prince_token');
      localStorage.removeItem('Prince Pro Lux_token');
      localStorage.removeItem('newpower_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authService = {
  login: (credentials: any) => api.post('/login', credentials),
  logout: () => api.post('/logout'),
  getUser: () => api.get('/user'),
  };

export const posService = {
  getCategories: () => api.get('/categories'),
  getProducts: () => api.get('/products'),
  createOrder: (data: any) => api.post('/orders', data),
  getInventory: () => api.get('/inventory'),
  createExpense: (data: any) => api.post('/expenses', data),
};
