import React, { useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw, Mail, User } from 'lucide-react';
import { authService } from '../services/authService';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  initialIdentifier?: string;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialIdentifier = ''
}) => {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [resetCode, setResetCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authService.requestPasswordReset(identifier);
      setGeneratedCode(res.resetCode);
      setEmailHint(res.emailHint);
      setResetCode(res.resetCode); // Pre-fill for demonstration convenience in preview
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.completePasswordReset(identifier, resetCode, newPassword);
      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bp-navy-deep/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-bp-border overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-bp-navy text-white px-6 py-4 flex items-center justify-between border-b border-bp-navy-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-bp-cyan text-bp-text flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4 text-bp-text" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Reset Account Password</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { if (!isLoading) onClose(); }}
            disabled={isLoading}
            className="text-bp-muted hover:text-white p-1 rounded-lg hover:bg-bp-navy-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <p className="text-xs text-bp-muted">
                Enter your registered <strong>Email Address</strong> or unique <strong>User ID</strong>. A secure 6-digit verification code will be generated.
              </p>

              <div>
                <label className="block text-xs font-semibold text-bp-text mb-1.5">
                  Email Address or User ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-bp-muted absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs text-bp-text bg-white rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { if (!isLoading) onClose(); }}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-bp-muted hover:bg-bp-background rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !identifier.trim()}
                  className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Get Verification Code</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCompleteReset} className="space-y-4">
              {/* Notice with verification code */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Security Verification Code</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  A verification code has been dispatched for <strong>{emailHint}</strong>.
                </p>
                {generatedCode && (
                  <div className="mt-1 flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                    <span className="text-[11px] text-bp-muted font-medium">Your 6-Digit Code:</span>
                    <span className="font-mono text-base font-bold text-bp-text tracking-widest bg-amber-100 px-2 py-0.5 rounded">
                      {generatedCode}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-bp-text mb-1">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3 py-2 text-center text-base tracking-widest bp-numeric font-bold text-bp-text bg-white rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-bp-text mb-1">
                  New Password (min. 8 characters, letters & digits)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-bp-text bg-white rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-bp-text mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-bp-text bg-white rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-xs font-semibold text-bp-muted hover:text-bp-text"
                >
                  &larr; Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !resetCode.trim() || newPassword.length < 8}
                  className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Hashing & Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save New Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
