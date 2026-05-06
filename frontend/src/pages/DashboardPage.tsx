import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RocketLaunchIcon, ClockIcon, ServerStackIcon, ExclamationTriangleIcon,
  CheckCircleIcon, FireIcon, BellAlertIcon, DocumentTextIcon,
  PlusIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { deploymentService } from '../services/deployment.service';
import { DashboardStats, DeploymentRequest } from '../types';
import { StatusBadge, PriorityBadge, EnvBadge } from '../components/common/StatusBadge';
import { PageLoader } from '../components/common/LoadingSpinner';
import { useAuthStore } from '../store/authStore';
import { formatRelative } from '../utils/format';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, bgColor, onClick, trend }) => (
  <div
    onClick={onClick}
    className={`card p-5 flex items-start gap-4 ${onClick ? 'cursor-pointer hover:shadow-card-hover transition-shadow' : ''}`}
  >
    <div className={`p-3 rounded-lg ${bgColor} flex-shrink-0`}>
      <div className={`w-6 h-6 ${color}`}>{icon}</div>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<DeploymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsData, listData] = await Promise.all([
          deploymentService.getDashboardStats(),
          deploymentService.getAll({ limit: 8 }),
        ]);
        setStats(statsData);
        setRecent(listData.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <PageLoader />;

  const statCards = stats ? [
    { title: 'Total Deployments',   value: stats.total,                 icon: <RocketLaunchIcon />,       color: 'text-blue-600',   bgColor: 'bg-blue-50',   filter: '' },
    { title: 'Pending QA Approval', value: stats.pending_qa,            icon: <ClockIcon />,               color: 'text-yellow-600', bgColor: 'bg-yellow-50', filter: 'pending_qa_approval' },
    { title: 'Pending Infra',       value: stats.pending_infra,         icon: <ServerStackIcon />,         color: 'text-purple-600', bgColor: 'bg-purple-50', filter: 'pending_infra_deployment' },
    { title: 'Failed Deployments',  value: stats.failed,                icon: <ExclamationTriangleIcon />, color: 'text-red-600',    bgColor: 'bg-red-50',    filter: 'deployment_failed' },
    { title: 'Completed',           value: stats.completed,             icon: <CheckCircleIcon />,         color: 'text-green-600',  bgColor: 'bg-green-50',  filter: 'successfully_completed' },
    { title: 'Critical Priority',   value: stats.critical,              icon: <FireIcon />,                color: 'text-red-600',    bgColor: 'bg-red-50',    filter: '' },
    { title: 'Pending Ack.',        value: stats.pending_acknowledgment,icon: <BellAlertIcon />,           color: 'text-orange-600', bgColor: 'bg-orange-50', filter: 'pending_dev_acknowledgment' },
    { title: 'Drafts',              value: stats.drafts,                icon: <DocumentTextIcon />,color: 'text-gray-500',   bgColor: 'bg-gray-50',   filter: 'draft' },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your deployments today.</p>
        </div>
        {hasRole('dev', 'admin') && (
          <button onClick={() => navigate('/deployments/new')} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            New Deployment
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            bgColor={card.bgColor}
            onClick={card.filter ? () => navigate(`/deployments?status=${card.filter}`) : undefined}
          />
        ))}
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {hasRole('qa', 'admin') && Number(stats?.pending_qa) > 0 && (
          <div className="card p-5 border-l-4 border-yellow-400 bg-yellow-50/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-yellow-800">QA Action Required</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{stats?.pending_qa}</p>
                <p className="text-xs text-yellow-700 mt-1">deployments awaiting QA review</p>
              </div>
              <ClockIcon className="w-8 h-8 text-yellow-500" />
            </div>
            <button onClick={() => navigate('/qa')} className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500 text-white text-sm font-medium rounded-md hover:bg-yellow-600 transition-colors">
              Review Now <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {hasRole('infra', 'admin') && Number(stats?.pending_infra) > 0 && (
          <div className="card p-5 border-l-4 border-purple-400 bg-purple-50/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-800">Infra Action Required</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{stats?.pending_infra}</p>
                <p className="text-xs text-purple-700 mt-1">deployments ready for infra</p>
              </div>
              <ServerStackIcon className="w-8 h-8 text-purple-500" />
            </div>
            <button onClick={() => navigate('/infra')} className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 text-white text-sm font-medium rounded-md hover:bg-purple-600 transition-colors">
              Deploy Now <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {hasRole('dev', 'admin') && Number(stats?.pending_acknowledgment) > 0 && (
          <div className="card p-5 border-l-4 border-orange-400 bg-orange-50/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-800">Acknowledgment Required</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">{stats?.pending_acknowledgment}</p>
                <p className="text-xs text-orange-700 mt-1">deployments need acknowledgment</p>
              </div>
              <BellAlertIcon className="w-8 h-8 text-orange-500" />
            </div>
            <button onClick={() => navigate('/acknowledgments')} className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 transition-colors">
              Acknowledge <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Recent Deployments */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Recent Deployments</h3>
          <button onClick={() => navigate('/deployments')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
            View all <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No deployments yet. Create your first one!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Title</th>
                  <th className="table-header">Project</th>
                  <th className="table-header">Environment</th>
                  <th className="table-header">Priority</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Raised By</th>
                  <th className="table-header">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((dep) => (
                  <tr
                    key={dep.id}
                    onClick={() => navigate(`/deployments/${dep.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="table-cell font-medium text-blue-700 max-w-[200px] truncate">{dep.deployment_title}</td>
                    <td className="table-cell text-gray-600">{dep.project_name}</td>
                    <td className="table-cell"><EnvBadge env={dep.environment} /></td>
                    <td className="table-cell"><PriorityBadge priority={dep.priority} /></td>
                    <td className="table-cell"><StatusBadge status={dep.status} /></td>
                    <td className="table-cell text-gray-600">{dep.raised_by_name}</td>
                    <td className="table-cell text-gray-400 whitespace-nowrap">{formatRelative(dep.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
