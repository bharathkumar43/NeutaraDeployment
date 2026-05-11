import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusIcon, MagnifyingGlassIcon,
  ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { deploymentService } from '../services/deployment.service';
import { DeploymentRequest } from '../types';
import { StatusBadge, PriorityBadge, EnvBadge } from '../components/common/StatusBadge';
import { PageLoader } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useAuthStore } from '../store/authStore';
import { formatRelative } from '../utils/format';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_qa_approval', label: 'Pending QA' },
  { value: 'pending_infra_deployment', label: 'Pending Infra' },
  { value: 'deployment_in_progress', label: 'In Progress' },
  { value: 'deployment_failed', label: 'Failed' },
  { value: 'pending_dev_acknowledgment', label: 'Pending Ack.' },
  { value: 'successfully_completed', label: 'Completed' },
  { value: 'rejected_by_qa', label: 'Rejected by QA' },
  { value: 'issue_raised', label: 'Issue Raised' },
];

export const DeploymentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole, user } = useAuthStore();

  const [deployments, setDeployments] = useState<DeploymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const status = searchParams.get('status') || '';
  const environment = searchParams.get('environment') || '';
  const priority = searchParams.get('priority') || '';
  const LIMIT = 15;

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
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    setSearchParams(params);
    setPage(1);
  };

  const canDelete = (): boolean => {
    return user?.role === 'admin';
  };

  const handleDelete = async (e: React.MouseEvent, dep: DeploymentRequest) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${dep.deployment_title}"?\n\nThis action cannot be undone.`)) return;
    setDeleting(dep.id);
    try {
      await deploymentService.delete(dep.id);
      await load();
    } catch {
      alert('Failed to delete deployment. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search deployments..."
              className="form-input pl-9 w-56"
            />
          </div>

          {/* Filters */}
          <select value={status} onChange={(e) => updateFilter('status', e.target.value)} className="form-select w-44">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={environment} onChange={(e) => updateFilter('environment', e.target.value)} className="form-select w-32">
            <option value="">All Envs</option>
            {['DEV', 'QA', 'UAT', 'PROD'].map((e) => <option key={e} value={e}>{e}</option>)}
          </select>

          <select value={priority} onChange={(e) => updateFilter('priority', e.target.value)} className="form-select w-36">
            <option value="">All Priorities</option>
            {['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>

          <button onClick={load} className="btn-secondary px-3">
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {hasRole('dev', 'admin') && (
          <button onClick={() => navigate('/deployments/new')} className="btn-primary flex-shrink-0">
            <PlusIcon className="w-4 h-4" />
            New Deployment
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="text-sm text-gray-500">
        Showing {deployments.length} of {total} deployments
        {(status || environment || priority || search) && (
          <button onClick={() => { setSearchParams({}); setSearchInput(''); }} className="ml-3 text-blue-600 hover:text-blue-800 text-xs font-medium">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : deployments.length === 0 ? (
          <EmptyState
            title="No deployments found"
            description="Try adjusting your filters or create a new deployment request."
            action={hasRole('dev', 'admin') ? (
              <button onClick={() => navigate('/deployments/new')} className="btn-primary">
                <PlusIcon className="w-4 h-4" /> New Deployment
              </button>
            ) : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Req #</th>
                    <th className="table-header">Title</th>
                    <th className="table-header">Project</th>
                    <th className="table-header">Env</th>
                    <th className="table-header">Branch</th>
                    <th className="table-header">Priority</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Raised By</th>
                    <th className="table-header">Created</th>
                    <th className="table-header w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deployments.map((dep) => (
                    <tr
                      key={dep.id}
                      onClick={() => navigate(`/deployments/${dep.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <td className="table-cell">
                        {dep.request_number ? (
                          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded whitespace-nowrap">
                            {dep.request_number}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className="font-medium text-blue-700 group-hover:text-blue-900 max-w-[220px] block truncate">
                          {dep.deployment_title}
                        </span>
                      </td>
                      <td className="table-cell text-gray-600 max-w-[140px] truncate">{dep.project_name}</td>
                      <td className="table-cell"><EnvBadge env={dep.environment} /></td>
                      <td className="table-cell">
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{dep.branch_name}</code>
                      </td>
                      <td className="table-cell"><PriorityBadge priority={dep.priority} /></td>
                      <td className="table-cell"><StatusBadge status={dep.status} /></td>
                      <td className="table-cell text-gray-600">{dep.raised_by_name || '—'}</td>
                      <td className="table-cell text-gray-400 whitespace-nowrap text-xs">{formatRelative(dep.created_at)}</td>
                      <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                        {canDelete() && (
                          <button
                            onClick={(e) => handleDelete(e, dep)}
                            disabled={deleting === dep.id}
                            className="p-1.5 rounded text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            title="Delete deployment"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-2.5 disabled:opacity-40">
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1.5 px-2.5 disabled:opacity-40">
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
