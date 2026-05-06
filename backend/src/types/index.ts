export type UserRole = 'dev' | 'qa' | 'infra' | 'admin' | 'viewer';

export type DeploymentStatus =
  | 'draft'
  | 'pending_qa_approval'
  | 'qa_approved'
  | 'rejected_by_qa'
  | 'pending_infra_deployment'
  | 'deployment_in_progress'
  | 'deployment_completed'
  | 'deployment_failed'
  | 'pending_dev_acknowledgment'
  | 'successfully_completed'
  | 'issue_raised';

export type Environment = 'DEV' | 'QA' | 'UAT' | 'PROD';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type QAApprovalStatus = 'approved' | 'rejected' | 'sent_back';
export type InfraDeploymentStatus = 'success' | 'failed' | 'in_progress';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: Date;
}

export interface DeploymentRequest {
  id: string;
  deployment_title: string;
  project_name: string;
  job_id: string;
  branch_name: string;
  environment: Environment;
  ticket_link?: string;
  description: string;
  priority: Priority;
  raised_by: string;
  raised_by_user?: User;
  status: DeploymentStatus;
  created_at: Date;
  updated_at: Date;
}

export interface DeploymentQAApproval {
  id: string;
  deployment_id: string;
  qa_user_id: string;
  qa_user?: User;
  qa_ticket_link?: string;
  qa_description?: string;
  qa_comments: string;
  approval_status: QAApprovalStatus;
  approved_at: Date;
}

export interface DeploymentInfraLog {
  id: string;
  deployment_id: string;
  infra_user_id: string;
  infra_user?: User;
  deployment_notes: string;
  screenshot_path?: string;
  screenshot_original_name?: string;
  deployment_status: InfraDeploymentStatus;
  completion_comments?: string;
  completed_at?: Date;
  created_at: Date;
}

export interface DeploymentAcknowledgment {
  id: string;
  deployment_id: string;
  acknowledged_by: string;
  acknowledged_by_user?: User;
  acknowledgment_comment: string;
  status: 'acknowledged' | 'issue_raised';
  acknowledged_at: Date;
}

export interface AuditLog {
  id: string;
  deployment_id: string;
  action: string;
  performed_by: string;
  performed_by_user?: User;
  old_status?: string;
  new_status?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
