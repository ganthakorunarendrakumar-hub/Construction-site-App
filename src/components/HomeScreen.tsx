import React, { useState } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  Building2,
  Edit2,
  Check,
  X,
  ArrowRight,
  MapPin,
  User,
  Calendar,
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      
      {/* Company overview */}
      <section className="relative overflow-hidden rounded-2xl border border-[#24496F] bg-bp-navy p-5 text-white shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-bp-cyan/15" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-bp-cyan-light">
              <Building2 className="h-4 w-4" />
              Construction operations
            </p>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[32px]">
              Manage your projects
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
          <div className="grid w-full grid-cols-2 gap-3 md:max-w-sm">
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3.5">
              <p className="text-[11px] font-medium text-bp-border-strong">Ongoing projects</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-white">{ongoingProjects.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3.5">
              <p className="text-[11px] font-medium text-bp-border-strong">Completed projects</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-white">{completedProjects.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: REDESIGNED THREE MAIN OPERATION CARDS */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-[22px] font-semibold text-bp-text tracking-tight">
          Your Projects
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 1. Create Project */}
          <div
            onClick={canCreateProject ? onNavigateCreateProject : undefined}
            className={`group bg-white rounded-2xl border border-bp-border p-5 transition-all duration-150 flex items-center justify-between shadow-xs ${
              canCreateProject
                ? 'hover:border-bp-cyan hover:shadow-sm cursor-pointer'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bp-blue font-bold text-white transition-transform group-hover:scale-105">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-bp-text group-hover:text-bp-text">
                  Create Project
                </h3>
                <span className="mt-0.5 inline-block rounded-md bg-bp-cyan-soft px-2 py-0.5 text-xs font-semibold text-bp-blue">
                  + New
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-bp-background flex items-center justify-center group-hover:bg-bp-cyan transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-bp-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </div>
          </div>

          {/* 2. Ongoing Projects */}
          <div
            onClick={onNavigateOngoing}
            className="group bg-white rounded-2xl border border-bp-border p-5 transition-all duration-150 flex items-center justify-between shadow-xs hover:border-bp-cyan hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bp-cyan-soft font-bold text-bp-blue transition-colors group-hover:bg-bp-blue group-hover:text-white">
                <Clock className="h-5 w-5 text-bp-blue group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-bp-text group-hover:text-bp-text">
                  Ongoing Sites
                </h3>
                <span className="inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-md bg-bp-background text-bp-text border border-bp-border">
                  {ongoingProjects.length} Active
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-bp-background flex items-center justify-center group-hover:bg-bp-cyan transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-bp-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </div>
          </div>

          {/* 3. Completed Projects */}
          <div
            onClick={onNavigateCompleted}
            className="group bg-white rounded-2xl border border-bp-border p-5 transition-all duration-150 flex items-center justify-between shadow-xs hover:border-bp-cyan hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bp-cyan-soft font-bold text-bp-blue transition-colors group-hover:bg-bp-blue group-hover:text-white">
                <CheckCircle2 className="h-5 w-5 text-bp-blue group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-bp-text group-hover:text-bp-text">
                  Completed
                </h3>
                <span className="inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-md bg-bp-background text-bp-text border border-bp-border">
                  {completedProjects.length} Archived
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-bp-background flex items-center justify-center group-hover:bg-bp-cyan transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-bp-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </div>
          </div>

          {/* 4. Material & Stock Reports */}
          <div
            onClick={onNavigateReports}
            className="group bg-white rounded-2xl border border-bp-border p-5 transition-all duration-150 flex items-center justify-between shadow-xs hover:border-bp-cyan hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bp-cyan-soft font-bold text-bp-blue transition-colors group-hover:bg-bp-blue group-hover:text-white">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-bp-text group-hover:text-bp-text">
                  Stock Reports
                </h3>
                <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-bp-cyan/20 text-bp-text border border-bp-cyan/30">
                  2 Reports • CSV
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-bp-background flex items-center justify-center group-hover:bg-bp-cyan transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-bp-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </div>
          </div>

          {/* 5. Attendance & Worker Groups */}
          <div
            onClick={onNavigateAttendance}
            className="group bg-white rounded-2xl border border-bp-border p-5 transition-all duration-150 flex items-center justify-between shadow-xs hover:border-bp-cyan hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bp-cyan-soft font-bold text-bp-blue transition-colors group-hover:bg-bp-blue group-hover:text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-bp-text group-hover:text-bp-text">
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

          {/* 6. User Accounts & Security (Admin Only) */}
          {currentUser.role === 'admin' && onNavigateUserManagement && (
            <div
              onClick={onNavigateUserManagement}
              className="group bg-white rounded-2xl border border-bp-border p-5 transition-all duration-150 flex items-center justify-between shadow-xs hover:border-bp-cyan hover:shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bp-cyan-soft font-bold text-bp-blue transition-colors group-hover:bg-bp-blue group-hover:text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] sm:text-[17px] font-semibold text-bp-text group-hover:text-bp-text">
                    User Accounts
                  </h3>
                  <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-bp-cyan/20 text-bp-text border border-bp-cyan/30">
                    Roles & Security
                  </span>
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
      <section className="bg-white rounded-2xl border border-bp-border p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[18px] sm:text-xl font-semibold text-bp-text">
              Active Sites
            </h3>
            <p className="text-xs text-bp-muted mt-0.5">
              Quick access to your ongoing project workspaces
            </p>
          </div>
          <button
            onClick={onNavigateOngoing}
            className="text-xs font-semibold text-bp-text hover:text-bp-muted flex items-center gap-1 transition-colors"
          >
            View all ({ongoingProjects.length}) &rarr;
          </button>
        </div>

        {ongoingProjects.length === 0 ? (
          <div className="text-center py-10 bg-bp-background rounded-xl border border-dashed border-bp-border">
            <Building2 className="w-7 h-7 text-bp-muted mx-auto mb-2" />
            <p className="text-sm font-medium text-bp-text">No ongoing projects</p>
            <p className="text-xs text-bp-muted mt-0.5">Create your first construction project to get started</p>
            {canCreateProject && (
              <button
                onClick={onNavigateCreateProject}
                className="mt-3.5 px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {ongoingProjects.slice(0, 3).map((proj) => (
              <div
                key={proj.id}
                onClick={() => onOpenProject(proj)}
                className="group p-4 rounded-xl border border-bp-border hover:border-bp-cyan transition-all bg-white hover:shadow-xs cursor-pointer flex flex-col justify-between"
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
