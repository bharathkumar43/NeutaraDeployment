import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon, PencilSquareIcon, CalendarDaysIcon,
  UserCircleIcon, LinkIcon, ServerStackIcon, PhotoIcon,
  CheckCircleIcon, XCircleIcon, ArrowUturnLeftIcon, ExclamationTriangleIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { deploymentService, qaService } from '../services/deployment.service';
import { DeploymentRequest } from '../types';
import { StatusBadge, PriorityBadge, EnvBadge } from '../components/common/StatusBadge';
import { WorkflowProgress } from '../components/common/WorkflowProgress';
import { AuditTimeline } from '../components/common/AuditTimeline';
import { PageLoader, ButtonSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useAuthStore } from '../store/authStore';
import { formatDateTime, formatRelative } from '../utils/format';

interface QAFormData {
  qa_ticket_link: string;
  qa_description: string;
  qa_comments: string;
}

type ActionType = 'approved' | 'rejected' | 'sent_back';

const ACTION_CONFIG: Record<ActionType, { title: string; btnClass: string; icon: React.ReactNode; placeholder: string }> = {
  approved:  { title: 'Approve Deployment',   btnClass: 'btn-success', icon: <CheckCircleIcon className="w-4 h-4" />,    placeholder: 'Add approval notes, testing done, sign-off comments...' },
  rejected:  { title: 'Reject Deployment',    btnClass: 'btn-danger',  icon: <XCircleIcon className="w-4 h-4" />,        placeholder: 'Explain the reason for rejection clearly...' },
  sent_back: { title: 'Send Back to Dev',     btnClass: 'bg-orange-500 text-white hover:bg-orange-600 btn-primary', icon: <ArrowUturnLeftIcon className="w-4 h-4" />, placeholder: 'Describe what needs to be fixed or changed...' },
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <span className="w-36 flex-shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wide pt-0.5">{label}</span>
    <span className="text-sm text-gray-900 flex-1">{value}</span>
  </div>
);

