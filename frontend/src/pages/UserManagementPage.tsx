import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import { authService } from '../services/auth.service';
import { User } from '../types';
import { Modal } from '../components/common/Modal';
import { PageLoader, ButtonSpinner } from '../components/common/LoadingSpinner';

interface CreateUserForm {
  name: string; email: string; password: string; role: string; team: string;
}

const ROLE_BADGES: Record<string, string> = {
  admin: 'bg-red-100 text-red-700', dev: 'bg-blue-100 text-blue-700',
  qa: 'bg-yellow-100 text-yellow-700', infra: 'bg-purple-100 text-purple-700', viewer: 'bg-gray-100 text-gray-600',
};

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateUserForm>();

  useEffect(() => {
    authService.getUsers().then((data) => { setUsers(data); setLoading(false); });
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      const user = await authService.createUser(data);
      setUsers((prev) => [...prev, user]);
      toast.success(`User "${data.name}" created successfully`);
      setShowModal(false); reset();
    } finally { setSubmitting(false); }
  });

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <UsersIcon className="w-5 h-5" /> {users.length} users registered
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Name</th>
                <th className="table-header">Email</th>
                <th className="table-header">Role</th>
                <th className="table-header">Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
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
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGES[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                  </td>
                  <td className="table-cell text-gray-500">{u.team || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset(); }} title="Add New User" size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowModal(false); reset(); }} className="btn-secondary">Cancel</button>
            <button onClick={onSubmit} className="btn-primary" disabled={submitting}>
              {submitting ? <ButtonSpinner /> : <PlusIcon className="w-4 h-4" />} Create User
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div><label className="form-label">Full Name <span className="text-red-500">*</span></label>
            <input {...register('name', { required: 'Required' })} className="form-input" placeholder="John Doe" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div><label className="form-label">Email <span className="text-red-500">*</span></label>
            <input {...register('email', { required: 'Required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })} className="form-input" placeholder="john@company.com" type="email" />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>
          <div><label className="form-label">Password <span className="text-red-500">*</span></label>
            <input {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} className="form-input" type="password" placeholder="••••••••" />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>
          <div><label className="form-label">Role <span className="text-red-500">*</span></label>
            <select {...register('role', { required: 'Required' })} className="form-select">
              <option value="">Select role...</option>
              {['dev','qa','infra','admin','viewer'].map((r) => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
            {errors.role && <p className="form-error">{errors.role.message}</p>}
          </div>
          <div><label className="form-label">Team</label>
            <input {...register('team')} className="form-input" placeholder="e.g. Backend Development" />
          </div>
        </div>
      </Modal>
    </div>
  );
};
