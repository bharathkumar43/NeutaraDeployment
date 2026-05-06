import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { ButtonSpinner } from '../components/common/LoadingSpinner';

interface LoginForm { email: string; password: string; }

const DEMO_ACCOUNTS = [
  { role: 'Admin',    email: 'admin@neutara.com',  color: 'bg-red-100 text-red-700 border-red-200' },
  { role: 'Dev',      email: 'dev@neutara.com',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { role: 'QA',       email: 'qa@neutara.com',     color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { role: 'Infra',    email: 'infra@neutara.com',  color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { role: 'Viewer',   email: 'pm@neutara.com',     color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch {
      // api interceptor handles toast
    }
  });

  const fillDemo = (email: string) => {
    setValue('email', email);
    setValue('password', 'Admin@123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#172B4D] via-[#1e3a8a] to-[#0052CC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl shadow-lg mb-4">
            <RocketLaunchIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Neutara</h1>
          <p className="text-blue-200 mt-1 text-sm">Deployment Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-modal p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email Address</label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' },
                })}
                type="email"
                autoComplete="email"
                className="form-input"
                placeholder="you@company.com"
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="form-input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5 text-base" disabled={isLoading}>
              {isLoading ? <ButtonSpinner /> : null}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Demo Access (password: Admin@123)</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => fillDemo(acc.email)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all hover:shadow-sm ${acc.color}`}
                >
                  {acc.role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © 2024 Neutara · Enterprise Deployment Management
        </p>
      </div>
    </div>
  );
};
