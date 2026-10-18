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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl border border-[#E8E8E8] w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between border-b border-[#222222]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFC400] text-[#111111] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cloud Database & Storage</h3>
              <p className="text-xs text-[#AAAAAA]">PostgreSQL DB &bull; Row Level Security &bull; Multi-Device Sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#AAAAAA] hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Strip */}
        <div className="px-6 py-3 border-b border-[#E8E8E8] bg-[#F7F7F7] text-xs flex items-center justify-between text-[#111111]">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${config.isConnected ? 'bg-[#FFC400]' : 'bg-[#111111]'}`} />
            <span className="font-semibold">
              {config.isConnected ? 'Live Supabase Cloud Connected' : 'Local Storage Mode Active (Optional Cloud Sync)'}
            </span>
          </div>
          <span className="text-[11px] text-[#666666]">
            {config.lastChecked ? `Checked: ${new Date(config.lastChecked).toLocaleTimeString()}` : 'Default persistent storage ready'}
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-[#E8E8E8] bg-white text-xs font-semibold gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'credentials'
                ? 'border-[#FFC400] text-[#111111]'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            Credentials
          </button>
          <button
            onClick={() => setActiveTab('sql_migration')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sql_migration'
                ? 'border-[#FFC400] text-[#111111]'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            SQL Schema
          </button>
          <button
            onClick={() => setActiveTab('setup_guide')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'setup_guide'
                ? 'border-[#FFC400] text-[#111111]'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            Setup Guide
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'checklist'
                ? 'border-[#FFC400] text-[#111111]'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
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
                <p className="text-xs text-[#666666] leading-relaxed">
                  Enter your Supabase Project URL and Anon Public Key below from your Supabase Dashboard under <strong>Settings &rarr; API</strong>.
                </p>
                <p className="text-[11px] text-[#666666]">
                  Do not paste your service-role secret key. Only use the public <code>anon</code> key.
                </p>
              </div>

              {testResult && (
                <div className="p-3 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-xs flex items-start gap-2 text-[#111111]">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                    Supabase Anon Public API Key
                  </label>
                  <textarea
                    rows={3}
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-between">
                <span className="text-[11px] text-[#666666]">
                  Credentials are preserved locally in browser storage.
                </span>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-5 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all"
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    PostgreSQL Schema & Security Policies
                  </h4>
                  <p className="text-[11px] text-[#666666]">
                    Copy and run this SQL script in your Supabase SQL Editor.
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>

              <div className="relative">
                <pre className="bg-[#111111] text-[#E8E8E8] text-[11px] font-mono p-4 rounded-xl max-h-80 overflow-y-auto leading-relaxed border border-[#222222]">
                  {SUPABASE_SCHEMA_SQL}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: STEP BY STEP GUIDE */}
          {activeTab === 'setup_guide' && (
            <div className="space-y-4 text-xs text-[#111111] leading-relaxed">
              <div className="p-4 bg-[#F7F7F7] rounded-xl border border-[#E8E8E8] space-y-3">
                <h4 className="font-bold text-[#111111] text-sm">
                  Configuring your Supabase Cloud Database:
                </h4>
                
                <ol className="space-y-3 list-decimal list-inside text-[#666666]">
                  <li>
                    <strong className="text-[#111111]">Create a Supabase Project</strong>:
                    Visit supabase.com, create an organization and start a new project.
                  </li>
                  <li>
                    <strong className="text-[#111111]">Execute Schema</strong>:
                    Go to <strong>SQL Editor</strong>, switch to tab 2 in this modal, copy the SQL, paste and click <strong>Run</strong>.
                  </li>
                  <li>
                    <strong className="text-[#111111]">Create Storage Bucket</strong>:
                    In Supabase, navigate to <strong>Storage</strong> &rarr; <strong>New Bucket</strong> &rarr; name it <code>construction-docs</code>. Keep it private.
                  </li>
                  <li>
                    <strong className="text-[#111111]">Copy API Credentials</strong>:
                    In <strong>Settings &rarr; API</strong>, copy the <strong>Project URL</strong> and <strong>anon key</strong>.
                  </li>
                  <li>
                    <strong className="text-[#111111]">Save & Verify</strong>:
                    Paste them into Tab 1 of this modal and test the connection.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: PHASE 1 COMPLIANCE CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-3 text-xs">
              <p className="text-[#666666]">
                All core operational and material modules are active and synced:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl space-y-1">
                  <div className="font-bold text-[#111111] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                    Company & Projects
                  </div>
                  <p className="text-[#666666] text-[11px]">
                    Editable company name (CHEN INFRA), duplicate code validation, Ongoing & Completed archives.
                  </p>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl space-y-1">
                  <div className="font-bold text-[#111111] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                    Cement Module (10+ Brands)
                  </div>
                  <p className="text-[#666666] text-[11px]">
                    Dalmia, UltraTech, Ramco, India Cements, Nagarjuna, Penna, Orient, ACC/Ambuja, JSW, Deccan & custom brands.
                  </p>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl space-y-1">
                  <div className="font-bold text-[#111111] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                    Stock Ledger Calculation
                  </div>
                  <p className="text-[#666666] text-[11px]">
                    Available = Opening + Receipts - Returns - Usage - Damaged. Prevention of negative balances.
                  </p>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl space-y-1">
                  <div className="font-bold text-[#111111] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                    Staff Accounts & RBAC
                  </div>
                  <p className="text-[#666666] text-[11px]">
                    Company Admin, Project Manager, Site Engineer, Storekeeper, Management Viewer with instant role switcher.
                  </p>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl space-y-1">
                  <div className="font-bold text-[#111111] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                    Immutable History & Reversals
                  </div>
                  <p className="text-[#666666] text-[11px]">
                    Running balance per brand, audit trails, server-authoritative timestamps, and admin reversal with reason.
                  </p>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl space-y-1">
                  <div className="font-bold text-[#111111] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                    File Uploads & Attachments
                  </div>
                  <p className="text-[#666666] text-[11px]">
                    Invoices, challans, and site photos attachment with size limits, validation, and preview.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#F7F7F7] px-6 py-3 border-t border-[#E8E8E8] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#111111] text-white font-semibold text-xs rounded-xl hover:bg-black transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
