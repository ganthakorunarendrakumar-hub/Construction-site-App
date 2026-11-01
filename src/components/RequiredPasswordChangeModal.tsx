import React, { useState } from 'react';
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react';

interface RequiredPasswordChangeModalProps {
  onSubmit: (password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const RequiredPasswordChangeModal: React.FC<RequiredPasswordChangeModalProps> = ({ onSubmit, onSignOut }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirmPassword) return setError('The passwords do not match.');
    setIsSaving(true);
    try {
      await onSubmit(password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Password could not be changed. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bp-navy-deep/80 p-4">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-bp-border bg-white shadow-2xl" aria-labelledby="required-password-title">
        <div className="flex items-center gap-3 bg-bp-navy px-6 py-5 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bp-cyan text-bp-text"><KeyRound className="h-5 w-5" /></div>
          <div>
            <h1 id="required-password-title" className="text-base font-bold">Set your password</h1>
            <p className="mt-0.5 text-xs text-bp-border-strong">A new password is required before continuing.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <p className="flex items-start gap-2 rounded-xl border border-bp-cyan-border bg-bp-cyan-soft p-3 text-xs leading-relaxed text-bp-navy">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Choose a private password you have not shared. Use at least 8 characters.
          </p>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
          <label className="block text-xs font-semibold text-bp-text">
            New password
            <input autoComplete="new-password" type="password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-bp-border-strong px-3 py-2.5 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-bp-text">
            Confirm new password
            <input autoComplete="new-password" type="password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-bp-border-strong px-3 py-2.5 text-sm" />
          </label>
          <div className="flex items-center justify-between pt-2">
            <button type="button" disabled={isSaving} onClick={() => void onSignOut()} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-bp-muted hover:bg-bp-background disabled:opacity-50"><LogOut className="h-4 w-4" /> Sign out</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-bp-cyan px-4 py-2.5 text-xs font-bold text-bp-text disabled:opacity-50">{isSaving ? 'Updating…' : 'Update password'}</button>
          </div>
        </form>
      </section>
    </div>
  );
};
