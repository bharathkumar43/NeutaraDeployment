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

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('neutara_token');
      localStorage.removeItem('neutara_user');
      window.location.href = '/login';
    } else if (error.response?.status !== 404) {
      const msg = error.response?.data?.message || 'Something went wrong';
      toast.error(msg);
    }
    return Promise.reject(error);
  }
);

export default api;
