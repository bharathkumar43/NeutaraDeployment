import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  PlusIcon, UsersIcon, PencilSquareIcon, NoSymbolIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { authService } from '../services/auth.service';
import { User } from '../types';
import { Modal } from '../components/common/Modal';
import { PageLoader, ButtonSpinner } from '../components/common/LoadingSpinner';

interface AddUserForm { name: string; email: string; role: string; team: string; }
interface EditUserForm { role: string; team: string; }

const ROLE_BADGES: Record<string, string> = {
  admin:  'bg-red-100 text-red-700',
  dev:    'bg-blue-100 text-blue-700',
  qa:     'bg-yellow-100 text-yellow-700',
  infra:  'bg-purple-100 text-purple-700',
  viewer: 'bg-gray-100 text-gray-600',
};

const ROLES = ['dev', 'qa', 'infra', 'admin', 'viewer'];

export const UserManagementPage: React.FC = () => {
  const [users, setUsers]               = useState<(User & { is_active?: boolean; auth_type?: string })[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser]   = useState<(User & { is_active?: boolean }) | null>(null);
  const [submitting, setSubmitting]     = useState(false);

  const addForm  = useForm<AddUserForm>();
  const editForm = useForm<EditUserForm>();

  const loadUsers = () => {
    authService.getUsers().then((data) => { setUsers(data as typeof users); setLoading(false); });
  };

  useEffect(() => { loadUsers(); }, []);

  const onAddUser = addForm.handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      const user = await authService.createUser(data);
      setUsers((prev) => [...prev, user as typeof users[0]]);
      toast.success(`User "${data.name}" added — they can now sign in with Microsoft`);
      setShowAddModal(false);
      addForm.reset();
    } catch {
      // api interceptor handles toast
    } finally { setSubmitting(false); }
  });

  const openEdit = (user: typeof users[0]) => {
    editForm.setValue('role', user.role);
    editForm.setValue('team', user.team || '');
    setEditingUser(user);
  };

  const onEditUser = editForm.handleSubmit(async (data) => {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const updated = await authService.updateUser(editingUser.id, data);
      setUsers((prev) => prev.map((u) => u.id === editingUser.id ? { ...u, ...updated } : u));
      toast.success('User updated successfully');
      setEditingUser(null);
    } catch {
      // api interceptor handles toast
    } finally { setSubmitting(false); }
  });

  const toggleActive = async (user: typeof users[0]) => {
    const next = !user.is_active;
    try {
      await authService.updateUser(user.id, { is_active: next });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: next } : u));
      toast.success(next ? `${user.name} re-activated` : `${user.name} deactivated`);
    } catch {
      // api interceptor handles toast
    }
  };

  if (loading) return <PageLoader />;

  const activeCount   = users.filter((u) => u.is_active !== false).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><UsersIcon className="w-4 h-4" /> {activeCount} active</span>
          {inactiveCount > 0 && <span className="text-gray-400">{inactiveCount} inactive</span>}
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Name</th>
                <th className="table-header">Email</th>
                <th className="table-header">Role</th>
                <th className="table-header">Team</th>
                <th className="table-header">Auth</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.is_active === false ? 'opacity-50' : ''}`}>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600">{u.email}</td>
                  <td className="table-cell">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGES[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500">{u.team || '—'}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.auth_type === 'password' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {u.auth_type === 'password' ? 'Password' : 'Microsoft SSO'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit role / team"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        className={`p-1.5 rounded transition-colors ${u.is_active !== false ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                        title={u.is_active !== false ? 'Deactivate user' : 'Re-activate user'}
                      >
                        {u.is_active !== false ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); addForm.reset(); }}
        title="Add User"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowAddModal(false); addForm.reset(); }} className="btn-secondary">Cancel</button>
            <button onClick={onAddUser} className="btn-primary" disabled={submitting}>
              {submitting ? <ButtonSpinner /> : <PlusIcon className="w-4 h-4" />} Add User
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-sm bg-blue-50 rounded-lg px-4 py-3 space-y-1">
            <p className="font-semibold text-blue-800">Only add users who need QA or Infra access.</p>
            <p className="text-blue-600">All other <span className="font-medium">@cloudfuze.com</span> employees automatically get <span className="font-medium">Dev</span> access when they first sign in with Microsoft.</p>
          </div>

          <div>
            <label className="form-label">Full Name <span className="text-red-500">*</span></label>
            <input {...addForm.register('name', { required: 'Required' })} className="form-input" placeholder="John Doe" />
            {addForm.formState.errors.name && <p className="form-error">{addForm.formState.errors.name.message}</p>}
          </div>

          <div>
            <label className="form-label">Email <span className="text-red-500">*</span></label>
            <input
              {...addForm.register('email', {
                required: 'Required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
              })}
              className="form-input"
              placeholder="john@cloudfuze.com"
              type="email"
            />
            {addForm.formState.errors.email && <p className="form-error">{addForm.formState.errors.email.message}</p>}
          </div>

          <div>
            <label className="form-label">Department / Role <span className="text-red-500">*</span></label>
            <select {...addForm.register('role', { required: 'Required' })} className="form-select">
              <option value="">Select department...</option>
              {ROLES.map((r) => (
                <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            {addForm.formState.errors.role && <p className="form-error">{addForm.formState.errors.role.message}</p>}
          </div>

          <div>
            <label className="form-label">Team</label>
            <input {...addForm.register('team')} className="form-input" placeholder="e.g. Backend Development" />
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit — ${editingUser?.name}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditingUser(null)} className="btn-secondary">Cancel</button>
            <button onClick={onEditUser} className="btn-primary" disabled={submitting}>
              {submitting ? <ButtonSpinner /> : null} Save Changes
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Department / Role <span className="text-red-500">*</span></label>
            <select {...editForm.register('role', { required: 'Required' })} className="form-select">
              {ROLES.map((r) => (
                <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Team</label>
            <input {...editForm.register('team')} className="form-input" placeholder="e.g. QA Automation" />
          </div>
        </div>
      </Modal>
    </div>
  );
};
