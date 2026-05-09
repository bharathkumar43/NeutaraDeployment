import api from './api';
import { ApiResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', { email, password });
    return res.data.data;
  },

  async azureLogin(idToken: string): Promise<{ token: string; user: User }> {
    const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/azure', { idToken });
    return res.data.data;
  },

  async exchangeAzureCode(code: string, redirectUri: string): Promise<{ token: string; user: User }> {
    const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/azure-exchange', { code, redirectUri });
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

  async createUser(data: { name: string; email: string; role: string; team?: string; password?: string }): Promise<User> {
    const res = await api.post<ApiResponse<User>>('/auth/users', data);
    return res.data.data;
  },

  async updateUser(id: string, data: { role?: string; team?: string; is_active?: boolean }): Promise<User> {
    const res = await api.patch<ApiResponse<User>>(`/auth/users/${id}`, data);
    return res.data.data;
  },
};
