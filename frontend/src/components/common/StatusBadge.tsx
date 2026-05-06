import React from 'react';
import { DeploymentStatus, Priority, Environment } from '../../types';
import { STATUS_CONFIG, PRIORITY_CONFIG, ENV_CONFIG } from '../../utils/statusConfig';

export const StatusBadge: React.FC<{ status: DeploymentStatus; showDot?: boolean }> = ({ status, showDot = true }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority] || { label: priority, color: 'text-gray-600', bg: 'bg-gray-100' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} uppercase tracking-wide`}>
      {cfg.label}
    </span>
  );
};

export const EnvBadge: React.FC<{ env: string }> = ({ env }) => {
  const envList = (env || '').split(',').map((e) => e.trim()).filter(Boolean);
  return (
    <span className="inline-flex flex-wrap gap-1">
      {envList.map((e) => {
        const cfg = ENV_CONFIG[e as Environment] || { label: e, color: 'text-gray-600', bg: 'bg-gray-100' };
        return (
          <span key={e} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${cfg.bg} ${cfg.color} font-mono`}>
            {cfg.label}
          </span>
        );
      })}
    </span>
  );
};
