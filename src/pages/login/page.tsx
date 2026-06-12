import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const { login, resetPassword, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const [showSetup, setShowSetup] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    supabase
      .from('admin_users')
      .select('id')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setShowSetup(true);
        }
        setCheckingSetup(false);
      })
      .catch(() => {
        setShowSetup(true);
        setCheckingSetup(false);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid email or password');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    setSetupLoading(true);

    if (!setupEmail.trim() || !setupPassword.trim()) {
      setSetupError('Please fill in all fields');
      setSetupLoading(false);
      return;
    }

    if (setupPassword.length < 6) {
      setSetupError('Password must be at least 6 characters');
      setSetupLoading(false);
      return;
    }

    try {
      const response = await fetch(
        'https://itqdnfincychgficygod.supabase.co/functions/v1/setup-admin',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: setupEmail, password: setupPassword }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSetupSuccess(true);
        setEmail(setupEmail);
        setShowSetup(false);
      } else {
        setSetupError(data.error || 'Failed to create admin account');
      }
    } catch {
      setSetupError('Unable to connect. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');

    if (!resetEmail.trim()) {
      setResetError('Please enter your email');
      return;
    }

    const result = await resetPassword(resetEmail);
    if (result.success) {
      setResetMessage('Password reset link sent to your email');
    } else {
      setResetError(result.error || 'Reset failed');
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50">
        <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <i className="ri-mail-ai-line text-2xl text-white"></i>
            </div>
            <h1 className="text-2xl font-semibold text-foreground-950 font-heading">
              AI Email Copilot
            </h1>
            <p className="text-sm text-foreground-600 mt-1.5">
              {showReset ? 'Reset your password' : showSetup ? 'Set up your admin account' : 'Sign in to your workspace'}
            </p>
          </div>

          {showReset ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
              {resetError && (
                <p className="text-sm text-red-600">{resetError}</p>
              )}
              {resetMessage && (
                <p className="text-sm text-green-600">{resetMessage}</p>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {authLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReset(false);
                  setResetError('');
                  setResetMessage('');
                }}
                className="w-full text-sm text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer"
              >
                Back to sign in
              </button>
            </form>
          ) : showSetup ? (
            <form onSubmit={handleSetup} className="space-y-4">
              {setupSuccess && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm text-green-700">Admin account created! You can now sign in below.</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-2.5 rounded-lg border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
              {setupError && (
                <p className="text-sm text-red-600">{setupError}</p>
              )}
              <button
                type="submit"
                disabled={setupLoading}
                className="w-full py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {setupLoading ? 'Creating...' : 'Create Admin Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-lg border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-lg border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="w-full text-sm text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </form>
          )}

          {!showSetup && (
            <div className="mt-4 pt-4 border-t border-background-100">
              <button
                type="button"
                onClick={() => {
                  setShowSetup(true);
                  setShowReset(false);
                }}
                className="w-full text-sm text-foreground-400 hover:text-foreground-600 transition-colors cursor-pointer"
              >
                First time? Create admin account
              </button>
            </div>
          )}

          {showSetup && (
            <div className="mt-4 pt-4 border-t border-background-100">
              <button
                type="button"
                onClick={() => setShowSetup(false)}
                className="w-full text-sm text-foreground-400 hover:text-foreground-600 transition-colors cursor-pointer"
              >
                Already have an account? Sign in
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-foreground-400 mt-6">
          Secure internal workspace &middot; Authorized access only
        </p>
      </div>
    </div>
  );
}