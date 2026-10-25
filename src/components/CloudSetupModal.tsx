import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Terminal,
  FileCode,
  HardHat,
  RefreshCw
} from 'lucide-react';
import { SupabaseConfig } from '../types';
import { SUPABASE_SCHEMA_SQL } from '../services/supabaseSchemaSql';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
  onSaveConfig: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  onTestConnection: () => Promise<{ success: boolean; message: string }>;
}

export const CloudSetupModal: React.FC<CloudSetupModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onTestConnection
}) => {
  const [url, setUrl] = useState(config.url || '');
  const [anonKey, setAnonKey] = useState(config.anonKey || '');
  const [activeTab, setActiveTab] = useState<'credentials' | 'sql_migration' | 'setup_guide' | 'checklist'>('credentials');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await onSaveConfig(url, anonKey);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleClose = () => {
    if (isTesting) return;
    setUrl(config.url || '');
    setAnonKey(config.anonKey || '');
    setActiveTab('credentials');
    setTestResult(null);
    setCopiedSql(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl border border-bp-border w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-bp-navy text-white px-6 py-4 flex items-center justify-between border-b border-bp-navy-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-bp-cyan text-bp-text flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cloud Database & Storage</h3>
              <p className="text-xs text-bp-border-strong">PostgreSQL DB &bull; Row Level Security &bull; Multi-Device Sync</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isTesting}
            className="text-bp-border-strong hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Strip */}
        <div className="px-6 py-3 border-b border-bp-border bg-bp-background text-xs flex items-center justify-between text-bp-text">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${config.isConnected ? 'bg-bp-cyan' : 'bg-bp-navy'}`} />
            <span className="font-semibold">
              {config.isConnected ? 'Live Supabase Cloud Connected' : 'Local Storage Mode Active (Optional Cloud Sync)'}
            </span>
          </div>
          <span className="text-[11px] text-bp-muted">
            {config.lastChecked ? `Checked: ${new Date(config.lastChecked).toLocaleTimeString()}` : 'Default persistent storage ready'}
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-bp-border bg-white text-xs font-semibold gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'credentials'
                ? 'border-bp-cyan text-bp-text'
                : 'border-transparent text-bp-muted hover:text-bp-text'
            }`}
          >
            Credentials
          </button>
          <button
            onClick={() => setActiveTab('sql_migration')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sql_migration'
                ? 'border-bp-cyan text-bp-text'
                : 'border-transparent text-bp-muted hover:text-bp-text'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            SQL Schema
          </button>
          <button
            onClick={() => setActiveTab('setup_guide')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'setup_guide'
                ? 'border-bp-cyan text-bp-text'
                : 'border-transparent text-bp-muted hover:text-bp-text'
            }`}
          >
            Setup Guide
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'checklist'
                ? 'border-bp-cyan text-bp-text'
                : 'border-transparent text-bp-muted hover:text-bp-text'
            }`}
          >
            Verified Architecture
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">

          {/* TAB 1: CREDENTIALS */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleTestAndSave} className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-bp-muted leading-relaxed">
                  Enter your Supabase Project URL and Anon Public Key below from your Supabase Dashboard under <strong>Settings &rarr; API</strong>.
                </p>
                <p className="text-[11px] text-bp-muted">
                  Do not paste your service-role secret key. Only use the public <code>anon</code> key.
                </p>
              </div>

              {testResult && (
                <div className="p-3 rounded-xl border border-bp-border bg-bp-background text-xs flex items-start gap-2 text-bp-text">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-bp-text shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-bp-text shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                    Supabase Anon Public API Key
                  </label>
                  <textarea
                    rows={3}
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-bp-border flex items-center justify-between">
                <span className="text-[11px] text-bp-muted">
                  Credentials are preserved locally in browser storage.
                </span>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-5 py-2.5 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Testing Probe...' : 'Save & Test Connection'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SQL MIGRATION */}
          {activeTab === 'sql_migration' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-bp-text">
                    PostgreSQL Schema & Security Policies
                  </h4>
                  <p className="text-[11px] text-bp-muted">
                    Copy and run this SQL script in your Supabase SQL Editor.
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>

              <div className="relative">
                <pre className="bg-bp-navy text-bp-border text-[11px] font-mono p-4 rounded-xl max-h-80 overflow-y-auto leading-relaxed border border-bp-navy-border">
                  {SUPABASE_SCHEMA_SQL}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: STEP BY STEP GUIDE */}
          {activeTab === 'setup_guide' && (
            <div className="space-y-4 text-xs text-bp-text leading-relaxed">
              <div className="p-4 bg-bp-background rounded-xl border border-bp-border space-y-3">
                <h4 className="font-bold text-bp-text text-sm">
                  Configuring your Supabase Cloud Database:
                </h4>
                
                <ol className="space-y-3 list-decimal list-inside text-bp-muted">
                  <li>
                    <strong className="text-bp-text">Create a Supabase Project</strong>:
                    Visit supabase.com, create an organization and start a new project.
                  </li>
                  <li>
                    <strong className="text-bp-text">Execute Schema</strong>:
                    Go to <strong>SQL Editor</strong>, switch to tab 2 in this modal, copy the SQL, paste and click <strong>Run</strong>.
                  </li>
                  <li>
                    <strong className="text-bp-text">Create Storage Bucket</strong>:
                    In Supabase, navigate to <strong>Storage</strong> &rarr; <strong>New Bucket</strong> &rarr; name it <code>construction-docs</code>. Keep it private.
                  </li>
                  <li>
                    <strong className="text-bp-text">Copy API Credentials</strong>:
                    In <strong>Settings &rarr; API</strong>, copy the <strong>Project URL</strong> and <strong>anon key</strong>.
                  </li>
                  <li>
                    <strong className="text-bp-text">Save & Verify</strong>:
                    Paste them into Tab 1 of this modal and test the connection.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: PHASE 1 COMPLIANCE CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-3 text-xs">
              <p className="text-bp-muted">
                All core operational and material modules are active and synced:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-bp-background border border-bp-border rounded-xl space-y-1">
                  <div className="font-bold text-bp-text flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-bp-text" />
                    Company & Projects
                  </div>
                  <p className="text-bp-muted text-[11px]">
                    Editable company name (CHEN INFRA), duplicate code validation, Ongoing & Completed archives.
                  </p>
                </div>

                <div className="p-3 bg-bp-background border border-bp-border rounded-xl space-y-1">
                  <div className="font-bold text-bp-text flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-bp-text" />
                    Cement Module (10+ Brands)
                  </div>
                  <p className="text-bp-muted text-[11px]">
                    Dalmia, UltraTech, Ramco, India Cements, Nagarjuna, Penna, Orient, ACC/Ambuja, JSW, Deccan & custom brands.
                  </p>
                </div>

                <div className="p-3 bg-bp-background border border-bp-border rounded-xl space-y-1">
                  <div className="font-bold text-bp-text flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-bp-text" />
                    Stock Ledger Calculation
                  </div>
                  <p className="text-bp-muted text-[11px]">
                    Available = Opening + Receipts - Returns - Usage - Damaged. Prevention of negative balances.
                  </p>
                </div>

                <div className="p-3 bg-bp-background border border-bp-border rounded-xl space-y-1">
                  <div className="font-bold text-bp-text flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-bp-text" />
                    Staff Accounts & RBAC
                  </div>
                  <p className="text-bp-muted text-[11px]">
                    Role-based permissions for administrators, project managers, engineers, storekeepers, and viewers.
                  </p>
                </div>

                <div className="p-3 bg-bp-background border border-bp-border rounded-xl space-y-1">
                  <div className="font-bold text-bp-text flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-bp-text" />
                    Immutable History & Reversals
                  </div>
                  <p className="text-bp-muted text-[11px]">
                    Running balance per brand, audit trails, server-authoritative timestamps, and admin reversal with reason.
                  </p>
                </div>

                <div className="p-3 bg-bp-background border border-bp-border rounded-xl space-y-1">
                  <div className="font-bold text-bp-text flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-bp-text" />
                    File Uploads & Attachments
                  </div>
                  <p className="text-bp-muted text-[11px]">
                    Invoices, challans, and site photos attachment with size limits, validation, and preview.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-bp-background px-6 py-3 border-t border-bp-border flex justify-end">
          <button
            onClick={handleClose}
            disabled={isTesting}
            className="px-4 py-2 bg-bp-navy text-white font-semibold text-xs rounded-xl hover:bg-bp-navy-deep transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