export const DeploymentDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuthStore();
  const [deployment, setDeployment] = useState<DeploymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'qa' | 'infra' | 'ack' | 'audit'>('details');
  const [qaAction, setQaAction] = useState<ActionType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register: qaRegister, handleSubmit: qaHandleSubmit, formState: { errors: qaErrors }, reset: qaReset } = useForm<QAFormData>();

  const loadDeployment = async () => {
    if (!id) return;
    setLoading(true);
    try { setDeployment(await deploymentService.getById(id)); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadDeployment(); }, [id]);

  const openQAModal = (actionType: ActionType) => { setQaAction(actionType); qaReset(); };
  const closeQAModal = () => { setQaAction(null); qaReset(); };

  const onQASubmit = qaHandleSubmit(async (data) => {
    if (!deployment || !qaAction) return;
    setSubmitting(true);
    try {
      await qaService.approve(deployment.id, { approval_status: qaAction, ...data });
      const msgs: Record<ActionType, string> = {
        approved:  '✅ Deployment approved and forwarded to Infra team!',
        rejected:  '❌ Deployment rejected and Dev team notified.',
        sent_back: '↩️ Deployment sent back to Dev team for revision.',
      };
      toast.success(msgs[qaAction]);
      closeQAModal();
      loadDeployment();
    } finally { setSubmitting(false); }
  });

  if (loading) return <PageLoader />;
  if (!deployment) return <div className="text-center py-20 text-gray-500">Deployment not found.</div>;

  const canEdit = (
    deployment.status === 'draft' ||
    deployment.status === 'rejected_by_qa' ||
    deployment.status === 'rejected_by_infra'
  ) && (deployment.raised_by === user?.id || hasRole('admin'));

  const canDelete =
    hasRole('admin') ||
    (['draft', 'pending_qa_approval'].includes(deployment.status) && deployment.raised_by === user?.id);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${deployment.deployment_title}"?\n\nThis cannot be undone.`)) return;
    try {
      await deploymentService.delete(deployment.id);
      toast.success('Deployment deleted.');
      navigate('/deployments');
    } catch {
      toast.error('Failed to delete. Please try again.');
    }
  };

  const canQAReview = deployment.status === 'pending_qa_approval' && (hasRole('qa') || hasRole('admin'));

  const meta = (deployment as any).extra_meta
    ? (typeof (deployment as any).extra_meta === 'string'
        ? JSON.parse((deployment as any).extra_meta)
        : (deployment as any).extra_meta)
    : {};
  const projectServerUrl: string = meta.deployment_scope === 'multiple'
    ? meta.multi_project_names || ''
    : meta.single_project_name || '';

  const latestInfraLog = deployment.infra_logs?.[0];
  const latestQA = deployment.qa_approvals?.[0];
  const latestAck = deployment.acknowledgments?.[0];

  const TABS = [
    { key: 'details', label: 'Details' },
    { key: 'qa',      label: `QA (${deployment.qa_approvals?.length || 0})` },
    { key: 'infra',   label: `Infra (${deployment.infra_logs?.length || 0})` },
    { key: 'ack',     label: `Acknowledgment (${deployment.acknowledgments?.length || 0})` },
    { key: 'audit',   label: `Audit Trail (${deployment.audit_trail?.length || 0})` },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-secondary py-1.5 px-3 text-sm">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={() => navigate(`/deployments/${id}/edit`)} className="btn-primary py-1.5 px-3 text-sm">
              <PencilSquareIcon className="w-4 h-4" /> Edit
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="btn-danger py-1.5 px-3 text-sm">
              <TrashIcon className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{deployment.deployment_title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={deployment.status} />
              <PriorityBadge priority={deployment.priority} />
              <EnvBadge env={deployment.environment} />
            </div>
          </div>
          <div className="text-right text-xs text-gray-400 flex-shrink-0">
            <p>ID: <code className="font-mono">{deployment.id.slice(0, 8)}…</code></p>
            <p className="mt-1">{formatDateTime(deployment.created_at)}</p>
          </div>
        </div>

        {/* Workflow progress */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Workflow Progress</p>
          <WorkflowProgress status={deployment.status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-6">
          <nav className="flex gap-0 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.key
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-1">
              {/* Infra rejection / sent-back banner */}
              {deployment.status === 'rejected_by_infra' && meta.infra_review_comments && (
                <div className="mb-4 bg-red-50 border border-red-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm font-semibold text-red-800">
                      Rejected by Infra{meta.infra_reviewed_by ? ` — ${meta.infra_reviewed_by}` : ''}
                    </p>
                  </div>
                  <p className="text-sm text-red-700 ml-7">{meta.infra_review_comments}</p>
                </div>
              )}

              <DetailRow label="Project" value={<span className="font-medium">{deployment.project_name}</span>} />
              <DetailRow label="Branch" value={<code className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{deployment.branch_name}</code>} />
              <DetailRow label="Job ID" value={deployment.job_id || <span className="text-gray-400">Not specified</span>} />
              <DetailRow label="Raised By" value={
                <div>
                  <span className="font-medium">{deployment.raised_by_name}</span>
                  {deployment.raised_by_team && <span className="text-gray-500 text-xs ml-2">({deployment.raised_by_team})</span>}
                </div>
              } />
              <DetailRow label="Submitted" value={deployment.submitted_at ? formatDateTime(deployment.submitted_at) : <span className="text-gray-400">Not submitted yet</span>} />
              <DetailRow label="Last Updated" value={formatRelative(deployment.updated_at)} />
              {deployment.ticket_link && (
                <DetailRow label="Ticket Link" value={
                  <div className="flex flex-col gap-1">
                    {deployment.ticket_link.split(/[\s,]+/).map((t: string) => t.trim()).filter(Boolean).map((ticket: string, i: number) => (
                      <a key={i} href={ticket} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                        <LinkIcon className="w-3.5 h-3.5" />{ticket}
                      </a>
                    ))}
                  </div>
                } />
              )}
              <DetailRow
                label="Project / Server URL"
                value={
                  projectServerUrl
                    ? <span className="whitespace-pre-wrap">{projectServerUrl}</span>
                    : <span className="text-gray-400">Not specified</span>
                }
              />
              <div className="pt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Description</p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {deployment.description || <span className="text-gray-400 italic">No description provided.</span>}
                </div>
              </div>

              {/* QA Action Buttons — visible to QA/admin when pending review */}
              {canQAReview && (
                <div className="mt-5 pt-5 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">QA Review Action</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openQAModal('sent_back')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
                    >
                      <ArrowUturnLeftIcon className="w-4 h-4" /> Send Back
                    </button>
                    <button
                      onClick={() => openQAModal('rejected')}
                      className="btn-danger text-sm py-2"
                    >
                      <XCircleIcon className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => openQAModal('approved')}
                      className="btn-success text-sm py-2"
                    >
                      <CheckCircleIcon className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* QA Tab */}
          {activeTab === 'qa' && (
            <div>
              {!deployment.qa_approvals?.length ? (
                <p className="text-sm text-gray-500 py-4 text-center">No QA reviews yet.</p>
              ) : deployment.qa_approvals.map((qa) => (
                <div key={qa.id} className={`rounded-lg border p-4 mb-3 ${qa.approval_status === 'approved' ? 'border-green-200 bg-green-50' : qa.approval_status === 'rejected' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${qa.approval_status === 'approved' ? 'bg-green-200 text-green-800' : qa.approval_status === 'rejected' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                        {qa.approval_status.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-medium text-gray-800">by {qa.qa_user_name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDateTime(qa.approved_at)}</span>
                  </div>
                  {qa.qa_ticket_link && (
                    <p className="text-xs text-gray-600 mb-2">
                      Ticket:{' '}
                      {qa.qa_ticket_link.split(/[\s,]+/).map((t: string) => t.trim()).filter(Boolean).map((ticket: string, i: number, arr: string[]) => (
                        <React.Fragment key={i}>
                          <a href={ticket} className="text-blue-600 hover:underline">{ticket}</a>
                          {i < arr.length - 1 && ', '}
                        </React.Fragment>
                      ))}
                    </p>
                  )}
                  {qa.qa_description && <p className="text-sm text-gray-700 mb-2">{qa.qa_description}</p>}
                  <div className="bg-white/60 rounded p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Comments</p>
                    <p className="text-sm text-gray-700">{qa.qa_comments}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Infra Tab */}
          {activeTab === 'infra' && (
            <div>
              {!deployment.infra_logs?.length ? (
                <p className="text-sm text-gray-500 py-4 text-center">No infra logs yet.</p>
              ) : deployment.infra_logs.map((log) => (
                <div key={log.id} className={`rounded-lg border p-4 mb-3 ${log.deployment_status === 'success' ? 'border-green-200 bg-green-50' : log.deployment_status === 'failed' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${log.deployment_status === 'success' ? 'bg-green-200 text-green-800' : log.deployment_status === 'failed' ? 'bg-red-200 text-red-800' : 'bg-blue-200 text-blue-800'}`}>
                      {log.deployment_status}
                    </span>
                    <span className="text-sm font-medium text-gray-600">by {log.infra_user_name}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2"><strong>Notes:</strong> {log.deployment_notes}</p>
                  {log.completion_comments && <p className="text-sm text-gray-700 mb-3"><strong>Comments:</strong> {log.completion_comments}</p>}
                  {log.screenshot_path && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><PhotoIcon className="w-3.5 h-3.5" /> Deployment Screenshot</p>
                      <img src={`/${log.screenshot_path}`} alt="Deployment screenshot" className="max-w-full max-h-64 rounded-lg border border-gray-200 object-contain" />
                    </div>
                  )}
                  {log.completed_at && <p className="text-xs text-gray-500 mt-3">Completed: {formatDateTime(log.completed_at)}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Acknowledgment Tab */}
          {activeTab === 'ack' && (
            <div>
              {!deployment.acknowledgments?.length ? (
                <p className="text-sm text-gray-500 py-4 text-center">No acknowledgments yet.</p>
              ) : deployment.acknowledgments.map((ack) => (
                <div key={ack.id} className={`rounded-lg border p-4 ${ack.status === 'acknowledged' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${ack.status === 'acknowledged' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                      {ack.status.replace('_', ' ')}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-700">by {ack.acknowledged_by_name}</span>
                      <p className="text-xs text-gray-500">{formatDateTime(ack.acknowledged_at)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{ack.acknowledgment_comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Audit Trail Tab */}
          {activeTab === 'audit' && (
            <AuditTimeline logs={deployment.audit_trail || []} requestNumber={deployment.request_number} />
          )}
        </div>
      </div>

      {/* QA Review Modal */}
      {qaAction && (
        <Modal
          isOpen={!!qaAction}
          onClose={closeQAModal}
          title={ACTION_CONFIG[qaAction].title}
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={closeQAModal} className="btn-secondary">Cancel</button>
              <button onClick={onQASubmit} className={ACTION_CONFIG[qaAction].btnClass} disabled={submitting}>
                {submitting ? <ButtonSpinner /> : ACTION_CONFIG[qaAction].icon}
                Confirm {qaAction.charAt(0).toUpperCase() + qaAction.slice(1).replace('_', ' ')}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-1">{deployment.deployment_title}</p>
              <div className="flex gap-2 flex-wrap">
                <EnvBadge env={deployment.environment} />
                <PriorityBadge priority={deployment.priority} />
              </div>
              <p className="text-xs text-gray-500 mt-2">{deployment.project_name} · Branch: <code className="bg-gray-200 px-1 rounded">{deployment.branch_name}</code></p>
            </div>

            {qaAction === 'approved' && deployment.priority === 'critical' && (
              <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">This is a <strong>CRITICAL</strong> priority deployment. Please ensure thorough review before approving.</p>
              </div>
            )}

            <div>
              <label className="form-label">QA Ticket Link</label>
              <input {...qaRegister('qa_ticket_link')} className="form-input" placeholder="https://jira.company.com/QA-456" />
            </div>
            <div>
              <label className="form-label">QA Review Notes</label>
              <input {...qaRegister('qa_description')} className="form-input" placeholder="Brief description of QA testing done..." />
            </div>
            <div>
              <label className="form-label">Comments <span className="text-red-500">*</span></label>
              <textarea
                {...qaRegister('qa_comments', { required: 'Comments are required' })}
                className="form-textarea"
                rows={4}
                placeholder={ACTION_CONFIG[qaAction].placeholder}
              />
              {qaErrors.qa_comments && <p className="form-error">{qaErrors.qa_comments.message}</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
