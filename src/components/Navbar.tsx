import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  Database,
  FileSpreadsheet,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
  X
} from 'lucide-react';
import { UserProfile, SupabaseConfig } from '../types';
import { authService } from '../services/authService';

interface NavbarProps {
  currentUser: UserProfile;
  companyName: string;
  activeView: string;
  onOpenCloudSetup: () => void;
  onNavigateHome: () => void;
  onNavigateProjects?: () => void;
  onNavigateReports?: () => void;
  onNavigateAttendance?: () => void;
  onNavigateUserManagement?: () => void;
  onLogout: () => void;
  onProfileUpdated: (profile: UserProfile) => void;
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
  companyName,
  activeView,
  onOpenCloudSetup,
  onNavigateHome,
  onNavigateProjects,
  onNavigateReports,
  onNavigateAttendance,
  onNavigateUserManagement,
  onLogout,
  onProfileUpdated,
  supabaseConfig,
  onRefreshData,
  isRefreshing = false
}) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [editedName, setEditedName] = useState(currentUser.full_name);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const desktopProfileAreaRef = useRef<HTMLDivElement>(null);
  const mobileProfileAreaRef = useRef<HTMLDivElement>(null);
  const desktopProfileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileProfileTriggerRef = useRef<HTMLButtonElement>(null);
  const canEditProfile = !supabaseConfig.isConnected;

  useEffect(() => {
    setEditedName(currentUser.full_name);
  }, [currentUser.full_name]);

  useEffect(() => {
    if (!showProfileMenu) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!desktopProfileAreaRef.current?.contains(target) && !mobileProfileAreaRef.current?.contains(target)) {
        setShowProfileMenu(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowProfileMenu(false);
      const trigger = showMobileMenu ? mobileProfileTriggerRef.current : desktopProfileTriggerRef.current;
      trigger?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showProfileMenu, showMobileMenu]);

  useEffect(() => {
    if (!showProfileDialog && !showEditProfileDialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileDialog(false);
        setShowEditProfileDialog(false);
        setProfileError(null);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [showProfileDialog, showEditProfileDialog]);

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

  const openProfileDetails = () => {
    setShowProfileMenu(false);
    setShowMobileMenu(false);
    setShowProfileDialog(true);
  };

  const openProfileEditor = () => {
    setEditedName(currentUser.full_name);
    setProfileError(null);
    setShowProfileMenu(false);
    setShowMobileMenu(false);
    setShowEditProfileDialog(true);
  };

  const closeProfileDialogs = () => {
    setShowProfileDialog(false);
    setShowEditProfileDialog(false);
    setProfileError(null);
  };

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setIsSavingProfile(true);
    try {
      const updatedProfile = await authService.updateCurrentProfile({ full_name: editedName });
      onProfileUpdated(updatedProfile);
      closeProfileDialogs();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Profile could not be saved.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const renderProfileMenu = (id: string) => (
    <div id={id} className="bp-profile-popover" aria-label="Profile menu">
      <div className="bp-profile-popover-heading">
        <span className="bp-avatar">{initials}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-bp-text">{currentUser.full_name}</span>
          <span className="block truncate text-xs text-bp-muted">{currentUser.email}</span>
          <span className="mt-1 block truncate text-[11px] font-medium text-bp-blue">{currentUser.role_title}</span>
          <span className="block truncate text-[11px] text-bp-muted">{companyName}</span>
        </span>
      </div>
      <div className="bp-profile-menu-actions" aria-label="Profile options">
        <button type="button" onClick={openProfileDetails} className="bp-profile-menu-item">
          <UserRound className="h-4 w-4" aria-hidden="true" />
          My Profile
        </button>
        {canEditProfile && (
          <button type="button" onClick={openProfileEditor} className="bp-profile-menu-item">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit Profile
          </button>
        )}
        <button
          type="button"
          onClick={() => { setShowProfileMenu(false); setShowMobileMenu(false); onLogout(); }}
          className="bp-profile-menu-item is-signout"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </div>
  );

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
            <div ref={mobileProfileAreaRef} className="bp-profile-area mt-3">
              <button
                ref={mobileProfileTriggerRef}
                type="button"
                onClick={() => setShowProfileMenu(value => !value)}
                className="bp-mobile-profile bp-profile-trigger w-full"
                aria-label={`Open profile menu for ${currentUser.full_name}`}
                aria-expanded={showProfileMenu}
                aria-controls="bp-profile-menu-mobile"
              >
                <span className="bp-avatar">{initials}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-bp-text">{currentUser.full_name}</span>
                  <span className="block truncate text-[11px] text-bp-muted">{currentUser.email}</span>
                  <span className="block truncate text-xs text-bp-muted">{currentUser.role_title}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-bp-muted transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {showProfileMenu && renderProfileMenu('bp-profile-menu-mobile')}
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

        <div ref={desktopProfileAreaRef} className="bp-profile-area mx-3 mb-4 mt-2">
          <button
            ref={desktopProfileTriggerRef}
            type="button"
            onClick={() => setShowProfileMenu(value => !value)}
            className="bp-profile-panel bp-profile-trigger w-full"
            aria-label={`Open profile menu for ${currentUser.full_name}`}
            aria-expanded={showProfileMenu}
            aria-controls="bp-profile-menu-desktop"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="bp-avatar">{initials}</span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-bp-text">{currentUser.full_name}</span>
                <span className="block truncate text-[11px] text-bp-muted">{currentUser.email}</span>
                <span className="block truncate text-[11px] text-bp-muted">
                  {currentUser.role_title}{currentUser.user_id ? ` · ${currentUser.user_id}` : ''}
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-bp-muted transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
            </span>
          </button>
          {showProfileMenu && renderProfileMenu('bp-profile-menu-desktop')}
        </div>
      </aside>

      {(showProfileDialog || showEditProfileDialog) && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-bp-navy-deep/60 p-4 backdrop-blur-sm"
          onMouseDown={event => { if (event.target === event.currentTarget) closeProfileDialogs(); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            className="bp-profile-dialog w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-bp-border bg-gradient-to-r from-bp-navy to-bp-blue px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-sm font-bold text-white">
                  {initials}
                </span>
                <div>
                  <h2 id="profile-dialog-title" className="text-base font-semibold text-white">
                    {showEditProfileDialog ? 'Edit Profile' : 'My Profile'}
                  </h2>
                  <p className="text-xs text-white/75">{currentUser.role_title}</p>
                </div>
              </div>
              <button type="button" onClick={closeProfileDialogs} className="bp-profile-dialog-close" aria-label="Close profile dialog">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            {showProfileDialog ? (
              <div className="space-y-4 p-5">
                <dl className="divide-y divide-bp-border rounded-xl border border-bp-border bg-bp-background/70 px-4">
                  <div className="py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-bp-muted">Full name</dt>
                    <dd className="mt-1 text-sm font-semibold text-bp-text">{currentUser.full_name}</dd>
                  </div>
                  <div className="py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-bp-muted">Email</dt>
                    <dd className="mt-1 break-all text-sm text-bp-text">{currentUser.email}</dd>
                  </div>
                  {currentUser.user_id && (
                    <div className="py-3">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-bp-muted">User ID</dt>
                      <dd className="mt-1 font-mono text-sm text-bp-text">{currentUser.user_id}</dd>
                    </div>
                  )}
                  <div className="py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-bp-muted">Role</dt>
                    <dd className="mt-1 text-sm text-bp-text">{currentUser.role_title}</dd>
                  </div>
                  <div className="py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-bp-muted">Company</dt>
                    <dd className="mt-1 text-sm text-bp-text">{companyName}</dd>
                  </div>
                </dl>
                <div className="flex justify-end">
                  <button type="button" onClick={closeProfileDialogs} className="bp-profile-primary-button">Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="space-y-4 p-5">
                {profileError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{profileError}</p>}
                <div>
                  <label htmlFor="profile-full-name" className="mb-1.5 block text-sm font-medium text-bp-text">Full name</label>
                  <input
                    id="profile-full-name"
                    type="text"
                    autoComplete="name"
                    maxLength={120}
                    required
                    value={editedName}
                    onChange={event => setEditedName(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-bp-border-strong bg-white px-3.5 py-2.5 text-sm text-bp-text"
                  />
                  <p className="mt-2 text-xs text-bp-muted">Role, company, and access permissions can’t be changed here.</p>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-bp-border pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeProfileDialogs} className="bp-profile-secondary-button">Cancel</button>
                  <button type="submit" disabled={isSavingProfile || !editedName.trim()} className="bp-profile-primary-button disabled:cursor-not-allowed disabled:opacity-50">
                    {isSavingProfile ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
};
