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
  totalCementStockBags: number;
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
  totalCementStockBags,
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
      
      {/* MINIMAL HERO SECTION: Welcome & Company Header */}
      <section className="bg-white rounded-2xl border border-[#E8E8E8] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#111111] tracking-tight leading-tight">
              Manage your projects
            </h1>

            {/* Editable Company Name */}
            {isEditingName ? (
              <form onSubmit={handleSaveCompanyName} className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className="bg-[#F7F7F7] text-[#111111] font-semibold text-lg px-3 py-1.5 rounded-xl border border-[#FFC400] focus:outline-none focus:ring-1 focus:ring-[#FFC400] w-full sm:w-80"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="px-3.5 py-1.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-semibold text-xs rounded-xl flex items-center gap-1 transition-colors"
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
                  className="px-3 py-1.5 bg-[#F7F7F7] hover:bg-[#E8E8E8] text-[#666666] text-xs font-medium rounded-xl flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                {editError && <p className="text-xs text-[#666666] w-full">{editError}</p>}
              </form>
            ) : (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-sm sm:text-base font-semibold text-[#111111]">
                  {company.name}
                </span>
                {canEditCompany && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] rounded-lg transition-colors"
                    title="Edit company name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics (Connected to real data) */}
          <div className="flex items-center gap-5 sm:gap-8 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-[#E8E8E8] md:pl-8 shrink-0">
            <div>
              <p className="text-xs font-medium text-[#666666]">Live Cement Stock</p>
              <p className="text-2xl sm:text-[26px] font-bold text-[#111111] font-mono mt-0.5">
                {totalCementStockBags.toLocaleString()} <span className="text-xs font-normal text-[#666666]">bags</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#666666]">Active Sites</p>
              <p className="text-2xl sm:text-[26px] font-bold text-[#111111] font-mono mt-0.5">
                {ongoingProjects.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: REDESIGNED THREE MAIN OPERATION CARDS */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-[22px] font-semibold text-[#111111] tracking-tight">
          Your Projects
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 1. Create Project */}
          <div
            onClick={canCreateProject ? onNavigateCreateProject : undefined}
            className={`group bg-white rounded-2xl border border-[#E8E8E8] p-5 transition-all duration-150 flex items-center justify-between shadow-xs ${
              canCreateProject
                ? 'hover:border-[#FFC400] hover:shadow-sm cursor-pointer'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold shrink-0 transition-transform group-hover:scale-105">
                <Plus className="w-5 h-5 text-[#111111]" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#111111] group-hover:text-black">
                  Create Project
                </h3>
                <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-[#FFC400]/20 text-[#111111]">
                  + New
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center group-hover:bg-[#FFC400] transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* 2. Ongoing Projects */}
          <div
            onClick={onNavigateOngoing}
            className="group bg-white rounded-2xl border border-[#E8E8E8] p-5 transition-all duration-150 flex items-center justify-between shadow-xs hover:border-[#FFC400] hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#F7F7F7] group-hover:bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold shrink-0 transition-colors">
                <Clock className="w-5 h-5 text-[#111111]" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#111111] group-hover:text-black">
                  Ongoing Sites
                </h3>
                <span className="inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-md bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]">
                  {ongoingProjects.length} Active
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center group-hover:bg-[#FFC400] transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* 3. Completed Projects */}
          <div
            onClick={onNavigateCompleted}
            className="group bg-white rounded-2xl border border-[#E8E8E8] p-5 transition-all duration-150 flex items-center justify-between shadow-xs hover:border-[#FFC400] hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#F7F7F7] group-hover:bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold shrink-0 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-[#111111]" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#111111] group-hover:text-black">
                  Completed
                </h3>
                <span className="inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-md bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]">
                  {completedProjects.length} Archived
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center group-hover:bg-[#FFC400] transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* 4. Material & Stock Reports */}
          <div
            onClick={onNavigateReports}
            className="group bg-white rounded-2xl border border-[#E8E8E8] p-5 transition-all duration-150 flex items-center justify-between shadow-xs hover:border-[#FFC400] hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#111111] group-hover:bg-[#FFC400] text-[#FFC400] group-hover:text-[#111111] flex items-center justify-center font-bold shrink-0 transition-colors">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#111111] group-hover:text-black">
                  Stock Reports
                </h3>
                <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-[#FFC400]/20 text-[#111111] border border-[#FFC400]/30">
                  2 Reports • CSV
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center group-hover:bg-[#FFC400] transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* 5. Attendance & Worker Groups */}
          <div
            onClick={onNavigateAttendance}
            className="group bg-white rounded-2xl border border-[#E8E8E8] p-5 transition-all duration-150 flex items-center justify-between shadow-xs hover:border-[#FFC400] hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#111111] group-hover:bg-[#FFC400] text-[#FFC400] group-hover:text-[#111111] flex items-center justify-center font-bold shrink-0 transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#111111] group-hover:text-black">
                  Attendance
                </h3>
                <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-[#FFC400]/20 text-[#111111] border border-[#FFC400]/30">
                  Gangs & Wages
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center group-hover:bg-[#FFC400] transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* 6. User Accounts & Security (Admin Only) */}
          {currentUser.role === 'admin' && onNavigateUserManagement && (
            <div
              onClick={onNavigateUserManagement}
              className="group bg-white rounded-2xl border border-[#E8E8E8] p-5 transition-all duration-150 flex items-center justify-between shadow-xs hover:border-[#FFC400] hover:shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#111111] group-hover:bg-[#FFC400] text-[#FFC400] group-hover:text-[#111111] flex items-center justify-center font-bold shrink-0 transition-colors">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#111111] group-hover:text-black">
                    User Accounts
                  </h3>
                  <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-[#FFC400]/20 text-[#111111] border border-[#FFC400]/30">
                    Roles & Security
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center group-hover:bg-[#FFC400] transition-colors shrink-0">
                <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ACTIVE SITE HIGHLIGHTS: Clean consumer-app list */}
      <section className="bg-white rounded-2xl border border-[#E8E8E8] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[18px] sm:text-xl font-semibold text-[#111111]">
              Active Sites
            </h3>
            <p className="text-xs text-[#666666] mt-0.5">
              Quick access to your ongoing project workspaces
            </p>
          </div>
          <button
            onClick={onNavigateOngoing}
            className="text-xs font-semibold text-[#111111] hover:text-[#666666] flex items-center gap-1 transition-colors"
          >
            View all ({ongoingProjects.length}) &rarr;
          </button>
        </div>

        {ongoingProjects.length === 0 ? (
          <div className="text-center py-10 bg-[#F7F7F7] rounded-xl border border-dashed border-[#E8E8E8]">
            <Building2 className="w-7 h-7 text-[#666666] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#111111]">No ongoing projects</p>
            <p className="text-xs text-[#666666] mt-0.5">Create your first construction project to get started</p>
            {canCreateProject && (
              <button
                onClick={onNavigateCreateProject}
                className="mt-3.5 px-4 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
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
                className="group p-4 rounded-xl border border-[#E8E8E8] hover:border-[#FFC400] transition-all bg-white hover:shadow-xs cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]">
                      {proj.code}
                    </span>
                    <span className="text-[11px] font-medium text-[#666666]">
                      {proj.location}
                    </span>
                  </div>

                  <h4 className="text-[15px] font-semibold text-[#111111] group-hover:text-black line-clamp-1">
                    {proj.name}
                  </h4>
                  <p className="text-xs text-[#666666] mt-0.5 line-clamp-1">
                    Client: {proj.client_name}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E8E8E8] flex items-center justify-between text-xs">
                  <span className="text-[#666666] flex items-center gap-1 text-[11px]">
                    <User className="w-3 h-3 text-[#666666]" />
                    {proj.project_manager_name}
                  </span>
                  <span className="font-semibold text-[#111111] group-hover:underline flex items-center gap-1">
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
