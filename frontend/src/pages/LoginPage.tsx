import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon, RocketLaunchIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { ButtonSpinner } from '../components/common/LoadingSpinner';

interface AdminLoginForm { email: string; password: string; }

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const [azureLoading, setAzureLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginForm>();

  const handleMicrosoftLogin = () => {
    setAzureLoading(true);
    const state = crypto.randomUUID();
    sessionStorage.setItem('azure_oauth_state', state);
    const TENANT_ID = '66d8848d-26b6-4147-8124-127624d7b3a6';
    const CLIENT_ID = '861e696d-f41c-41ee-a7c2-c838fd185d6d';
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_mode: 'query',
      scope: 'openid profile email',
      state,
    });
    window.location.href = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`;
  };

  const handleAdminLogin = handleSubmit(async ({ email, password }) => {
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch {
      // api interceptor handles the toast
    }
  });

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
          <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">Sign in to your account</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Use your CloudFuze Microsoft account</p>

          {/* Microsoft SSO Button */}
          <button
            onClick={handleMicrosoftLogin}
            disabled={azureLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-blue-400 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {azureLoading ? (
              <ButtonSpinner />
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
            )}
            {azureLoading ? 'Signing in with Microsoft...' : 'Sign in with Microsoft'}
          </button>


          {/* Admin login toggle */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAdminLogin((v) => !v)}
              className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span>Admin sign-in</span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${showAdminLogin ? 'rotate-180' : ''}`} />
            </button>

            {showAdminLogin && (
              <form onSubmit={handleAdminLogin} className="mt-4 space-y-4">
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
                    placeholder="admin@neutara.com"
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

                <button
                  type="submit"
                  className="btn-primary w-full justify-center py-2.5 text-base"
                  disabled={isLoading}
                >
                  {isLoading ? <ButtonSpinner /> : null}
                  {isLoading ? 'Signing in...' : 'Sign In as Admin'}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © 2026 Neutara · Enterprise Deployment Management
        </p>
      </div>
    </div>
  );
};
