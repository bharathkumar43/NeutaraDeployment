import api from './api';
import {
  ApiResponse, DeploymentRequest, DashboardStats,
  Job, Branch, PaginationMeta
} from '../types';

export interface DeploymentFilters {
  status?: string;
  environment?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
  from_date?: string;
  to_date?: string;
}

export interface DeploymentListResponse {
  data: DeploymentRequest[];
  pagination: PaginationMeta;
}

export const deploymentService = {
  async getAll(filters: DeploymentFilters = {}): Promise<DeploymentListResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get<ApiResponse<DeploymentRequest[]>>(`/deployments?${params}`);
    return { data: res.data.data, pagination: res.data.pagination! };
  },

  async getById(id: string): Promise<DeploymentRequest> {
    const res = await api.get<ApiResponse<DeploymentRequest>>(`/deployments/${id}`);
    return res.data.data;
  },

  async create(data: Partial<DeploymentRequest>): Promise<DeploymentRequest> {
    const res = await api.post<ApiResponse<DeploymentRequest>>('/deployments', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<DeploymentRequest>): Promise<DeploymentRequest> {
    const res = await api.put<ApiResponse<DeploymentRequest>>(`/deployments/${id}`, data);
    return res.data.data;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await api.get<ApiResponse<DashboardStats>>('/deployments/stats/dashboard');
    return res.data.data;
  },

  async getJobs(): Promise<Job[]> {
    const res = await api.get<ApiResponse<Job[]>>('/deployments/meta/jobs');
    return res.data.data;
  },

  async getBranches(): Promise<Branch[]> {
    const res = await api.get<ApiResponse<Branch[]>>('/deployments/meta/branches');
    return res.data.data;
  },

  async getNextNumber(): Promise<string> {
    const res = await api.get<ApiResponse<{ next_number: string }>>('/deployments/meta/next-number');
    return res.data.data.next_number;
  },

  async sendScopeEmail(deployment_title: string, team: string): Promise<void> {
    await api.post('/deployments/send-scope-email', { deployment_title, team });
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/deployments/${id}`);
  },
};

export const qaService = {
  async getPending(filters: DeploymentFilters = {}): Promise<DeploymentListResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
    const res = await api.get<ApiResponse<DeploymentRequest[]>>(`/qa/pending?${params}`);
    return { data: res.data.data, pagination: res.data.pagination! };
  },

  async approve(id: string, data: {
    approval_status: 'approved' | 'rejected' | 'sent_back';
    qa_ticket_link?: string;
    qa_description?: string;
    qa_comments: string;
  }): Promise<void> {
    await api.post(`/qa/deployments/${id}/approve`, data);
  },
};

export const infraService = {
  async getQueue(filters: DeploymentFilters = {}): Promise<DeploymentListResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
    const res = await api.get<ApiResponse<DeploymentRequest[]>>(`/infra/queue?${params}`);
    return { data: res.data.data, pagination: res.data.pagination! };
  },

  async startDeployment(id: string, notes: string, artifactVersion: string): Promise<void> {
    await api.post(`/infra/deployments/${id}/start`, { deployment_notes: notes, artifact_version: artifactVersion });
  },

  async completeDeployment(id: string, formData: FormData): Promise<void> {
    await api.post(`/infra/deployments/${id}/complete`, formData);
  },

  async reviewDeployment(id: string, action: 'sent_back' | 'rejected', comments: string): Promise<void> {
    await api.post(`/infra/deployments/${id}/review`, { action, comments });
  },
};

export const acknowledgmentService = {
  async getPending(): Promise<DeploymentRequest[]> {
    const res = await api.get<ApiResponse<DeploymentRequest[]>>('/acknowledgments/pending');
    return res.data.data;
  },

  async submit(id: string, data: { acknowledgment_comment: string; status: 'acknowledged' | 'issue_raised' }): Promise<void> {
    await api.post(`/acknowledgments/deployments/${id}/acknowledge`, data);
  },
};

export const notificationService = {
  async getAll() {
    const res = await api.get('/notifications');
    return res.data.data;
  },
  async getUnreadCount(): Promise<number> {
    const res = await api.get('/notifications/unread-count');
    return res.data.data.count;
  },
  async markRead(id: string): Promise<void> {
    await api.put(`/notifications/${id}/read`);
  },
  async markAllRead(): Promise<void> {
    await api.put('/notifications/mark-all-read');
  },
};
