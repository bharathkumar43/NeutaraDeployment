import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon, RocketLaunchIcon, CheckCircleIcon, XCircleIcon,
  ArrowPathIcon, MagnifyingGlassIcon, FunnelIcon,
  ChevronLeftIcon, ChevronRightIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { adminService, AuditFilters } from '../services/admin.service';
import { UserStat, AdminAuditEntry } from '../types';
import { formatDateTime, formatRelative } from '../utils/format';
import { PageLoader } from '../components/common/LoadingSpinner';

// ── Action display config ────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; cls: string }> = {
  DRAFT_CREATED:           { label: 'Draft Created',       cls: 'bg-gray-100 text-gray-700' },
  DRAFT_UPDATED:           { label: 'Draft Updated',       cls: 'bg-gray-100 text-gray-700' },
  SUBMITTED_FOR_QA:        { label: 'Submitted for QA',    cls: 'bg-blue-100 text-blue-700' },
  RESUBMITTED_FOR_QA:      { label: 'Resubmitted for QA',  cls: 'bg-blue-100 text-blue-700' },
  QA_APPROVED:             { label: 'QA Approved',         cls: 'bg-green-100 text-green-700' },
  QA_REJECTED:             { label: 'QA Rejected',         cls: 'bg-red-100 text-red-700' },
  QA_SENT_BACK:            { label: 'Sent Back by QA',     cls: 'bg-amber-100 text-amber-700' },
  DEPLOYMENT_STARTED:      { label: 'Deployment Started',  cls: 'bg-indigo-100 text-indigo-700' },
  DEPLOYMENT_COMPLETED:    { label: 'Deployed',            cls: 'bg-green-100 text-green-700' },
  DEPLOYMENT_FAILED:       { label: 'Deployment Failed',   cls: 'bg-red-100 text-red-700' },
  DEPLOYMENT_ACKNOWLEDGED: { label: 'Acknowledged',        cls: 'bg-teal-100 text-teal-700' },
  ISSUE_RAISED:            { label: 'Issue Raised',        cls: 'bg-orange-100 text-orange-700' },
  DELETED:                 { label: 'Deleted',             cls: 'bg-red-100 text-red-700' },
};

const actionMeta = (action: string) =>
  ACTION_META[action] ?? { label: action.replace(/_/g, ' '), cls: 'bg-gray-100 text-gray-600' };

const ALL_ACTIONS = Object.keys(ACTION_META);

// ── Helpers ──────────────────────────────────────────────────────────────────

const n = (v: string | number) => parseInt(String(v)) || 0;

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="card flex items-center gap-4 p-5">
    <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  </div>
);

const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return <span className="text-gray-300">—</span>;
  const labels: Record<string, string> = {
    draft: 'Draft', pending_qa_approval: 'Pending QA', rejected_by_qa: 'Rejected',
    pending_infra_deployment: 'Pending Infra', deployment_in_progress: 'In Progress',
    deployment_failed: 'Failed', pending_dev_acknowledgment: 'Pending Ack',
    successfully_completed: 'Completed', issue_raised: 'Issue Raised',
  };
  return <span className="text-xs text-gray-500">{labels[status] ?? status}</span>;
};

