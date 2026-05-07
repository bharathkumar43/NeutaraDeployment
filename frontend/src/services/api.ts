import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('neutara_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let redirectingToLogin = false;

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message: string }>) => {
    if (error.response?.status === 401) {
      if (!redirectingToLogin) {
        redirectingToLogin = true;
        // Clear all auth state including the Zustand persisted store
        localStorage.removeItem('neutara_token');
        localStorage.removeItem('neutara_user');
        localStorage.removeItem('neutara_auth');
        window.location.href = '/login';
      }
    } else if (error.response?.status !== 404) {
      const msg = error.response?.data?.message || 'Something went wrong';
      toast.error(msg);
    }
    return Promise.reject(error);
  }
);

export default api;
