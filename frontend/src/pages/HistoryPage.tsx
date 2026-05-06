import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon, ArrowPathIcon, ChevronLeftIcon,
  ChevronRightIcon, FunnelIcon,
} from '@heroicons/react/24/outline';
import { deploymentService } from '../services/deployment.service';
import { DeploymentRequest } from '../types';
import { StatusBadge, PriorityBadge, EnvBadge } from '../components/common/StatusBadge';
import { PageLoader } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { formatDateTime, formatRelative } from '../utils/format';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [deployments, setDeployments] = useState<DeploymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [environment, setEnvironment] = useState('');
  const [priority, setPriority] = useState('');
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await deploymentService.getAll({ status, environment, priority, search, page, limit: LIMIT });
      setDeployments(result.data);
      setTotal(result.pagination?.total || 0);
    } finally { setLoading(false); }
  }, [status, environment, priority, search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by title or project..." className="form-input pl-9 w-full" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="form-select w-44">
            <option value="">All Statuses</option>
            {[['draft','Draft'],['pending_qa_approval','Pending QA'],['pending_infra_deployment','Pending Infra'],['deployment_in_progress','In Progress'],['deployment_failed','Failed'],['successfully_completed','Completed'],['rejected_by_qa','Rejected by QA'],['issue_raised','Issue Raised']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
          <select value={environment} onChange={(e) => { setEnvironment(e.target.value); setPage(1); }} className="form-select w-28">
            <option value="">All Envs</option>
            {['DEV','QA','UAT','PROD'].map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="form-select w-32">
            <option value="">All Priorities</option>
            {['critical','high','medium','low'].map((p) => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
          <button onClick={() => { setStatus(''); setEnvironment(''); setPriority(''); setSearchInput(''); setPage(1); }} className="btn-secondary text-sm py-2 px-3">Reset</button>
          <button onClick={load} className="btn-secondary px-3">
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{total} total deployments</span>
        {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : deployments.length === 0 ? (
          <EmptyState title="No deployments found" description="Adjust your search filters to find deployments." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Deployment</th>
                    <th className="table-header">Env</th>
                    <th className="table-header">Branch</th>
                    <th className="table-header">Priority</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Raised By</th>
                    <th className="table-header">Created</th>
                    <th className="table-header">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deployments.map((dep) => (
                    <tr key={dep.id} onClick={() => navigate(`/deployments/${dep.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                      <td className="table-cell">
                        <p className="font-medium text-blue-700 group-hover:text-blue-900 max-w-[200px] truncate">{dep.deployment_title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{dep.project_name}</p>
                      </td>
                      <td className="table-cell"><EnvBadge env={dep.environment} /></td>
                      <td className="table-cell"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{dep.branch_name}</code></td>
                      <td className="table-cell"><PriorityBadge priority={dep.priority} /></td>
                      <td className="table-cell"><StatusBadge status={dep.status} /></td>
                      <td className="table-cell text-gray-600 text-xs">{dep.raised_by_name}</td>
                      <td className="table-cell text-gray-400 text-xs whitespace-nowrap">{formatDateTime(dep.created_at)}</td>
                      <td className="table-cell text-gray-400 text-xs whitespace-nowrap">{formatRelative(dep.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1} className="btn-secondary py-1.5 px-2.5 disabled:opacity-40"><ChevronLeftIcon className="w-4 h-4" /></button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages} className="btn-secondary py-1.5 px-2.5 disabled:opacity-40"><ChevronRightIcon className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
