import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon, RocketLaunchIcon, CheckBadgeIcon, ServerStackIcon,
  ClipboardDocumentCheckIcon, ClockIcon, Bars3Icon, XMarkIcon,
  UsersIcon, ChevronLeftIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: number;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      path: '/dashboard',     icon: <HomeIcon className="w-5 h-5" /> },
  { label: 'Deployments',    path: '/deployments',   icon: <RocketLaunchIcon className="w-5 h-5" />, end: true },
  { label: 'New Request',    path: '/deployments/new', icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />, roles: ['dev', 'admin'] },
  { label: 'QA Approvals',   path: '/qa',            icon: <CheckBadgeIcon className="w-5 h-5" />, roles: ['qa', 'admin'] },
  { label: 'Infra Queue',    path: '/infra',         icon: <ServerStackIcon className="w-5 h-5" />, roles: ['infra', 'admin'] },
  { label: 'Acknowledgments',path: '/acknowledgments',icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />, roles: ['dev', 'admin'] },
  { label: 'History',        path: '/history',       icon: <ClockIcon className="w-5 h-5" /> },
  { label: 'User Management',path: '/users',         icon: <UsersIcon className="w-5 h-5" />,       roles: ['admin'] },
  { label: 'Admin Dashboard',path: '/admin',         icon: <ShieldCheckIcon className="w-5 h-5" />, roles: ['admin'] },
];

export const Sidebar: React.FC<{ collapsed: boolean; onToggle: () => void }> = ({ collapsed, onToggle }) => {
  const { user } = useAuthStore();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role || '')
  );

  return (
    <aside className={`flex flex-col bg-[#172B4D] text-white transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'} min-h-screen flex-shrink-0`}>
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-white/10 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">N</div>
            <div>
              <p className="font-bold text-sm leading-tight">Neutara</p>
              <p className="text-xs text-white/50 leading-tight">Deployments</p>
            </div>
          </div>
        )}
        {collapsed && <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">N</div>}
        {!collapsed && (
          <button onClick={onToggle} className="p-1.5 rounded hover:bg-white/10 transition-colors">
            <ChevronLeftIcon className="w-4 h-4 text-white/60" />
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={onToggle} className="flex justify-center py-3 hover:bg-white/10 transition-colors border-b border-white/10">
          <Bars3Icon className="w-5 h-5 text-white/60" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group
              ${isActive
                ? 'bg-blue-600 text-white font-medium'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {user && (
        <div className={`p-3 border-t border-white/10 ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-white/50 uppercase">{user.role}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
