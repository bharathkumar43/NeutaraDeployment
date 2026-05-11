import api from './api';
import { ApiResponse, UserStat, AdminAuditEntry, PaginationMeta } from '../types';

export interface AuditFilters {
  action?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const adminService = {
  async getUserStats(): Promise<UserStat[]> {
    const res = await api.get<ApiResponse<UserStat[]>>('/admin/user-stats');
    return res.data.data;
  },

  async getAuditLogs(filters: AuditFilters = {}): Promise<{ data: AdminAuditEntry[]; pagination: PaginationMeta }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get<ApiResponse<AdminAuditEntry[]>>(`/admin/audit-logs?${params}`);
    return { data: res.data.data, pagination: res.data.pagination! };
  },
};
