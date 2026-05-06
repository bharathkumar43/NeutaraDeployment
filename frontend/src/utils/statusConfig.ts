import { DeploymentStatus, Priority, Environment } from '../types';

export const STATUS_CONFIG: Record<DeploymentStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft:                      { label: 'Draft',                      color: 'text-gray-600',   bg: 'bg-gray-100',   dot: 'bg-gray-400' },
  pending_qa_approval:        { label: 'Pending QA Approval',        color: 'text-yellow-700', bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
  qa_approved:                { label: 'QA Approved',                color: 'text-blue-700',   bg: 'bg-blue-100',   dot: 'bg-blue-500' },
  rejected_by_qa:             { label: 'Rejected by QA',             color: 'text-red-700',    bg: 'bg-red-100',    dot: 'bg-red-500' },
  pending_infra_deployment:   { label: 'Pending Infra Deployment',   color: 'text-purple-700', bg: 'bg-purple-100', dot: 'bg-purple-500' },
  deployment_in_progress:     { label: 'Deployment In Progress',     color: 'text-indigo-700', bg: 'bg-indigo-100', dot: 'bg-indigo-500' },
  deployment_completed:       { label: 'Deployment Completed',       color: 'text-teal-700',   bg: 'bg-teal-100',   dot: 'bg-teal-500' },
  deployment_failed:          { label: 'Deployment Failed',          color: 'text-red-700',    bg: 'bg-red-100',    dot: 'bg-red-500' },
  pending_dev_acknowledgment: { label: 'Pending Acknowledgment',     color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  successfully_completed:     { label: 'Successfully Completed',     color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500' },
  issue_raised:               { label: 'Issue Raised',               color: 'text-red-700',    bg: 'bg-red-100',    dot: 'bg-red-500' },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: 'text-gray-600',  bg: 'bg-gray-100' },
  medium:   { label: 'Medium',   color: 'text-blue-700',  bg: 'bg-blue-100' },
  high:     { label: 'High',     color: 'text-orange-700',bg: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-red-700',   bg: 'bg-red-100' },
};

export const ENV_CONFIG: Record<Environment, { label: string; color: string; bg: string }> = {
  DEV:  { label: 'DEV',  color: 'text-gray-600',  bg: 'bg-gray-100' },
  QA:   { label: 'QA',   color: 'text-blue-700',  bg: 'bg-blue-100' },
  UAT:  { label: 'UAT',  color: 'text-purple-700',bg: 'bg-purple-100' },
  PROD: { label: 'PROD', color: 'text-red-700',   bg: 'bg-red-100' },
};

export const WORKFLOW_STEPS = [
  { key: 'draft',                      label: 'Draft Created',         step: 1 },
  { key: 'pending_qa_approval',        label: 'Submitted for QA',      step: 2 },
  { key: 'pending_infra_deployment',   label: 'QA Approved',           step: 3 },
  { key: 'deployment_in_progress',     label: 'Deployment Started',    step: 4 },
  { key: 'pending_dev_acknowledgment', label: 'Deployed — Awaiting Ack',step: 5 },
  { key: 'successfully_completed',     label: 'Completed',             step: 6 },
];

export const getWorkflowStep = (status: DeploymentStatus): number => {
  const found = WORKFLOW_STEPS.find((s) => s.key === status);
  if (found) return found.step;
  if (['rejected_by_qa', 'deployment_failed', 'issue_raised'].includes(status)) return -1;
  return 0;
};
