import React from 'react';
import { AuditLog } from '../../types';
import { formatDateTime, formatAction } from '../../utils/format';

const ACTION_ICONS: Record<string, string> = {
  DRAFT_CREATED: '📝', SUBMITTED_FOR_QA: '📤', RESUBMITTED_FOR_QA: '🔄',
  QA_APPROVED: '✅', QA_REJECTED: '❌', QA_SENT_BACK: '↩️',
  DEPLOYMENT_STARTED: '🚀', DEPLOYMENT_COMPLETED: '✅', DEPLOYMENT_FAILED: '💥',
  DEPLOYMENT_ACKNOWLEDGED: '🎉', ISSUE_RAISED: '⚠️', DRAFT_UPDATED: '✏️',
};

const ACTION_COLORS: Record<string, string> = {
  QA_APPROVED: 'border-green-400 bg-green-50',
  QA_REJECTED: 'border-red-400 bg-red-50',
  DEPLOYMENT_COMPLETED: 'border-green-400 bg-green-50',
  DEPLOYMENT_FAILED: 'border-red-400 bg-red-50',
  DEPLOYMENT_ACKNOWLEDGED: 'border-green-400 bg-green-50',
  ISSUE_RAISED: 'border-red-400 bg-red-50',
  DEPLOYMENT_STARTED: 'border-blue-400 bg-blue-50',
};

export const AuditTimeline: React.FC<{ logs: AuditLog[] }> = ({ logs }) => {
  if (!logs.length) return <p className="text-sm text-gray-500 text-center py-4">No activity yet.</p>;

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
      <div className="space-y-4">
        {logs.map((log) => {
          const color = ACTION_COLORS[log.action] || 'border-gray-300 bg-gray-50';
          return (
            <div key={log.id} className="flex gap-4 relative">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-base z-10 shadow-sm">
                {ACTION_ICONS[log.action] || '📋'}
              </div>
              <div className={`flex-1 rounded-lg border-l-4 p-3 ${color}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatAction(log.action)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      by <span className="font-medium text-gray-700">{log.performed_by_name || 'System'}</span>
                      {log.performed_by_role && <span className="ml-1 text-gray-400">({log.performed_by_role})</span>}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(log.created_at)}</span>
                </div>
                {(log.old_status || log.new_status) && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    {log.old_status && <span className="bg-gray-200 px-2 py-0.5 rounded">{log.old_status.replace(/_/g, ' ')}</span>}
                    {log.old_status && log.new_status && <span>→</span>}
                    {log.new_status && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{log.new_status.replace(/_/g, ' ')}</span>}
                  </div>
                )}
                {log.comment && <p className="mt-2 text-xs text-gray-600 italic">"{log.comment}"</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
