import api from './api';
import { ApiResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', { email, password });
    return res.data.data;
  },

  async getProfile(): Promise<User> {
    const res = await api.get<ApiResponse<User>>('/auth/profile');
    return res.data.data;
  },

  async getUsers(role?: string): Promise<User[]> {
    const params = role ? `?role=${role}` : '';
    const res = await api.get<ApiResponse<User[]>>(`/auth/users${params}`);
    return res.data.data;
  },

  async createUser(data: { name: string; email: string; password: string; role: string; team?: string }): Promise<User> {
    const res = await api.post<ApiResponse<User>>('/auth/users', data);
    return res.data.data;
  },
};
