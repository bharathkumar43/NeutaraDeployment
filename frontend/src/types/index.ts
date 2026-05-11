export type UserRole = 'dev' | 'qa' | 'infra' | 'admin' | 'viewer';
export type DeploymentStatus =
  | 'draft' | 'pending_qa_approval' | 'qa_approved' | 'rejected_by_qa'
  | 'pending_infra_deployment' | 'deployment_in_progress' | 'deployment_completed'
  | 'deployment_failed' | 'pending_dev_acknowledgment' | 'successfully_completed' | 'issue_raised';
export type Environment = 'DEV' | 'QA' | 'UAT' | 'PROD';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team?: string;
  avatar_url?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface DeploymentRequest {
  id: string;
  request_number?: string;
  deployment_title: string;
  project_name: string;
  job_id?: string;
  branch_name: string;
  environment: Environment;
  ticket_link?: string;
  description: string;
  priority: Priority;
  raised_by: string;
  raised_by_name?: string;
  raised_by_email?: string;
  raised_by_team?: string;
  status: DeploymentStatus;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  qa_approvals?: QAApproval[];
  infra_logs?: InfraLog[];
  acknowledgments?: Acknowledgment[];
  audit_trail?: AuditLog[];
}

export interface QAApproval {
  id: string;
  deployment_id: string;
  qa_user_id: string;
  qa_user_name?: string;
  qa_ticket_link?: string;
  qa_description?: string;
  qa_comments: string;
  approval_status: 'approved' | 'rejected' | 'sent_back';
  approved_at: string;
}

export interface InfraLog {
  id: string;
  deployment_id: string;
  infra_user_id: string;
  infra_user_name?: string;
  deployment_notes: string;
  screenshot_path?: string;
  screenshot_original_name?: string;
  deployment_status: 'in_progress' | 'success' | 'failed';
  completion_comments?: string;
  started_at?: string;
  completed_at?: string;
}

export interface Acknowledgment {
  id: string;
  deployment_id: string;
  acknowledged_by: string;
  acknowledged_by_name?: string;
  acknowledgment_comment: string;
  status: 'acknowledged' | 'issue_raised';
  acknowledged_at: string;
}

export interface AuditLog {
  id: string;
  deployment_id: string;
  action: string;
  performed_by: string;
  performed_by_name?: string;
  performed_by_role?: string;
  old_status?: string;
  new_status?: string;
  comment?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  deployment_id?: string;
  deployment_title?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total: string;
  pending_qa: string;
  pending_infra: string;
  failed: string;
  completed: string;
  critical: string;
  pending_acknowledgment: string;
  drafts: string;
}

export interface Job {
  id: string;
  job_id: string;
  job_name: string;
  project_name?: string;
}

export interface Branch {
  id: string;
  branch_name: string;
  project_name?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}
