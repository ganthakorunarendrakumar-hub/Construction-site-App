import React, { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, HardHat, LoaderCircle, ShieldCheck } from 'lucide-react';
import { authService } from '../services/authService';

interface RecoveryStatus {
  available: boolean;
  message?: string;
}

export const LocalAdminRecoveryPage: React.FC = () => {
  const [status, setStatus] = useState<RecoveryStatus | null>(null);
  const [fullName, setFullName] = useState('');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdIdentity, setCreatedIdentity] = useState<{ userId: string; email: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    void authService.getLocalAdminRecoveryStatus().then(result => {
      if (isMounted) setStatus(result);
    });
    return () => { isMounted = false; };
  }, []);

  const returnToSignIn = () => {
    window.location.assign(`${window.location.pathname}${window.location.search}`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    if (password !== confirmPassword) {
      setErrorMessage('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const account = await authService.recoverLocalAdministrator({
        full_name: fullName,
        user_id: userId,
        email,
        password
      });
      setCreatedIdentity({ userId: account.user_id, email: account.email });
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Local administrator recovery failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bp-background px-4 py-8 sm:px-6">
      <section className="w-full max-w-xl rounded-2xl border border-bp-border bg-white p-6 shadow-xl sm:p-8">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-bp-navy text-bp-cyan shadow-sm">
            <HardHat className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold tracking-[0.18em] text-bp-navy">BUILDPULSE</p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-bp-text">Local administrator recovery</h1>
          <p className="mt-2 text-sm text-bp-muted">
            Create one local administrator account after confirming the request in the project terminal.
          </p>
        </header>

        <div className="mb-5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-sm text-sky-950">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-bp-blue" aria-hidden="true" />
          <p>
            This recovery is available only from the loopback development server. Your password stays in this browser
            and is saved as the app’s existing PBKDF2 hash. The terminal owner must approve the request.
          </p>
        </div>

        {status === null && (
          <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-bp-border bg-bp-background p-3 text-sm text-bp-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking local recovery availability…
          </div>
        )}

        {status && !status.available && (
          <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <p>{status.message || 'Local recovery is unavailable.'}</p>
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <p>{errorMessage}</p>
          </div>
        )}

        {createdIdentity ? (
          <div role="status" className="space-y-5">
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="font-semibold">Administrator account created</p>
                <p className="mt-1">User ID: {createdIdentity.userId}</p>
                <p>Email: {createdIdentity.email}</p>
                <p className="mt-2">Return to the normal sign-in page and use the password you just set.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={returnToSignIn}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-bp-navy px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-bp-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Return to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="recovery-full-name" className="mb-1.5 block text-sm font-medium text-bp-text">Full name</label>
                <input
                  id="recovery-full-name"
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  required
                  value={fullName}
                  onChange={event => setFullName(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-bp-border-strong bg-white px-3.5 py-3 text-sm text-bp-text focus:border-bp-blue focus:outline-none focus:ring-2 focus:ring-bp-blue/15"
                />
              </div>
              <div>
                <label htmlFor="recovery-user-id" className="mb-1.5 block text-sm font-medium text-bp-text">User ID</label>
                <input
                  id="recovery-user-id"
                  type="text"
                  autoComplete="username"
                  minLength={3}
                  maxLength={40}
                  pattern="[A-Za-z0-9._-]{3,40}"
                  required
                  value={userId}
                  onChange={event => setUserId(event.target.value.toUpperCase())}
                  className="min-h-12 w-full rounded-xl border border-bp-border-strong bg-white px-3.5 py-3 text-sm text-bp-text focus:border-bp-blue focus:outline-none focus:ring-2 focus:ring-bp-blue/15"
                />
              </div>
            </div>

            <div>
              <label htmlFor="recovery-email" className="mb-1.5 block text-sm font-medium text-bp-text">Email address</label>
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-bp-border-strong bg-white px-3.5 py-3 text-sm text-bp-text focus:border-bp-blue focus:outline-none focus:ring-2 focus:ring-bp-blue/15"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="recovery-password" className="mb-1.5 block text-sm font-medium text-bp-text">New password</label>
                <input
                  id="recovery-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-bp-border-strong bg-white px-3.5 py-3 text-sm text-bp-text focus:border-bp-blue focus:outline-none focus:ring-2 focus:ring-bp-blue/15"
                />
                <p className="mt-1.5 text-xs text-bp-muted">Use 12–128 characters. The password is never sent to the recovery server.</p>
              </div>
              <div>
                <label htmlFor="recovery-confirm-password" className="mb-1.5 block text-sm font-medium text-bp-text">Confirm new password</label>
                <input
                  id="recovery-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-bp-border-strong bg-white px-3.5 py-3 text-sm text-bp-text focus:border-bp-blue focus:outline-none focus:ring-2 focus:ring-bp-blue/15"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!status?.available || isSubmitting}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-bp-navy px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-bp-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              {isSubmitting ? 'Waiting for terminal approval…' : 'Create one administrator account'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
};
