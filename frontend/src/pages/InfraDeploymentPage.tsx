import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ServerStackIcon, PlayIcon, CheckCircleIcon, XCircleIcon,
  PhotoIcon, EyeIcon, ArrowPathIcon, CloudArrowUpIcon, XMarkIcon,
  ArrowUturnLeftIcon, NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { infraService } from '../services/deployment.service';
import { DeploymentRequest } from '../types';
import { PriorityBadge, EnvBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { PageLoader, ButtonSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { formatRelative } from '../utils/format';

interface StartFormData { artifact_version: string; }
interface CompleteFormData {
  deployment_status: 'success' | 'failed';
  deployment_notes: string;
  completion_comments: string;
}
interface ReviewFormData { comments: string; }

export const InfraDeploymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<DeploymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [envFilter, setEnvFilter] = useState('');
  const [selectedDep, setSelectedDep] = useState<DeploymentRequest | null>(null);
  const [modalType, setModalType] = useState<'start' | 'complete' | 'review' | null>(null);
  const [reviewAction, setReviewAction] = useState<'sent_back' | 'rejected' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startForm = useForm<StartFormData>();
  const completeForm = useForm<CompleteFormData>({ defaultValues: { deployment_status: 'success' } });
  const reviewForm = useForm<ReviewFormData>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await infraService.getQueue({ environment: envFilter });
      setQueue(result.data);
    } finally { setLoading(false); }
  }, [envFilter]);

  useEffect(() => { load(); }, [load]);

  const openStart = (dep: DeploymentRequest) => {
    setSelectedDep(dep); setModalType('start'); startForm.reset();
  };
  const openComplete = (dep: DeploymentRequest) => {
    setSelectedDep(dep); setModalType('complete'); completeForm.reset({ deployment_status: 'success' });
    setPreviewUrl(null); setUploadFile(null);
  };
  const openReview = (dep: DeploymentRequest, action: 'sent_back' | 'rejected') => {
    setSelectedDep(dep); setReviewAction(action); setModalType('review'); reviewForm.reset();
  };
  const closeModal = () => { setSelectedDep(null); setModalType(null); setReviewAction(null); setPreviewUrl(null); setUploadFile(null); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

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

  const onStartSubmit = startForm.handleSubmit(async (data) => {
    if (!selectedDep) return;
    setSubmitting(true);
    try {
      const notes = getProjectServerUrl(selectedDep);
      await infraService.startDeployment(selectedDep.id, notes, data.artifact_version);
      toast.success('🚀 Deployment started successfully!');
      closeModal(); load();
    } finally { setSubmitting(false); }
  });

  const onCompleteSubmit = completeForm.handleSubmit(async (data) => {
    if (!selectedDep) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('deployment_status', data.deployment_status);
      formData.append('deployment_notes', data.deployment_notes);
      formData.append('completion_comments', data.completion_comments);
      if (uploadFile) formData.append('screenshot', uploadFile);
      await infraService.completeDeployment(selectedDep.id, formData);
      const msg = data.deployment_status === 'success'
        ? '✅ Deployment marked as successful! Dev team notified for acknowledgment.'
        : '❌ Deployment marked as failed. Dev team has been notified.';
      toast.success(msg);
      closeModal(); load();
    } finally { setSubmitting(false); }
  });

  const onReviewSubmit = reviewForm.handleSubmit(async (data) => {
    if (!selectedDep || !reviewAction) return;
    setSubmitting(true);
    try {
      await infraService.reviewDeployment(selectedDep.id, reviewAction, data.comments);
      const msg = reviewAction === 'sent_back'
        ? '↩️ Deployment sent back to QA for re-review.'
        : '🚫 Deployment rejected.';
      toast.success(msg);
      closeModal(); load();
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.message || 'Unknown error';
      toast.error(`Action failed: ${detail}`);
    } finally { setSubmitting(false); }
  });

  const ENV_COLORS: Record<string, string> = {
    PROD: 'border-red-500', UAT: 'border-purple-400', QA: 'border-blue-400', DEV: 'border-gray-300',
  };
  const getEnvBorderColor = (env: string) => {
    const envs = env.split(',').map((e) => e.trim());
    if (envs.includes('PROD')) return ENV_COLORS.PROD;
    if (envs.includes('UAT')) return ENV_COLORS.UAT;
    if (envs.includes('QA')) return ENV_COLORS.QA;
    return ENV_COLORS.DEV;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
            <ServerStackIcon className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">{loading ? '...' : queue.length} in queue</span>
          </div>
          <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className="form-select w-32">
            <option value="">All Envs</option>
            {['DEV', 'QA', 'UAT', 'PROD'].map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <button onClick={load} className="btn-secondary px-3">
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : queue.length === 0 ? (
        <EmptyState
          title="Deployment queue is empty"
          description="No deployments are pending infra action right now."
          icon={<ServerStackIcon className="w-8 h-8 text-purple-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {queue.map((dep) => (
            <div key={dep.id} className={`card border-l-4 overflow-hidden ${getEnvBorderColor(dep.environment)}`}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{dep.deployment_title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{dep.project_name}</p>
                  </div>
                  <div className="flex gap-1.5 ml-3">
                    <EnvBadge env={dep.environment} />
                    <PriorityBadge priority={dep.priority} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div>
                    <span className="text-gray-400 uppercase font-medium block mb-0.5">Branch</span>
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{dep.branch_name}</code>
                  </div>
                  <div>
                    <span className="text-gray-400 uppercase font-medium block mb-0.5">Requested by</span>
                    <span className="text-gray-700">{dep.raised_by_name}</span>
                  </div>
                  {dep.job_id && (
                    <div>
                      <span className="text-gray-400 uppercase font-medium block mb-0.5">Job ID</span>
                      <span className="text-gray-700">{dep.job_id}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400 uppercase font-medium block mb-0.5">Waiting</span>
                    <span className="text-gray-700">{formatRelative(dep.updated_at)}</span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-4
                  ${dep.status === 'deployment_in_progress' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dep.status === 'deployment_in_progress' ? 'bg-indigo-500 animate-pulse' : 'bg-purple-500'}`} />
                  {dep.status === 'deployment_in_progress' ? 'Deployment In Progress' : 'Pending Deployment'}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 flex-wrap">
                  <button onClick={() => navigate(`/deployments/${dep.id}`)} className="btn-secondary text-xs py-1.5 px-3">
                    <EyeIcon className="w-3.5 h-3.5" /> View
                  </button>
                  {dep.status === 'pending_infra_deployment' && (
                    <>
                      <button onClick={() => openStart(dep)} className="btn-primary text-xs py-1.5 px-3 flex-1 justify-center">
                        <PlayIcon className="w-3.5 h-3.5" /> Start Deployment
                      </button>
                      <button onClick={() => openReview(dep, 'sent_back')} className="btn-warning text-xs py-1.5 px-3 justify-center">
                        <ArrowUturnLeftIcon className="w-3.5 h-3.5" /> Send Back
                      </button>
                      <button onClick={() => openReview(dep, 'rejected')} className="btn-danger text-xs py-1.5 px-3 justify-center">
                        <NoSymbolIcon className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {dep.status === 'deployment_in_progress' && (
                    <button onClick={() => openComplete(dep)} className="btn-success text-xs py-1.5 px-3 flex-1 justify-center">
                      <CheckCircleIcon className="w-3.5 h-3.5" /> Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Deployment Modal */}
      <Modal
        isOpen={modalType === 'start'}
        onClose={closeModal}
        title="Start Deployment"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button onClick={onStartSubmit} className="btn-primary" disabled={submitting}>
              {submitting ? <ButtonSpinner /> : <PlayIcon className="w-4 h-4" />}
              Start Deployment
            </button>
          </div>
        }
      >
        {selectedDep && (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm font-semibold text-gray-900">{selectedDep.deployment_title}</p>
              <div className="flex gap-2 mt-1">
                <EnvBadge env={selectedDep.environment} />
                <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{selectedDep.branch_name}</code>
              </div>
            </div>
            <div>
              <label className="form-label">Project Name / Server URL</label>
              <div className="form-input bg-gray-50 text-gray-700 min-h-[2.5rem] whitespace-pre-wrap cursor-default select-text">
                {getProjectServerUrl(selectedDep) || <span className="text-gray-400 italic">Not specified</span>}
              </div>
            </div>
            <div>
              <label className="form-label">Build / Artifact Version <span className="text-red-500">*</span></label>
              <input
                {...startForm.register('artifact_version', { required: 'Artifact version is required' })}
                className="form-input"
                placeholder="e.g. 1.2.3 or build-456"
              />
              {startForm.formState.errors.artifact_version && (
                <p className="form-error">{startForm.formState.errors.artifact_version.message}</p>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <strong>Note:</strong> Clicking "Start Deployment" will change the status to "Deployment In Progress" and notify the Dev team.
            </div>
          </div>
        )}
      </Modal>

      {/* Complete Deployment Modal */}
      <Modal
        isOpen={modalType === 'complete'}
        onClose={closeModal}
        title="Complete Deployment"
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button
              onClick={onCompleteSubmit}
              className={completeForm.watch('deployment_status') === 'success' ? 'btn-success' : 'btn-danger'}
              disabled={submitting}
            >
              {submitting ? <ButtonSpinner /> : completeForm.watch('deployment_status') === 'success' ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
              Mark as {completeForm.watch('deployment_status') === 'success' ? 'Successful' : 'Failed'}
            </button>
          </div>
        }
      >
        {selectedDep && (
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="text-sm font-semibold text-gray-900 mb-1">{selectedDep.deployment_title}</p>
              <div className="flex gap-2 flex-wrap">
                <EnvBadge env={selectedDep.environment} />
                <PriorityBadge priority={selectedDep.priority} />
                <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{selectedDep.branch_name}</code>
              </div>
            </div>

            {/* Deployment Outcome */}
            <div>
              <label className="form-label">Deployment Outcome <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                {(['success', 'failed'] as const).map((val) => (
                  <label key={val} className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${completeForm.watch('deployment_status') === val
                      ? val === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" value={val} {...completeForm.register('deployment_status')} className="sr-only" />
                    {val === 'success' ? <CheckCircleIcon className={`w-6 h-6 ${completeForm.watch('deployment_status') === 'success' ? 'text-green-600' : 'text-gray-400'}`} />
                      : <XCircleIcon className={`w-6 h-6 ${completeForm.watch('deployment_status') === 'failed' ? 'text-red-600' : 'text-gray-400'}`} />}
                    <div>
                      <p className="text-sm font-semibold capitalize">{val}</p>
                      <p className="text-xs text-gray-500">{val === 'success' ? 'Deployment completed successfully' : 'Deployment encountered errors'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Deployment Notes <span className="text-red-500">*</span></label>
              <input
                {...completeForm.register('deployment_notes', { required: 'Notes are required' })}
                className="form-input"
                placeholder="Describe the Jenkins job or url details"
              />
              {completeForm.formState.errors.deployment_notes && (
                <p className="form-error">{completeForm.formState.errors.deployment_notes.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Completion Comments <span className="text-red-500">*</span></label>
              <textarea
                {...completeForm.register('completion_comments', { required: 'Comments are required' })}
                className="form-textarea"
                rows={3}
                placeholder="Deployment outcome details, any issues encountered, post-deployment checks..."
              />
              {completeForm.formState.errors.completion_comments && (
                <p className="form-error">{completeForm.formState.errors.completion_comments.message}</p>
              )}
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="form-label">
                Deployment Screenshot
                <span className="text-gray-400 text-xs font-normal ml-1">(Jenkins/Zinckin success screenshot)</span>
              </label>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                >
                  <CloudArrowUpIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700">Click to upload screenshot</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WebP or PDF · Max 10MB</p>
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-gray-200">
                  <img src={previewUrl} alt="Screenshot preview" className="w-full max-h-48 object-contain bg-gray-50" />
                  <button
                    type="button"
                    onClick={() => { setPreviewUrl(null); setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-600" />
                  </button>
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs text-gray-600 truncate">{uploadFile?.name}</p>
                    <p className="text-xs text-gray-400">{uploadFile ? (uploadFile.size / 1024).toFixed(1) : 0} KB</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      {/* Review Modal (Send Back / Reject) */}
      <Modal
        isOpen={modalType === 'review'}
        onClose={closeModal}
        title={reviewAction === 'sent_back' ? 'Send Back to QA' : 'Reject Deployment'}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button
              onClick={onReviewSubmit}
              className={reviewAction === 'sent_back' ? 'btn-warning' : 'btn-danger'}
              disabled={submitting}
            >
              {submitting ? <ButtonSpinner /> : reviewAction === 'sent_back' ? <ArrowUturnLeftIcon className="w-4 h-4" /> : <NoSymbolIcon className="w-4 h-4" />}
              {reviewAction === 'sent_back' ? 'Send Back to QA' : 'Reject Deployment'}
            </button>
          </div>
        }
      >
        {selectedDep && (
          <div className="space-y-4">
            <div className={`rounded-lg p-4 border ${reviewAction === 'sent_back' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-sm font-semibold text-gray-900">{selectedDep.deployment_title}</p>
              <div className="flex gap-2 mt-1">
                <EnvBadge env={selectedDep.environment} />
                <PriorityBadge priority={selectedDep.priority} />
              </div>
              <p className="text-xs mt-2 text-gray-600">
                {reviewAction === 'sent_back'
                  ? 'This deployment will be sent back to the QA team for re-review.'
                  : 'This deployment will be rejected. The developer will be notified.'}
              </p>
            </div>
            <div>
              <label className="form-label">Comments <span className="text-red-500">*</span></label>
              <textarea
                {...reviewForm.register('comments', { required: 'Comments are required', minLength: { value: 5, message: 'Please provide more detail' } })}
                className="form-textarea"
                rows={4}
                placeholder={reviewAction === 'sent_back'
                  ? 'Describe what changes QA needs to review before re-approving...'
                  : 'Explain the reason for rejection...'}
              />
              {reviewForm.formState.errors.comments && (
                <p className="form-error">{reviewForm.formState.errors.comments.message}</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
