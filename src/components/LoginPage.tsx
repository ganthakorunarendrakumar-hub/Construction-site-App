import React, { useState } from 'react';
import {
  HardHat,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  Users,
  Briefcase,
  DollarSign,
  PackageCheck
} from 'lucide-react';
import { authService } from '../services/authService';
import { UserSession } from '../types';
import { PasswordResetModal } from './PasswordResetModal';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('admin@cheninfra.com');
  const [password, setPassword] = useState('ChenInfra@2026');
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

  const handleQuickFill = (emailOrUserId: string, roleTitle: string) => {
    setIdentifier(emailOrUserId);
    setPassword('ChenInfra@2026');
    setErrorMessage(null);
    setSuccessNotice(`Pre-filled credentials for ${roleTitle}. Click Sign In to log in.`);
  };

  return (
    <div className="min-h-screen bg-bp-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Inter',sans-serif]">
      
      {/* Top Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-bp-navy text-bp-cyan shadow-md mb-4 border border-bp-navy-border">
          <HardHat className="w-8 h-8 text-bp-cyan" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="font-bold text-2xl tracking-tight text-bp-text">
            BUILDPULSE
          </span>
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-bp-cyan text-bp-text font-mono">
            CHEN INFRA ERP
          </span>
        </div>
        <p className="mt-1 text-xs text-bp-muted">
          Construction Management, Workforce Attendance & Materials Ledger
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-bp-border space-y-6">
          
          <div className="border-b border-bp-border pb-4">
            <h2 className="text-xl font-bold text-bp-text tracking-tight">
              Sign In to Your Account
            </h2>
            <p className="text-xs text-bp-muted mt-0.5">
              Enter your registered Email address or unique User ID (e.g., <code className="font-mono text-bp-text font-bold">CHEN-ADM-01</code>)
            </p>
          </div>

          {/* Success Banner */}
          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Failed</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-bp-text mb-1.5">
                Email Address or Unique User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-bp-muted" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="admin@cheninfra.com or CHEN-ADM-01"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs text-bp-text bg-white rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-bp-text">
                  Account Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-[11px] font-semibold text-bp-text hover:text-bp-cyan transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-bp-muted" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-xs text-bp-text bg-white rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-bp-muted hover:text-bp-text"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-bp-text focus:ring-bp-cyan border-bp-border-strong"
                />
                <span className="text-xs text-bp-muted">Keep me signed in (24 hrs)</span>
              </label>

              <div className="flex items-center gap-1 text-[11px] text-bp-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>PBKDF2 SHA-256</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier.trim() || !password}
              className="w-full py-3 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-bp-text" />
                  <span>Verifying Credentials & Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In to CHEN INFRA</span>
                  <ArrowRight className="w-4 h-4 text-bp-text" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins for instant evaluation */}
          <div className="pt-4 border-t border-bp-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-bp-muted uppercase tracking-wider">
                Quick Test Accounts (Click to Fill)
              </p>
              <span className="text-[10px] text-bp-muted font-mono">Password: ChenInfra@2026</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              
              {/* Company Admin */}
              <button
                type="button"
                onClick={() => handleQuickFill('CHEN-ADM-01', 'Company Administrator')}
                className="p-2.5 bg-bp-background hover:bg-bp-cyan/15 hover:border-bp-cyan border border-bp-border rounded-xl text-left transition-all flex items-start gap-2.5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-bp-navy text-bp-cyan flex items-center justify-center font-bold text-xs shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-bp-text truncate group-hover:text-bp-text">
                    Rajesh Sharma (Admin)
                  </p>
                  <p className="text-[10px] text-bp-muted font-mono truncate">
                    ID: CHEN-ADM-01
                  </p>
                </div>
              </button>

              {/* Site Supervisor */}
              <button
                type="button"
                onClick={() => handleQuickFill('CHEN-SUP-02', 'Site Supervisor')}
                className="p-2.5 bg-bp-background hover:bg-bp-cyan/15 hover:border-bp-cyan border border-bp-border rounded-xl text-left transition-all flex items-start gap-2.5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-bp-blue text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-bp-text truncate group-hover:text-bp-text">
                    Ananya Rao (Supervisor)
                  </p>
                  <p className="text-[10px] text-bp-muted font-mono truncate">
                    ID: CHEN-SUP-02 (Skyline Site)
                  </p>
                </div>
              </button>

              {/* Chief Accountant */}
              <button
                type="button"
                onClick={() => handleQuickFill('CHEN-ACC-03', 'Chief Accountant')}
                className="p-2.5 bg-bp-background hover:bg-bp-cyan/15 hover:border-bp-cyan border border-bp-border rounded-xl text-left transition-all flex items-start gap-2.5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-bp-text truncate group-hover:text-bp-text">
                    Kavita S. (Accountant)
                  </p>
                  <p className="text-[10px] text-bp-muted font-mono truncate">
                    ID: CHEN-ACC-03 (Payroll & Ledger)
                  </p>
                </div>
              </button>

              {/* Site Worker */}
              <button
                type="button"
                onClick={() => handleQuickFill('CHEN-WRK-04', 'Site Worker')}
                className="p-2.5 bg-bp-background hover:bg-bp-cyan/15 hover:border-bp-cyan border border-bp-border rounded-xl text-left transition-all flex items-start gap-2.5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-bp-text truncate group-hover:text-bp-text">
                    Daniel Murmu (Worker)
                  </p>
                  <p className="text-[10px] text-bp-muted font-mono truncate">
                    ID: CHEN-WRK-04 (Barbender)
                  </p>
                </div>
              </button>

            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-bp-background rounded-xl border border-bp-border text-[11px] text-bp-muted space-y-1">
            <div className="flex items-center gap-1 font-semibold text-bp-text">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Individual Security Standards</span>
            </div>
            <p>
              Each account has a permanent internal UID, unique User ID, cryptographic salt, and PBKDF2 hash. Passwords are never stored in plaintext. Failed attempts trigger a 15-minute brute-force lockout.
            </p>
          </div>

        </div>
      </div>

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        initialIdentifier={identifier}
        onSuccess={(msg) => {
          setSuccessNotice(msg);
          setErrorMessage(null);
        }}
      />

    </div>
  );
};
