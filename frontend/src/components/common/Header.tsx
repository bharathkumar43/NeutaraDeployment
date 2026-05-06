import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BellIcon, MagnifyingGlassIcon, ArrowRightOnRectangleIcon,
  UserCircleIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { notificationService } from '../../services/deployment.service';
import { Notification } from '../../types';
import { formatRelative } from '../../utils/format';
import toast from 'react-hot-toast';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/deployments': 'Deployments',
  '/deployments/new': 'New Deployment Request',
  '/qa': 'QA Approvals',
  '/infra': 'Infrastructure Queue',
  '/acknowledgments': 'Pending Acknowledgments',
  '/history': 'Deployment History',
  '/users': 'User Management',
};

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[location.pathname]
    || (location.pathname.includes('/deployments/') ? 'Deployment Details' : 'Neutara');

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try { setUnreadCount(await notificationService.getUnreadCount()); } catch {}
  };

  const loadNotifications = async () => {
    try { setNotifications(await notificationService.getAll()); } catch {}
  };

  const handleBellClick = () => {
    if (!showNotifications) loadNotifications();
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const markAllRead = async () => {
    await notificationService.markAllRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const NOTIF_COLORS = { info: 'bg-blue-100', success: 'bg-green-100', warning: 'bg-yellow-100', error: 'bg-red-100' };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-40">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
        <p className="text-xs text-gray-400 capitalize">{user?.team || user?.role}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button onClick={handleBellClick} className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors">
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-modal border border-gray-200 z-50 animate-slide-up overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800">Mark all read</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
                ) : notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => { if (n.deployment_id) navigate(`/deployments/${n.deployment_id}`); setShowNotifications(false); }}
                    className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${NOTIF_COLORS[n.type]}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatRelative(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-700 leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-400 uppercase leading-tight">{user?.role}</p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-modal border border-gray-200 z-50 animate-slide-up overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="p-1">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
