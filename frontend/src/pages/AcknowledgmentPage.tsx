import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  CheckBadgeIcon, ExclamationTriangleIcon, EyeIcon,
  PhotoIcon, ArrowPathIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { acknowledgmentService } from '../services/deployment.service';
import { DeploymentRequest } from '../types';
import { EnvBadge, PriorityBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { PageLoader, ButtonSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { formatDateTime, formatRelative } from '../utils/format';

interface AckFormData {
  acknowledgment_comment: string;
  status: 'acknowledged' | 'issue_raised';
}

export const AcknowledgmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [pending, setPending] = useState<DeploymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDep, setSelectedDep] = useState<DeploymentRequest | null>(null);
  const [actionType, setActionType] = useState<'acknowledged' | 'issue_raised' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<AckFormData>();

  const load = useCallback(async () => {
    setLoading(true);
    try { setPending(await acknowledgmentService.getPending()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (dep: DeploymentRequest, type: 'acknowledged' | 'issue_raised') => {
    setSelectedDep(dep);
    setActionType(type);
    reset();
    setValue('status', type);
  };
  const closeModal = () => { setSelectedDep(null); setActionType(null); reset(); };

  const onSubmit = handleSubmit(async (data) => {
    if (!selectedDep) return;
    setSubmitting(true);
    try {
      await acknowledgmentService.submit(selectedDep.id, data);
      if (data.status === 'acknowledged') toast.success('🎉 Deployment acknowledged! Marked as Successfully Completed.');
      else toast.error('⚠️ Issue raised. Infra team has been notified.');
      closeModal();
      load();
    } finally { setSubmitting(false); }
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 px-4 py-2 rounded-lg">
          <ClockIcon className="w-5 h-5 text-orange-600" />
          <span className="text-sm font-medium text-orange-800">{loading ? '...' : pending.length} deployments awaiting your acknowledgment</span>
        </div>
        <button onClick={load} className="btn-secondary px-3">
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : pending.length === 0 ? (
        <EmptyState
          title="No pending acknowledgments"
          description="All your deployed requests have been acknowledged. Great work!"
          icon={<CheckBadgeIcon className="w-8 h-8 text-green-400" />}
        />
      ) : (
        <div className="space-y-4">
          {pending.map((dep) => {
            const infraLog = (dep as any).screenshot_path !== undefined ? dep : null;
            return (
              <div key={dep.id} className="card border-l-4 border-orange-400 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5">{dep.deployment_title}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <EnvBadge env={dep.environment} />
                        <PriorityBadge priority={dep.priority} />
                      </div>
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-700 font-medium px-3 py-1 rounded-full border border-orange-200 whitespace-nowrap">
                      Awaiting Your Ack.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-xs">
                    <div>
                      <p className="text-gray-400 uppercase font-medium mb-1">Project</p>
                      <p className="text-gray-700">{dep.project_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase font-medium mb-1">Branch</p>
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{dep.branch_name}</code>
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase font-medium mb-1">Deployed By</p>
                      <p className="text-gray-700">{(dep as any).infra_user_name || 'Infra Team'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase font-medium mb-1">Deployed At</p>
                      <p className="text-gray-700">{(dep as any).deployed_at ? formatRelative((dep as any).deployed_at) : 'Recently'}</p>
                    </div>
                  </div>

                  {/* Infra Comments */}
                  {(dep as any).infra_comments && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-xs font-medium text-green-700 mb-1">Infra Team Notes</p>
                      <p className="text-sm text-green-800">{(dep as any).infra_comments}</p>
                    </div>
                  )}

                  {/* Screenshot thumbnail */}
                  {(dep as any).screenshot_path && (
                    <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <PhotoIcon className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-700">Deployment Screenshot Uploaded</p>
                        <p className="text-xs text-gray-400">Click View Details to see the screenshot</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button onClick={() => navigate(`/deployments/${dep.id}`)} className="btn-secondary text-sm py-1.5">
                      <EyeIcon className="w-4 h-4" /> View Details
                    </button>
                    <div className="flex gap-3">
                      <button onClick={() => openModal(dep, 'issue_raised')} className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors">
                        <ExclamationTriangleIcon className="w-4 h-4" /> Raise Issue
                      </button>
                      <button onClick={() => openModal(dep, 'acknowledged')} className="btn-success text-sm py-1.5">
                        <CheckBadgeIcon className="w-4 h-4" /> Acknowledge
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Acknowledge Modal */}
      {selectedDep && actionType && (
        <Modal
          isOpen
          onClose={closeModal}
          title={actionType === 'acknowledged' ? 'Acknowledge Deployment' : 'Raise an Issue'}
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button
                onClick={onSubmit}
                className={actionType === 'acknowledged' ? 'btn-success' : 'btn-danger'}
                disabled={submitting}
              >
                {submitting ? <ButtonSpinner /> : actionType === 'acknowledged' ? <CheckBadgeIcon className="w-4 h-4" /> : <ExclamationTriangleIcon className="w-4 h-4" />}
                {actionType === 'acknowledged' ? 'Confirm Acknowledgment' : 'Submit Issue'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Deployment summary */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="font-semibold text-gray-900 text-sm mb-1">{selectedDep.deployment_title}</p>
              <div className="flex gap-2 flex-wrap">
                <EnvBadge env={selectedDep.environment} />
                <PriorityBadge priority={selectedDep.priority} />
              </div>
              <p className="text-xs text-gray-500 mt-2">{selectedDep.project_name} · <code className="bg-gray-200 px-1 rounded">{selectedDep.branch_name}</code></p>
            </div>

            {actionType === 'acknowledged' ? (
              <div className="flex gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckBadgeIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Confirming Successful Deployment</p>
                  <p className="text-xs text-green-700 mt-1">By acknowledging, you confirm that the deployment was successful and all services are running as expected. This will mark the deployment as "Successfully Completed".</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Raising a Deployment Issue</p>
                  <p className="text-xs text-red-700 mt-1">The Infra team will be notified immediately and the deployment will be flagged as "Issue Raised" for investigation.</p>
                </div>
              </div>
            )}

            <div>
              <label className="form-label">
                {actionType === 'acknowledged' ? 'Acknowledgment Comment' : 'Issue Description'} <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('acknowledgment_comment', {
                  required: 'This field is required',
                  minLength: { value: 10, message: 'Minimum 10 characters' },
                })}
                className="form-textarea"
                rows={4}
                placeholder={actionType === 'acknowledged'
                  ? 'Confirmed all services are operational, tested key user flows...'
                  : 'Describe the issue in detail — what is failing, error messages, expected vs actual behavior...'}
              />
              {errors.acknowledgment_comment && <p className="form-error">{errors.acknowledgment_comment.message}</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