// ── Main Page ────────────────────────────────────────────────────────────────

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // User stats state
  const [stats, setStats]       = useState<UserStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Audit log state
  const [logs, setLogs]         = useState<AdminAuditEntry[]>([]);
  const [logsLoading, setLogsLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const LIMIT = 30;

  // Audit filters
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [userFilter, setUserFilter] = useState('');

  // Summary totals derived from user stats
  const totals = {
    users:      stats.length,
    raised:     stats.reduce((s, u) => s + n(u.total_raised), 0),
    deployed:   stats.reduce((s, u) => s + n(u.deployed), 0),
    failed:     stats.reduce((s, u) => s + n(u.failed), 0),
    rejected:   stats.reduce((s, u) => s + n(u.rejected_by_qa), 0),
    sent_back:  stats.reduce((s, u) => s + n(u.sent_back), 0),
  };

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try { setStats(await adminService.getUserStats()); }
    finally { setStatsLoading(false); }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const filters: AuditFilters = { page, limit: LIMIT };
      if (search)       filters.search    = search;
      if (actionFilter) filters.action    = actionFilter;
      if (dateFrom)     filters.date_from = dateFrom;
      if (dateTo)       filters.date_to   = dateTo;
      if (userFilter)   filters.user_id   = userFilter;
      const res = await adminService.getAuditLogs(filters);
      setLogs(res.data);
      setTotal(res.pagination?.total || 0);
    } finally { setLogsLoading(false); }
  }, [page, search, actionFilter, dateFrom, dateTo, userFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadLogs();  }, [loadLogs]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const resetFilters = () => {
    setSearchInput(''); setSearch(''); setActionFilter('');
    setDateFrom(''); setDateTo(''); setUserFilter(''); setPage(1);
  };

  const hasFilters = search || actionFilter || dateFrom || dateTo || userFilter;
  const totalPages = Math.ceil(total / LIMIT);

  const roleColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    dev:   'bg-blue-100 text-blue-700',
    qa:    'bg-yellow-100 text-yellow-700',
    infra: 'bg-indigo-100 text-indigo-700',
    viewer:'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">System-wide statistics and full audit trail</p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Active Users"     value={totals.users}     icon={<UsersIcon className="w-5 h-5 text-purple-600" />}      color="bg-purple-100" />
        <StatCard label="Total Requests"   value={totals.raised}    icon={<RocketLaunchIcon className="w-5 h-5 text-blue-600" />} color="bg-blue-100" />
        <StatCard label="Deployed"         value={totals.deployed}  icon={<CheckCircleIcon className="w-5 h-5 text-green-600" />} color="bg-green-100" />
        <StatCard label="Failed"           value={totals.failed}    icon={<XCircleIcon className="w-5 h-5 text-red-600" />}       color="bg-red-100" />
        <StatCard label="Rejected by QA"   value={totals.rejected}  icon={<XCircleIcon className="w-5 h-5 text-orange-600" />}   color="bg-orange-100" />
        <StatCard label="Sent Back by QA"  value={totals.sent_back} icon={<ArrowPathIcon className="w-5 h-5 text-amber-600" />}  color="bg-amber-100" />
      </div>

      {/* ── Per-User Statistics ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Per-User Statistics</h2>
          <button onClick={loadStats} className="btn-secondary px-3 py-1.5">
            <ArrowPathIcon className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {statsLoading ? (
          <PageLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Name</th>
                  <th className="table-header">Team</th>
                  <th className="table-header">Role</th>
                  <th className="table-header text-right">Raised</th>
                  <th className="table-header text-right">Deployed</th>
                  <th className="table-header text-right">In Progress</th>
                  <th className="table-header text-right">Failed</th>
                  <th className="table-header text-right">Rejected by QA</th>
                  <th className="table-header text-right">Sent Back</th>
                  <th className="table-header text-right">Drafts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.length === 0 ? (
                  <tr><td colSpan={10} className="table-cell text-center text-gray-400 py-8">No users found</td></tr>
                ) : stats.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </td>
                    <td className="table-cell text-gray-600 text-sm">{u.team || <span className="text-gray-300">—</span>}</td>
                    <td className="table-cell">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${roleColor[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <span className="font-semibold text-gray-900">{n(u.total_raised)}</span>
                    </td>
                    <td className="table-cell text-right">
                      <span className={`font-medium ${n(u.deployed) > 0 ? 'text-green-700' : 'text-gray-400'}`}>{n(u.deployed)}</span>
                    </td>
                    <td className="table-cell text-right">
                      <span className={`font-medium ${n(u.in_progress) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{n(u.in_progress)}</span>
                    </td>
                    <td className="table-cell text-right">
                      <span className={`font-medium ${n(u.failed) > 0 ? 'text-red-600' : 'text-gray-400'}`}>{n(u.failed)}</span>
                    </td>
                    <td className="table-cell text-right">
                      <span className={`font-medium ${n(u.rejected_by_qa) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{n(u.rejected_by_qa)}</span>
                    </td>
                    <td className="table-cell text-right">
                      <span className={`font-medium ${n(u.sent_back) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{n(u.sent_back)}</span>
                    </td>
                    <td className="table-cell text-right">
                      <span className={`font-medium ${n(u.drafts) > 0 ? 'text-gray-600' : 'text-gray-400'}`}>{n(u.drafts)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Audit Log ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <h2 className="font-semibold text-gray-900">System Audit Log</h2>
            <div className="flex flex-wrap gap-2">

              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search title or user…"
                  className="form-input pl-8 py-1.5 text-sm w-48"
                />
              </div>

              {/* Action filter */}
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="form-select py-1.5 text-sm w-44"
              >
                <option value="">All Actions</option>
                {ALL_ACTIONS.map((a) => (
                  <option key={a} value={a}>{ACTION_META[a].label}</option>
                ))}
              </select>

              {/* User filter */}
              <select
                value={userFilter}
                onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
                className="form-select py-1.5 text-sm w-40"
              >
                <option value="">All Users</option>
                {stats.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>

              {/* Date range */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="form-input py-1.5 text-sm w-36"
                title="From date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="form-input py-1.5 text-sm w-36"
                title="To date"
              />

              {hasFilters && (
                <button onClick={resetFilters} className="btn-secondary py-1.5 px-3 text-sm">
                  Clear
                </button>
              )}

              <button onClick={loadLogs} className="btn-secondary px-3 py-1.5">
                <ArrowPathIcon className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            {total.toLocaleString()} {total === 1 ? 'entry' : 'entries'}
            {hasFilters && (
              <button onClick={resetFilters} className="ml-2 text-blue-600 hover:text-blue-800 font-medium">
                Clear filters
              </button>
            )}
          </p>
        </div>

        {logsLoading ? (
          <PageLoader />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header whitespace-nowrap">Time</th>
                    <th className="table-header">Req #</th>
                    <th className="table-header">Deployment</th>
                    <th className="table-header">Action</th>
                    <th className="table-header">Performed By</th>
                    <th className="table-header">Status Change</th>
                    <th className="table-header">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.length === 0 ? (
                    <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">No audit entries found</td></tr>
                  ) : logs.map((log) => {
                    const meta = actionMeta(log.action);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell text-xs text-gray-400 whitespace-nowrap" title={formatDateTime(log.created_at)}>
                          {formatRelative(log.created_at)}
                        </td>
                        <td className="table-cell">
                          {log.request_number ? (
                            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {log.request_number}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="table-cell">
                          {log.deployment_id ? (
                            <button
                              onClick={() => navigate(`/deployments/${log.deployment_id}`)}
                              className="text-sm text-blue-700 hover:text-blue-900 hover:underline text-left max-w-[180px] block truncate"
                              title={log.deployment_title}
                            >
                              {log.deployment_title || log.deployment_id}
                            </button>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="table-cell">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="table-cell">
                          {log.performed_by_name ? (
                            <div>
                              <p className="text-sm text-gray-800">{log.performed_by_name}</p>
                              {log.performed_by_role && (
                                <p className="text-xs text-gray-400 uppercase">{log.performed_by_role}</p>
                              )}
                            </div>
                          ) : <span className="text-gray-300 text-xs">System</span>}
                        </td>
                        <td className="table-cell">
                          {(log.old_status || log.new_status) ? (
                            <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                              {log.old_status && <StatusPill status={log.old_status} />}
                              {log.old_status && log.new_status && <span className="text-gray-300">→</span>}
                              {log.new_status && <StatusPill status={log.new_status} />}
                            </div>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="table-cell text-xs text-gray-500 max-w-[200px]">
                          {log.comment ? (
                            <span className="truncate block" title={log.comment}>{log.comment}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary py-1.5 px-2.5 disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary py-1.5 px-2.5 disabled:opacity-40"
                  >
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
