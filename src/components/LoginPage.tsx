import React, { useState } from 'react';
import {
  HardHat,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { authService } from '../services/authService';
import { UserSession } from '../types';
import { PasswordResetModal } from './PasswordResetModal';
import { LocalAdminRecoveryPage } from './LocalAdminRecoveryPage';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);
    setIsLoading(true);

    try {
      const session = await authService.login(identifier, password, rememberMe);
      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  if (
    import.meta.env.DEV === true &&
    import.meta.env.MODE === 'local-recovery' &&
    window.location.hash === '#local-admin-recovery'
  ) {
    return <LocalAdminRecoveryPage />;
  }

  return (
    <main className="bp-login-shell flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        <section className="bp-login-panel rounded-2xl border border-bp-border p-6 sm:p-8">
          <header className="mb-7 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-bp-navy text-bp-cyan shadow-sm">
              <HardHat className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold tracking-[0.18em] text-bp-navy">BUILDPULSE</p>
            <p className="mt-1 text-xs text-bp-muted">Chen Infra ERP</p>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-bp-text">Sign in to BuildPulse</h1>
            <p className="mt-2 text-sm text-bp-muted">Sign in with your registered email or User ID.</p>
          </header>

          {successNotice && (
            <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>{successNotice}</span>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <div>
                <p className="font-semibold">Sign-in failed</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
            <div>
              <label htmlFor="login-identifier" className="mb-1.5 block text-sm font-medium text-bp-text">
                Email Address or User ID
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bp-muted" aria-hidden="true" />
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-bp-border-strong bg-white py-3 pl-10 pr-3.5 text-sm text-bp-text focus:border-bp-blue focus:outline-none focus:ring-2 focus:ring-bp-blue/15"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="login-password" className="block text-sm font-medium text-bp-text">Password</label>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="rounded text-sm font-semibold text-bp-blue hover:text-bp-navy focus-visible:outline-offset-2"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bp-muted" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-bp-border-strong bg-white py-3 pl-10 pr-12 text-sm text-bp-text focus:border-bp-blue focus:outline-none focus:ring-2 focus:ring-bp-blue/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-xl text-bp-muted hover:text-bp-navy focus-visible:outline-offset-[-3px]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <label htmlFor="remember-me" className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-bp-muted">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-bp-border-strong accent-bp-cyan focus-visible:ring-2 focus-visible:ring-bp-blue"
              />
              <span>Keep me signed in</span>
            </label>

            <button
              type="submit"
              disabled={isLoading || !identifier.trim() || !password}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-bp-navy px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-bp-navy-light focus-visible:ring-2 focus-visible:ring-bp-cyan focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

        </section>
      </div>

      <PasswordResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        initialIdentifier={identifier}
        onSuccess={msg => {
          setSuccessNotice(msg);
          setErrorMessage(null);
        }}
      />
    </main>
  );
};
