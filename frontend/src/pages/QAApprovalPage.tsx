import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon, XCircleIcon, ArrowUturnLeftIcon,
  ClockIcon, EyeIcon, FunnelIcon, ArrowPathIcon,
  ExclamationTriangleIcon, LinkIcon,
} from '@heroicons/react/24/outline';
import { qaService } from '../services/deployment.service';
import { DeploymentRequest } from '../types';
import { StatusBadge, PriorityBadge, EnvBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { PageLoader, ButtonSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { formatDateTime, formatRelative } from '../utils/format';

interface QAFormData {
  qa_ticket_link: string;
  qa_description: string;
  qa_comments: string;
}

type ActionType = 'approved' | 'rejected' | 'sent_back';

export const QAApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const [deployments, setDeployments] = useState<DeploymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDep, setSelectedDep] = useState<DeploymentRequest | null>(null);
  const [action, setAction] = useState<ActionType | null>(null);
  const [envFilter, setEnvFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<QAFormData>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await qaService.getPending({ environment: envFilter, priority: priorityFilter });
      setDeployments(result.data);
    } finally { setLoading(false); }
  }, [envFilter, priorityFilter]);

  useEffect(() => { load(); }, [load]);

  const openModal = (dep: DeploymentRequest, actionType: ActionType) => {
    setSelectedDep(dep);
    setAction(actionType);
    reset();
  };

  const closeModal = () => { setSelectedDep(null); setAction(null); reset(); };

  const onSubmit = handleSubmit(async (data) => {
    if (!selectedDep || !action) return;
    setSubmitting(true);
    try {
      await qaService.approve(selectedDep.id, { approval_status: action, ...data });
      const msgs: Record<ActionType, string> = {
        approved: '✅ Deployment approved and forwarded to Infra team!',
        rejected: '❌ Deployment rejected and Dev team notified.',
        sent_back: '↩️ Deployment sent back to Dev team for revision.',
      };
      toast.success(msgs[action]);
      closeModal();
      load();
    } finally { setSubmitting(false); }
  });

  const getProjectServerUrl = (dep: DeploymentRequest): string => {
    const meta = (dep as any).extra_meta
      ? (typeof (dep as any).extra_meta === 'string'
          ? JSON.parse((dep as any).extra_meta)
          : (dep as any).extra_meta)
      : {};
    return meta.deployment_scope === 'multiple'
      ? meta.multi_project_names || ''
      : meta.single_project_name || '';
  };

  const ACTION_CONFIG: Record<ActionType, { title: string; btnClass: string; icon: React.ReactNode; placeholder: string }> = {
    approved: { title: 'Approve Deployment', btnClass: 'btn-success', icon: <CheckCircleIcon className="w-4 h-4" />, placeholder: 'Add approval notes, testing done, sign-off comments...' },
    rejected: { title: 'Reject Deployment', btnClass: 'btn-danger', icon: <XCircleIcon className="w-4 h-4" />, placeholder: 'Explain the reason for rejection clearly...' },
    sent_back: { title: 'Send Back to Dev', btnClass: 'bg-orange-500 text-white hover:bg-orange-600 btn-primary', icon: <ArrowUturnLeftIcon className="w-4 h-4" />, placeholder: 'Describe what needs to be fixed or changed...' },
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-lg">
            <ClockIcon className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">{loading ? '...' : deployments.length} pending review</span>
          </div>
          <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className="form-select w-32">
            <option value="">All Envs</option>
            {['DEV', 'QA', 'UAT', 'PROD'].map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="form-select w-36">
            <option value="">All Priorities</option>
            {['critical', 'high', 'medium', 'low'].map((p) => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <button onClick={load} className="btn-secondary px-3">
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Deployment Cards */}
      {loading ? (
        <PageLoader />
      ) : deployments.length === 0 ? (
        <EmptyState
          title="No pending QA reviews"
          description="All deployment requests have been reviewed. Check back later."
          icon={<CheckCircleIcon className="w-8 h-8 text-green-400" />}
        />
      ) : (
        <div className="space-y-4">
          {deployments.map((dep) => (
            <div key={dep.id} className={`card overflow-hidden ${dep.priority === 'critical' ? 'border-l-4 border-red-500' : dep.priority === 'high' ? 'border-l-4 border-orange-400' : ''}`}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{dep.deployment_title}</h3>
                      <PriorityBadge priority={dep.priority} />
                      <EnvBadge env={dep.environment} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-medium">Project</p>
                        <p className="text-sm text-gray-700 mt-0.5">{dep.project_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-medium">Branch</p>
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 mt-0.5 block w-fit">{dep.branch_name}</code>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-medium">Raised By</p>
                        <p className="text-sm text-gray-700 mt-0.5">{dep.raised_by_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-medium">Submitted</p>
                        <p className="text-sm text-gray-600 mt-0.5">{dep.submitted_at ? formatRelative(dep.submitted_at) : '—'}</p>
                      </div>
                    </div>
                    {getProjectServerUrl(dep) && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-blue-500 uppercase font-medium mb-0.5">Project Name / Server URL</p>
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">{getProjectServerUrl(dep)}</p>
                      </div>
                    )}

                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                      <p className="text-sm text-gray-700 line-clamp-2">{dep.description}</p>
                    </div>

                    {dep.ticket_link && (
                      <a href={dep.ticket_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2">
                        <LinkIcon className="w-3.5 h-3.5" /> View Ticket
                      </a>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/deployments/${dep.id}`)}
                    className="btn-secondary text-sm py-1.5"
                  >
                    <EyeIcon className="w-4 h-4" /> View Details
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => openModal(dep, 'sent_back')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors">
                      <ArrowUturnLeftIcon className="w-4 h-4" /> Send Back
                    </button>
                    <button onClick={() => openModal(dep, 'rejected')} className="btn-danger text-sm py-1.5">
                      <XCircleIcon className="w-4 h-4" /> Reject
                    </button>
                    <button onClick={() => openModal(dep, 'approved')} className="btn-success text-sm py-1.5">
                      <CheckCircleIcon className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {selectedDep && action && (
        <Modal
          isOpen={!!selectedDep}
          onClose={closeModal}
          title={ACTION_CONFIG[action].title}
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={onSubmit} className={ACTION_CONFIG[action].btnClass} disabled={submitting}>
                {submitting ? <ButtonSpinner /> : ACTION_CONFIG[action].icon}
                Confirm {action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Deployment summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-1">{selectedDep.deployment_title}</p>
              <div className="flex gap-2 flex-wrap">
                <EnvBadge env={selectedDep.environment} />
                <PriorityBadge priority={selectedDep.priority} />
              </div>
              <p className="text-xs text-gray-500 mt-2">{selectedDep.project_name} · Branch: <code className="bg-gray-200 px-1 rounded">{selectedDep.branch_name}</code></p>
              {getProjectServerUrl(selectedDep) && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-400 uppercase font-medium">Project Name / Server URL</p>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{getProjectServerUrl(selectedDep)}</p>
                </div>
              )}
            </div>

            {/* Warning for critical */}
            {action === 'approved' && selectedDep.priority === 'critical' && (
              <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">This is a <strong>CRITICAL</strong> priority deployment. Please ensure thorough review before approving.</p>
              </div>
            )}

            <div>
              <label className="form-label">QA Ticket Link</label>
              <input {...register('qa_ticket_link')} className="form-input" placeholder="https://jira.company.com/QA-456" />
            </div>
            <div>
              <label className="form-label">QA Review Notes</label>
              <input {...register('qa_description')} className="form-input" placeholder="Brief description of QA testing done..." />
            </div>
            <div>
              <label className="form-label">
                Comments <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('qa_comments', { required: 'Comments are required' })}
                className="form-textarea"
                rows={4}
                placeholder={ACTION_CONFIG[action].placeholder}
              />
              {errors.qa_comments && <p className="form-error">{errors.qa_comments.message}</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
