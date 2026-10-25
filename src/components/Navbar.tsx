import React, { useState } from 'react';
import {
  Building2,
  Database,
  FileSpreadsheet,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import { UserProfile, SupabaseConfig } from '../types';

interface NavbarProps {
  currentUser: UserProfile;
  activeView: string;
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

type NavigationItem = {
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  active: boolean;
};

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeView,
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const projectsActive = [
    'ongoing_projects', 'completed_projects', 'project_workspace', 'cement_module',
    'steel_module', 'sand_module', 'bricks_module', 'aggregate_module',
    'category_module', 'vehicle_hire', 'machinery_hire'
  ].includes(activeView);

  const navigationItems: NavigationItem[] = [
    { label: 'Overview', icon: LayoutDashboard, onClick: onNavigateHome, active: activeView === 'home' },
    { label: 'Projects', icon: Building2, onClick: onNavigateProjects, active: projectsActive },
    { label: 'Attendance', icon: Users, onClick: onNavigateAttendance, active: activeView === 'attendance' },
    { label: 'Stock reports', icon: FileSpreadsheet, onClick: onNavigateReports, active: activeView === 'reports' },
    ...(currentUser.role === 'admin' && onNavigateUserManagement
      ? [{ label: 'User accounts', icon: ShieldCheck, onClick: onNavigateUserManagement, active: activeView === 'user_management' }]
      : [])
  ];

  const initials = currentUser.full_name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const renderNavigation = (mobile = false) => navigationItems
    .filter(item => item.onClick)
    .map(item => {
      const Icon = item.icon;
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.onClick?.();
            if (mobile) setShowMobileMenu(false);
          }}
          className={`bp-nav-item${item.active ? ' is-active' : ''}`}
          aria-current={item.active ? 'page' : undefined}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      );
    });

  const cloudStatus = supabaseConfig.isConnected ? 'Cloud connected' : 'Cloud settings';

  return (
    <>
      <header className="bp-mobile-header sticky top-0 z-40 lg:hidden">
        <div className="flex min-h-[68px] items-center justify-between gap-3 px-4 sm:px-6">
          <button type="button" onClick={onNavigateHome} className="bp-brand-button min-w-0" aria-label="BuildPulse overview">
            <span className="bp-brand-mark"><HardHat className="h-5 w-5" aria-hidden="true" /></span>
            <span className="min-w-0 text-left">
              <span className="flex items-center gap-2">
                <span className="truncate text-[15px] font-bold tracking-[0.08em]">BUILDPULSE</span>
                <span className="bp-brand-tag">ERP</span>
              </span>
              <span className="block truncate text-[11px] text-bp-muted">Construction Management</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowMobileMenu(value => !value)}
            className="bp-menu-toggle"
            aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={showMobileMenu}
            aria-controls="buildpulse-mobile-navigation"
          >
            {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {showMobileMenu && (
          <div id="buildpulse-mobile-navigation" className="bp-mobile-menu px-4 pb-4 sm:px-6">
            <p className="bp-nav-caption">Workspace</p>
            <nav aria-label="Main navigation" className="space-y-1">
              {renderNavigation(true)}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {currentUser.role === 'admin' && (
                <button type="button" onClick={() => { setShowMobileMenu(false); onOpenCloudSetup(); }} className="bp-utility-button">
                  <Database className="h-4 w-4" aria-hidden="true" />{cloudStatus}
                </button>
              )}
              <button type="button" disabled={isRefreshing} onClick={() => { setShowMobileMenu(false); onRefreshData(); }} className="bp-utility-button disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                {isRefreshing ? 'Refreshing' : 'Refresh data'}
              </button>
            </div>
            <div className="bp-mobile-profile mt-3">
              <span className="bp-avatar">{initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-bp-text">{currentUser.full_name}</span>
                <span className="block truncate text-[11px] text-bp-muted">{currentUser.email}</span>
                <span className="block truncate text-xs text-bp-muted">{currentUser.role_title}</span>
              </span>
              <button type="button" onClick={() => { setShowMobileMenu(false); onLogout(); }} className="bp-signout-button" aria-label="Sign out">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </header>

      <aside className="bp-sidebar sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col lg:flex" aria-label="Application navigation">
        <div className="px-5 pb-6 pt-6">
          <button type="button" onClick={onNavigateHome} className="bp-brand-button w-full" aria-label="BuildPulse overview">
            <span className="bp-brand-mark"><HardHat className="h-5 w-5" aria-hidden="true" /></span>
            <span className="min-w-0 text-left">
              <span className="flex items-center gap-2">
                <span className="truncate text-[15px] font-bold tracking-[0.08em] text-bp-navy">BUILDPULSE</span>
                <span className="bp-brand-tag">ERP</span>
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-bp-muted">Construction Management</span>
            </span>
          </button>
        </div>

        <div className="bp-sidebar-divider mx-5" />
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-5">
          <p className="bp-nav-caption px-3">Workspace</p>
          <div className="space-y-1">{renderNavigation()}</div>
        </nav>

        <div className="space-y-2 px-3 pb-3">
          {currentUser.role === 'admin' && (
            <button type="button" onClick={onOpenCloudSetup} className="bp-sidebar-utility" title="Open cloud database settings">
              <span className={`bp-status-dot ${supabaseConfig.isConnected ? 'is-connected' : ''}`} />
              <Database className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{cloudStatus}</span>
            </button>
          )}
          <button type="button" disabled={isRefreshing} onClick={onRefreshData} className="bp-sidebar-utility disabled:opacity-50" title="Sync latest inventory and projects">
            <RefreshCw className={`h-4 w-4 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isRefreshing ? 'Refreshing data' : 'Refresh data'}</span>
          </button>
        </div>

        <div className="bp-profile-panel mx-3 mb-4 mt-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="bp-avatar">{initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-bp-text">{currentUser.full_name}</span>
              <span className="block truncate text-[11px] text-bp-muted">{currentUser.email}</span>
              <span className="block truncate text-[11px] text-bp-muted">
                {currentUser.role_title}{currentUser.user_id ? ` · ${currentUser.user_id}` : ''}
              </span>
            </span>
          </div>
          <button type="button" onClick={onLogout} className="bp-profile-signout mt-3">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};
