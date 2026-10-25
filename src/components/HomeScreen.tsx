import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Building2,
  Edit2,
  Check,
  X,
  ArrowRight,
  MapPin,
  User,
  FileSpreadsheet,
  Users,
  ShieldCheck
} from 'lucide-react';
import { Company, Project, UserProfile } from '../types';

interface HomeScreenProps {
  company: Company;
  ongoingProjects: Project[];
  completedProjects: Project[];
  currentUser: UserProfile;
  onUpdateCompanyName: (newName: string) => Promise<void>;
  onNavigateCreateProject: () => void;
  onNavigateOngoing: () => void;
  onNavigateCompleted: () => void;
  onNavigateReports?: () => void;
  onNavigateAttendance?: () => void;
  onNavigateUserManagement?: () => void;
  onOpenProject: (project: Project) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  company,
  ongoingProjects,
  completedProjects,
  currentUser,
  onUpdateCompanyName,
  onNavigateCreateProject,
  onNavigateOngoing,
  onNavigateCompleted,
  onNavigateReports,
  onNavigateAttendance,
  onNavigateUserManagement,
  onOpenProject
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(company.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const canEditCompany = currentUser.role === 'admin';
  const canCreateProject = currentUser.role === 'admin' || currentUser.role === 'project_manager';

  const handleSaveCompanyName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameValue.trim()) {
      setEditError('Company name cannot be blank.');
      return;
    }
    try {
      setIsSavingName(true);
      setEditError(null);
      await onUpdateCompanyName(editNameValue.trim());
      setIsEditingName(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update company name');
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Company overview */}
      <section className="bp-dashboard-hero rounded-2xl border border-bp-navy-border bg-bp-navy p-4 text-white sm:p-6">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">
              Company overview
            </h1>

            {/* Editable Company Name */}
            {isEditingName ? (
              <form onSubmit={handleSaveCompanyName} className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className="bg-bp-background text-bp-text font-semibold text-lg px-3 py-1.5 rounded-xl border border-bp-cyan focus:outline-none focus:ring-1 focus:ring-bp-cyan w-full sm:w-80"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="px-3.5 py-1.5 bg-bp-cyan hover:bg-bp-blue text-bp-text font-semibold text-xs rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditNameValue(company.name);
                    setEditError(null);
                  }}
                  className="px-3 py-1.5 bg-bp-background hover:bg-bp-border text-bp-muted text-xs font-medium rounded-xl flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                {editError && <p className="w-full text-xs text-rose-200">{editError}</p>}
              </form>
            ) : (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-sm font-semibold text-bp-border sm:text-base">
                  {company.name}
                </span>
                {canEditCompany && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="rounded-lg p-1 text-bp-border-strong transition-colors hover:bg-white/10 hover:text-white"
                    title="Edit company name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 md:max-w-xs">
            <div className="bp-dashboard-stat rounded-xl border border-white/10 bg-white/10 px-3.5 py-3">
              <p className="text-[11px] font-medium text-bp-border-strong">Ongoing projects</p>
              <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-white">{ongoingProjects.length}</p>
            </div>
            <div className="bp-dashboard-stat rounded-xl border border-white/10 bg-white/10 px-3.5 py-3">
              <p className="text-[11px] font-medium text-bp-border-strong">Completed projects</p>
              <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-white">{completedProjects.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: REDESIGNED THREE MAIN OPERATION CARDS */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-bp-text">
          Workspace shortcuts
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

          {/* 1. Create Project */}
          {canCreateProject && (
          <div
            role="button"
            tabIndex={0}
            onClick={onNavigateCreateProject}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateCreateProject(); } }}
            className="bp-dashboard-shortcut group flex cursor-pointer items-center justify-between rounded-xl border border-bp-border bg-white p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bp-blue font-bold text-white">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bp-text">
                  Create Project
                </h3>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-bp-muted" />
          </div>
          )}

          {/* Completed Projects */}
          <div
            role="button"
            tabIndex={0}
            onClick={onNavigateCompleted}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateCompleted(); } }}
            className="bp-dashboard-shortcut group flex cursor-pointer items-center justify-between rounded-xl border border-bp-border bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bp-cyan-soft text-bp-blue">
                <CheckCircle2 className="h-5 w-5 text-bp-blue group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bp-text">
                  Completed
                </h3>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-bp-muted" />
          </div>

          {/* 4. Material & Stock Reports */}
          {onNavigateReports && (
          <div
            role="button"
            tabIndex={0}
            onClick={onNavigateReports}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateReports(); } }}
            className="bp-dashboard-shortcut group flex cursor-pointer items-center justify-between rounded-xl border border-bp-border bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bp-cyan-soft text-bp-blue">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bp-text">
                  Stock Reports
                </h3>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-bp-background flex items-center justify-center group-hover:bg-bp-cyan transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-bp-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </div>
          </div>
          )}

          {/* 5. Attendance & Worker Groups */}
          {onNavigateAttendance && (
          <div
            role="button"
            tabIndex={0}
            onClick={onNavigateAttendance}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateAttendance(); } }}
            className="bp-dashboard-shortcut group flex cursor-pointer items-center justify-between rounded-xl border border-bp-border bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bp-cyan-soft text-bp-blue">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bp-text">
                  Attendance
                </h3>
                <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-bp-cyan/20 text-bp-text border border-bp-cyan/30">
                  Gangs & Wages
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-bp-background flex items-center justify-center group-hover:bg-bp-cyan transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-bp-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </div>
          </div>
          )}

          {/* 6. User Accounts & Security (Admin Only) */}
          {currentUser.role === 'admin' && onNavigateUserManagement && (
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateUserManagement}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateUserManagement(); } }}
              className="bp-dashboard-shortcut group flex cursor-pointer items-center justify-between rounded-xl border border-bp-border bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bp-cyan-soft text-bp-blue">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-bp-text">
                    User Accounts
                  </h3>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-bp-background flex items-center justify-center group-hover:bg-bp-cyan transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-bp-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ACTIVE SITE HIGHLIGHTS: Clean consumer-app list */}
      <section className="bp-dashboard-section space-y-3 rounded-2xl border border-bp-border bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[18px] sm:text-xl font-semibold text-bp-text">
              Active Sites
            </h3>
          </div>
          <button
            onClick={onNavigateOngoing}
            className="text-xs font-semibold text-bp-text hover:text-bp-muted flex items-center gap-1 transition-colors"
          >
            View all &rarr;
          </button>
        </div>

        {ongoingProjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-bp-border bg-bp-background py-7 text-center">
            <Building2 className="mx-auto mb-2 h-6 w-6 text-bp-muted" />
            <p className="text-sm font-medium text-bp-text">No ongoing projects</p>
            <p className="mt-1 text-xs text-bp-muted">Use Create Project above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ongoingProjects.slice(0, 3).map((proj) => (
              <div
                key={proj.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenProject(proj)}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenProject(proj); } }}
                className="bp-dashboard-shortcut group flex cursor-pointer flex-col justify-between rounded-xl border border-bp-border bg-white p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-bp-background text-bp-text border border-bp-border">
                      {proj.code}
                    </span>
                    <span className="text-[11px] font-medium text-bp-muted">
                      {proj.location}
                    </span>
                  </div>

                  <h4 className="text-[15px] font-semibold text-bp-text group-hover:text-bp-text line-clamp-1">
                    {proj.name}
                  </h4>
                  <p className="text-xs text-bp-muted mt-0.5 line-clamp-1">
                    Client: {proj.client_name}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-bp-border flex items-center justify-between text-xs">
                  <span className="text-bp-muted flex items-center gap-1 text-[11px]">
                    <User className="w-3 h-3 text-bp-muted" />
                    {proj.project_manager_name}
                  </span>
                  <span className="font-semibold text-bp-text group-hover:underline flex items-center gap-1">
                    Open Workspace &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
