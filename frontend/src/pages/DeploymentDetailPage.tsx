import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon, PencilSquareIcon, CalendarDaysIcon,
  UserCircleIcon, LinkIcon, ServerStackIcon, PhotoIcon,
} from '@heroicons/react/24/outline';
import { deploymentService } from '../services/deployment.service';
import { DeploymentRequest } from '../types';
import { StatusBadge, PriorityBadge, EnvBadge } from '../components/common/StatusBadge';
import { WorkflowProgress } from '../components/common/WorkflowProgress';
import { AuditTimeline } from '../components/common/AuditTimeline';
import { PageLoader } from '../components/common/LoadingSpinner';
import { useAuthStore } from '../store/authStore';
import { formatDateTime, formatRelative } from '../utils/format';

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

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try { setDeployment(await deploymentService.getById(id)); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!deployment) return <div className="text-center py-20 text-gray-500">Deployment not found.</div>;

  const canEdit = (deployment.status === 'draft' || deployment.status === 'rejected_by_qa')
    && (deployment.raised_by === user?.id || hasRole('admin'));

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
        {canEdit && (
          <button onClick={() => navigate(`/deployments/${id}/edit`)} className="btn-primary py-1.5 px-3 text-sm">
            <PencilSquareIcon className="w-4 h-4" /> Edit
          </button>
        )}
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
                  <a href={deployment.ticket_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                    <LinkIcon className="w-3.5 h-3.5" />{deployment.ticket_link}
                  </a>
                } />
              )}
              <div className="pt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Description</p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {deployment.description}
                </div>
              </div>
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
                  {qa.qa_ticket_link && <p className="text-xs text-gray-600 mb-2">Ticket: <a href={qa.qa_ticket_link} className="text-blue-600 hover:underline">{qa.qa_ticket_link}</a></p>}
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
    </div>
  );
};
