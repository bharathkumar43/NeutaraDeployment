import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithCode, isAuthenticated } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invoke and back-navigation
    if (attempted.current) return;
    if (isAuthenticated) { navigate('/dashboard', { replace: true }); return; }
    attempted.current = true;

    const params           = new URLSearchParams(window.location.search);
    const code             = params.get('code');
    const state            = params.get('state');
    const errorParam       = params.get('error');
    const errorDescription = params.get('error_description');

    // Microsoft returned an error (e.g. user cancelled)
    if (errorParam) {
      setErrorMsg(errorDescription ?? 'Microsoft sign-in was cancelled or failed.');
      return;
    }

    if (!code) {
      navigate('/login', { replace: true });
      return;
    }

    // Verify the state to prevent CSRF attacks
    const savedState = sessionStorage.getItem('azure_oauth_state');
    sessionStorage.removeItem('azure_oauth_state');
    if (state !== savedState) {
      setErrorMsg('Security check failed. Please try signing in again.');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;

    loginWithCode(code, redirectUri)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => navigate('/login', { replace: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#172B4D] via-[#1e3a8a] to-[#0052CC] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-modal p-8 max-w-md w-full text-center space-y-4">
          <p className="text-red-600 font-medium">{errorMsg}</p>
          <button onClick={() => navigate('/login', { replace: true })} className="btn-primary">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#172B4D] via-[#1e3a8a] to-[#0052CC] flex items-center justify-center">
      <div className="text-center text-white space-y-4">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-lg font-medium">Completing sign-in...</p>
        <p className="text-blue-200 text-sm">Verifying your Microsoft account</p>
      </div>
    </div>
  );
};
