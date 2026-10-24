import React, { useState } from 'react';
import {
  HardHat,
  Database,
  CheckCircle2,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  FileCode2,
  RefreshCw,
  FileSpreadsheet,
  Users,
  Menu,
  X
} from 'lucide-react';
import { UserProfile, UserRole, SupabaseConfig } from '../types';
import { PRESET_USERS } from '../services/dataService';

interface NavbarProps {
  currentUser: UserProfile;
  onSwitchRole: (role: UserRole) => void;
  onOpenCloudSetup: () => void;
  onNavigateHome: () => void;
  onNavigateReports?: () => void;
  onNavigateAttendance?: () => void;
  onNavigateUserManagement?: () => void;
  onLogout: () => void;
  supabaseConfig: SupabaseConfig;
  onRefreshData: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchRole,
  onOpenCloudSetup,
  onNavigateHome,
  onNavigateReports,
  onNavigateAttendance,
  onNavigateUserManagement,
  onLogout,
  supabaseConfig,
  onRefreshData,
  isRefreshing = false
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navigateMobile = (callback?: () => void) => {
    callback?.();
    setShowMobileMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#111111] text-white border-b border-[#222222] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4 max-[639px]:gap-2">
          
          {/* Brand Wordmark & Home Link */}
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-3 group text-left transition-opacity hover:opacity-95 shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold shadow-xs transition-transform group-hover:scale-105">
              <HardHat className="w-5 h-5 text-[#111111]" />
            </div>
            <div>
            <div className="flex items-center gap-2 max-[639px]:gap-1">
                <span className="font-bold text-lg tracking-tight text-white font-['Inter',sans-serif]">
                  BUILDPULSE
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#222222] text-[#FFC400] border border-[#333333] max-[639px]:hidden">
                  ERP
                </span>
              </div>
              <p className="text-[11px] text-[#888888] hidden sm:block font-normal">
                Construction Management
              </p>
            </div>
          </button>

          {/* Center/Right Toolbar */}
          <div className="hidden xl:flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Attendance & Worker Groups Navigation Button */}
            {onNavigateAttendance && (
              <button
                onClick={onNavigateAttendance}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#1c1c1c] text-white border border-[#333333] hover:border-[#FFC400] transition-colors"
                title="Manage Worker Groups, Daily Attendance & Wages"
              >
                <Users className="w-3.5 h-3.5 text-[#FFC400]" />
                <span className="hidden sm:inline">Attendance</span>
              </button>
            )}

            {/* Reports & Audits Navigation Button */}
            {onNavigateReports && (
              <button
                onClick={onNavigateReports}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#1c1c1c] text-white border border-[#333333] hover:border-[#FFC400] transition-colors"
                title="View Date Range & Cumulative Inventory Reports"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#FFC400]" />
                <span className="hidden sm:inline">Reports</span>
              </button>
            )}

            {/* User Management & Roles Button (Admin Only) */}
            {currentUser.role === 'admin' && onNavigateUserManagement && (
              <button
                onClick={onNavigateUserManagement}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#1c1c1c] text-white border border-[#333333] hover:border-[#FFC400] transition-colors"
                title="Administrator Console: Manage User Accounts and Site Permissions"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#FFC400]" />
                <span className="hidden md:inline">User Accounts</span>
              </button>
            )}

            {/* Cloud Database Connection Status */}
            <button
              onClick={onOpenCloudSetup}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                supabaseConfig.isConnected
                  ? 'bg-[#1c1c1c] text-white border-[#333333] hover:border-[#FFC400]'
                  : 'bg-[#1c1c1c] text-[#CCCCCC] border-[#333333] hover:border-[#FFC400]'
              }`}
              title="Click to view Supabase Cloud Database settings and SQL schema"
            >
              <Database className="w-3.5 h-3.5 text-[#FFC400]" />
              <span className="hidden md:inline">
                {supabaseConfig.isConnected ? 'Cloud DB Active' : 'Cloud DB Setup'}
              </span>
              <span className="md:hidden">
                {supabaseConfig.isConnected ? 'Active' : 'Setup DB'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseConfig.isConnected ? 'bg-[#FFC400]' : 'bg-[#666666]'
                }`}
              />
            </button>

            {/* Sync / Refresh Button */}
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="p-2 text-[#CCCCCC] hover:text-[#FFC400] rounded-xl hover:bg-[#1f1f1f] transition-colors"
              title="Sync latest inventory and projects"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#FFC400]' : ''}`} />
            </button>

            {/* RBAC Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c1c1c] hover:bg-[#222222] text-white text-xs font-medium border border-[#333333] transition-colors"
                title="Switch simulated staff account to test permissions"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#FFC400]" />
                <span className="hidden sm:inline text-[#888888]">Role:</span>
                <span className="font-semibold text-[#FFC400]">{currentUser.role_title}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#888888]" />
              </button>

              {showRoleMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white text-[#111111] shadow-xl border border-[#E8E8E8] py-2 z-50 animate-in fade-in slide-in-from-top-1"
                  onClick={() => setShowRoleMenu(false)}
                >
                  <div className="px-3.5 py-1.5 border-b border-[#E8E8E8] text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
                    Simulate Staff Role
                  </div>
                  {(Object.keys(PRESET_USERS) as UserRole[]).map((roleKey) => {
                    const u = PRESET_USERS[roleKey];
                    const isSelected = currentUser.role === roleKey;
                    return (
                      <button
                        key={roleKey}
                        onClick={() => onSwitchRole(roleKey)}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#F7F7F7] transition-colors ${
                          isSelected ? 'bg-[#FFC400]/15 text-[#111111] font-semibold' : 'text-[#111111]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-[#111111]">{u.role_title}</div>
                          <div className="text-[11px] text-[#666666]">{u.full_name}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#111111] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[#FFC400] transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-60 rounded-2xl bg-white text-[#111111] shadow-xl border border-[#E8E8E8] py-2 z-50 animate-in fade-in"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="px-4 py-2.5 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#111111]">{currentUser.full_name}</p>
                      {currentUser.user_id && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F7F7F7] border border-[#CCCCCC] text-[#111111]">
                          {currentUser.user_id}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#666666]">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FFC400]/20 text-[#111111] border border-[#FFC400]/50">
                      {currentUser.role_title}
                    </span>
                  </div>
                  <div className="py-1">
                    {currentUser.role === 'admin' && onNavigateUserManagement && (
                      <button
                        onClick={onNavigateUserManagement}
                        className="w-full text-left px-4 py-2 text-xs text-[#111111] hover:bg-[#F7F7F7] flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#FFC400]" />
                        <span>User Accounts & Security</span>
                      </button>
                    )}
                    <button
                      onClick={onOpenCloudSetup}
                      className="w-full text-left px-4 py-2 text-xs text-[#111111] hover:bg-[#F7F7F7] flex items-center gap-2"
                    >
                      <FileCode2 className="w-4 h-4 text-[#666666]" />
                      Cloud Database & SQL Schema
                    </button>
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-semibold"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Compact mobile toolbar and navigation drawer */}
          <div className="flex xl:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowMobileMenu(value => !value)}
              className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-[#1c1c1c] border border-[#333333] text-[#FFC400]"
              aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => setShowMobileMenu(true)}
              className="min-h-11 min-w-11 rounded-full bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold text-xs"
              aria-label="Open account menu"
            >
              {currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="xl:hidden border-t border-[#333333] py-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {onNavigateAttendance && <button type="button" onClick={() => navigateMobile(onNavigateAttendance)} className="min-h-11 rounded-xl bg-[#1c1c1c] border border-[#333333] px-3 text-left text-xs font-semibold"><Users className="inline w-4 h-4 mr-2 text-[#FFC400]" />Attendance</button>}
              {onNavigateReports && <button type="button" onClick={() => navigateMobile(onNavigateReports)} className="min-h-11 rounded-xl bg-[#1c1c1c] border border-[#333333] px-3 text-left text-xs font-semibold"><FileSpreadsheet className="inline w-4 h-4 mr-2 text-[#FFC400]" />Reports</button>}
              {currentUser.role === 'admin' && onNavigateUserManagement && <button type="button" onClick={() => navigateMobile(onNavigateUserManagement)} className="min-h-11 rounded-xl bg-[#1c1c1c] border border-[#333333] px-3 text-left text-xs font-semibold"><ShieldCheck className="inline w-4 h-4 mr-2 text-[#FFC400]" />User Accounts</button>}
              <button type="button" onClick={() => { setShowMobileMenu(false); onOpenCloudSetup(); }} className="min-h-11 rounded-xl bg-[#1c1c1c] border border-[#333333] px-3 text-left text-xs font-semibold"><Database className="inline w-4 h-4 mr-2 text-[#FFC400]" />{supabaseConfig.isConnected ? 'Cloud DB Active' : 'Cloud DB Setup'}</button>
              <button type="button" disabled={isRefreshing} onClick={() => { setShowMobileMenu(false); onRefreshData(); }} className="min-h-11 rounded-xl bg-[#1c1c1c] border border-[#333333] px-3 text-left text-xs font-semibold disabled:opacity-50"><RefreshCw className={`inline w-4 h-4 mr-2 text-[#FFC400] ${isRefreshing ? 'animate-spin' : ''}`} />Refresh data</button>
            </div>
            <div className="rounded-xl border border-[#333333] bg-[#1c1c1c] p-3">
              <p className="text-xs font-semibold text-white">{currentUser.full_name}</p>
              <p className="text-[11px] text-[#888888]">{currentUser.role_title}</p>
              <div className="mt-2 grid grid-cols-1 gap-1">
                {(Object.keys(PRESET_USERS) as UserRole[]).map(roleKey => (
                  <button key={roleKey} type="button" onClick={() => { onSwitchRole(roleKey); setShowMobileMenu(false); }} className={`min-h-10 rounded-lg px-2 text-left text-xs ${currentUser.role === roleKey ? 'bg-[#FFC400]/20 text-[#FFC400]' : 'text-[#CCCCCC] hover:bg-[#222222]'}`}>
                    {PRESET_USERS[roleKey].role_title}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setShowMobileMenu(false); onLogout(); }} className="mt-2 min-h-10 w-full rounded-lg px-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-950/30">Sign Out</button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
