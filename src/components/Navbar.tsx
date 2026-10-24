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
  Building2,
  Home,
  Menu,
  X
} from 'lucide-react';
import { UserProfile, UserRole, SupabaseConfig } from '../types';
import { PRESET_USERS } from '../services/dataService';

interface NavbarProps {
  currentUser: UserProfile;
  activeView: string;
  onSwitchRole: (role: UserRole) => void;
  onOpenCloudSetup: () => void;
  onNavigateHome: () => void;
  onNavigateProjects?: () => void;
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
  activeView,
  onSwitchRole,
  onOpenCloudSetup,
  onNavigateHome,
  onNavigateProjects,
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

  const isActive = (section: 'home' | 'projects' | 'attendance' | 'reports' | 'user_management') => {
    if (section === 'home') return activeView === 'home';
    if (section === 'projects') {
      return [
        'ongoing_projects', 'completed_projects', 'project_workspace', 'cement_module',
        'steel_module', 'sand_module', 'bricks_module', 'aggregate_module',
        'category_module', 'vehicle_hire', 'machinery_hire'
      ].includes(activeView);
    }
    return activeView === section;
  };

  const navButtonClass = (section: 'home' | 'projects' | 'attendance' | 'reports' | 'user_management') =>
    `flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-bp-cyan ${
      isActive(section)
        ? 'bg-white/15 text-white border-white/20'
        : 'bg-transparent text-slate-200 border-transparent hover:bg-white/10 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-bp-navy text-white border-b border-bp-navy-border shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4 max-[639px]:gap-2">
          
          {/* Brand Wordmark & Home Link */}
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-3 group text-left transition-opacity hover:opacity-95 shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-bp-cyan text-bp-text flex items-center justify-center font-bold shadow-xs transition-transform group-hover:scale-105">
              <HardHat className="w-5 h-5 text-bp-text" />
            </div>
            <div>
            <div className="flex items-center gap-2 max-[639px]:gap-1">
                <span className="font-bold text-lg tracking-tight text-white font-['Inter',sans-serif]">
                  BUILDPULSE
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-bp-navy-light text-bp-cyan border border-bp-navy-border max-[639px]:hidden">
                  ERP
                </span>
              </div>
              <p className="text-[11px] text-bp-border-strong hidden sm:block font-normal">
                Construction Management
              </p>
            </div>
          </button>

          {/* Center/Right Toolbar */}
          <div className="hidden xl:flex items-center gap-2 sm:gap-3 shrink-0">

            <button
              type="button"
              onClick={onNavigateHome}
              className={navButtonClass('home')}
              aria-current={isActive('home') ? 'page' : undefined}
            >
              <Home className="w-3.5 h-3.5 text-bp-cyan" />
              <span>Home</span>
            </button>

            {onNavigateProjects && (
              <button
                type="button"
                onClick={onNavigateProjects}
                className={navButtonClass('projects')}
                aria-current={isActive('projects') ? 'page' : undefined}
              >
                <Building2 className="w-3.5 h-3.5 text-bp-cyan" />
                <span>Projects</span>
              </button>
            )}

            {/* Attendance & Worker Groups Navigation Button */}
            {onNavigateAttendance && (
              <button
                onClick={onNavigateAttendance}
                className={navButtonClass('attendance')}
                aria-current={isActive('attendance') ? 'page' : undefined}
                title="Manage Worker Groups, Daily Attendance & Wages"
              >
                <Users className="w-3.5 h-3.5 text-bp-cyan" />
                <span className="hidden sm:inline">Attendance</span>
              </button>
            )}

            {/* Reports & Audits Navigation Button */}
            {onNavigateReports && (
              <button
                onClick={onNavigateReports}
                className={navButtonClass('reports')}
                aria-current={isActive('reports') ? 'page' : undefined}
                title="View Date Range & Cumulative Inventory Reports"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-bp-cyan" />
                <span className="hidden sm:inline">Reports</span>
              </button>
            )}

            {/* User Management & Roles Button (Admin Only) */}
            {currentUser.role === 'admin' && onNavigateUserManagement && (
              <button
                onClick={onNavigateUserManagement}
                className={navButtonClass('user_management')}
                aria-current={isActive('user_management') ? 'page' : undefined}
                title="Administrator Console: Manage User Accounts and Site Permissions"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-bp-cyan" />
                <span className="hidden md:inline">User Accounts</span>
              </button>
            )}

            {/* Cloud Database Connection Status */}
            <button
              onClick={onOpenCloudSetup}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                supabaseConfig.isConnected
                  ? 'bg-bp-navy-light text-white border-bp-navy-border hover:border-bp-cyan'
                  : 'bg-bp-navy-light text-bp-border-strong border-bp-navy-border hover:border-bp-cyan'
              }`}
              title="Click to view Supabase Cloud Database settings and SQL schema"
            >
              <Database className="w-3.5 h-3.5 text-bp-cyan" />
              <span className="hidden md:inline">
                {supabaseConfig.isConnected ? 'Cloud DB Active' : 'Cloud DB Setup'}
              </span>
              <span className="md:hidden">
                {supabaseConfig.isConnected ? 'Active' : 'Setup DB'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseConfig.isConnected ? 'bg-bp-cyan' : 'bg-[#64748B]'
                }`}
              />
            </button>

            {/* Sync / Refresh Button */}
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="p-2 text-bp-border-strong hover:text-bp-cyan rounded-xl hover:bg-bp-navy-light transition-colors"
              title="Sync latest inventory and projects"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-bp-cyan' : ''}`} />
            </button>

            {/* RBAC Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bp-navy-light hover:bg-bp-navy-light text-white text-xs font-medium border border-bp-navy-border transition-colors"
                title="Switch simulated staff account to test permissions"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-bp-cyan" />
                <span className="hidden sm:inline text-bp-border-strong">Role:</span>
                <span className="font-semibold text-bp-cyan">{currentUser.role_title}</span>
                <ChevronDown className="w-3.5 h-3.5 text-bp-border-strong" />
              </button>

              {showRoleMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white text-bp-text shadow-xl border border-bp-border py-2 z-50 animate-in fade-in slide-in-from-top-1"
                  onClick={() => setShowRoleMenu(false)}
                >
                  <div className="px-3.5 py-1.5 border-b border-bp-border text-[11px] font-semibold text-bp-muted uppercase tracking-wider">
                    Simulate Staff Role
                  </div>
                  {(Object.keys(PRESET_USERS) as UserRole[]).map((roleKey) => {
                    const u = PRESET_USERS[roleKey];
                    const isSelected = currentUser.role === roleKey;
                    return (
                      <button
                        key={roleKey}
                        onClick={() => onSwitchRole(roleKey)}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-bp-background transition-colors ${
                          isSelected ? 'bg-bp-cyan/15 text-bp-text font-semibold' : 'text-bp-text'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-bp-text">{u.role_title}</div>
                          <div className="text-[11px] text-bp-muted">{u.full_name}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-bp-text shrink-0" />}
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
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-bp-cyan transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-bp-cyan text-bp-text flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-60 rounded-2xl bg-white text-bp-text shadow-xl border border-bp-border py-2 z-50 animate-in fade-in"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="px-4 py-2.5 border-b border-bp-border">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-bp-text">{currentUser.full_name}</p>
                      {currentUser.user_id && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-bp-background border border-bp-border-strong text-bp-text">
                          {currentUser.user_id}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-bp-muted">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-bp-cyan/20 text-bp-text border border-bp-cyan/50">
                      {currentUser.role_title}
                    </span>
                  </div>
                  <div className="py-1">
                    {currentUser.role === 'admin' && onNavigateUserManagement && (
                      <button
                        onClick={onNavigateUserManagement}
                        className="w-full text-left px-4 py-2 text-xs text-bp-text hover:bg-bp-background flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-bp-cyan" />
                        <span>User Accounts & Security</span>
                      </button>
                    )}
                    <button
                      onClick={onOpenCloudSetup}
                      className="w-full text-left px-4 py-2 text-xs text-bp-text hover:bg-bp-background flex items-center gap-2"
                    >
                      <FileCode2 className="w-4 h-4 text-bp-muted" />
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
              className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-bp-navy-light border border-bp-navy-border text-bp-cyan"
              aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => setShowMobileMenu(true)}
              className="min-h-11 min-w-11 rounded-full bg-bp-cyan text-bp-text flex items-center justify-center font-bold text-xs"
              aria-label="Open account menu"
            >
              {currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="xl:hidden border-t border-bp-navy-border py-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => navigateMobile(onNavigateHome)} className={`${navButtonClass('home')} min-h-11 justify-start`} aria-current={isActive('home') ? 'page' : undefined}>
                <Home className="w-4 h-4 text-bp-cyan" />Home
              </button>
              {onNavigateProjects && <button type="button" onClick={() => navigateMobile(onNavigateProjects)} className={`${navButtonClass('projects')} min-h-11 justify-start`} aria-current={isActive('projects') ? 'page' : undefined}>
                <Building2 className="w-4 h-4 text-bp-cyan" />Projects
              </button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {onNavigateAttendance && <button type="button" onClick={() => navigateMobile(onNavigateAttendance)} className={`${navButtonClass('attendance')} min-h-11 justify-start`} aria-current={isActive('attendance') ? 'page' : undefined}><Users className="w-4 h-4 text-bp-cyan" />Attendance</button>}
              {onNavigateReports && <button type="button" onClick={() => navigateMobile(onNavigateReports)} className={`${navButtonClass('reports')} min-h-11 justify-start`} aria-current={isActive('reports') ? 'page' : undefined}><FileSpreadsheet className="w-4 h-4 text-bp-cyan" />Reports</button>}
              {currentUser.role === 'admin' && onNavigateUserManagement && <button type="button" onClick={() => navigateMobile(onNavigateUserManagement)} className={`${navButtonClass('user_management')} min-h-11 justify-start`} aria-current={isActive('user_management') ? 'page' : undefined}><ShieldCheck className="w-4 h-4 text-bp-cyan" />User Accounts</button>}
              <button type="button" onClick={() => { setShowMobileMenu(false); onOpenCloudSetup(); }} className="min-h-11 rounded-xl bg-bp-navy-light border border-bp-navy-border px-3 text-left text-xs font-semibold"><Database className="inline w-4 h-4 mr-2 text-bp-cyan" />{supabaseConfig.isConnected ? 'Cloud DB Active' : 'Cloud DB Setup'}</button>
              <button type="button" disabled={isRefreshing} onClick={() => { setShowMobileMenu(false); onRefreshData(); }} className="min-h-11 rounded-xl bg-bp-navy-light border border-bp-navy-border px-3 text-left text-xs font-semibold disabled:opacity-50"><RefreshCw className={`inline w-4 h-4 mr-2 text-bp-cyan ${isRefreshing ? 'animate-spin' : ''}`} />Refresh data</button>
            </div>
            <div className="rounded-xl border border-bp-navy-border bg-bp-navy-light p-3">
              <p className="text-xs font-semibold text-white">{currentUser.full_name}</p>
              <p className="text-[11px] text-bp-border-strong">{currentUser.role_title}</p>
              <div className="mt-2 grid grid-cols-1 gap-1">
                {(Object.keys(PRESET_USERS) as UserRole[]).map(roleKey => (
                  <button key={roleKey} type="button" onClick={() => { onSwitchRole(roleKey); setShowMobileMenu(false); }} className={`min-h-10 rounded-lg px-2 text-left text-xs ${currentUser.role === roleKey ? 'bg-bp-cyan/20 text-bp-cyan' : 'text-bp-border-strong hover:bg-bp-navy-light'}`}>
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
