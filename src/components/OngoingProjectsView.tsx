import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  ArrowUpDown,
  Calendar,
  User,
  MapPin,
  Building2,
  CheckCircle,
  Plus,
  ArrowRight,
  CheckCheck
} from 'lucide-react';
import { Project, UserProfile } from '../types';

interface OngoingProjectsViewProps {
  projects: Project[];
  currentUser: UserProfile;
  onOpenProject: (project: Project) => void;
  onNavigateCreate: () => void;
  onMarkCompleted: (projectId: string) => Promise<void>;
  onNavigateBack: () => void;
}

export const OngoingProjectsView: React.FC<OngoingProjectsViewProps> = ({
  projects,
  currentUser,
  onOpenProject,
  onNavigateCreate,
  onMarkCompleted,
  onNavigateBack
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'planning' | 'on_hold'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'start_date' | 'completion_date' | 'code'>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const canCreate = currentUser.role === 'admin' || currentUser.role === 'project_manager';
  const canComplete = currentUser.role === 'admin' || currentUser.role === 'project_manager';

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.client_name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.project_manager_name.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'code') {
        cmp = a.code.localeCompare(b.code);
      } else if (sortBy === 'start_date') {
        cmp = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      } else if (sortBy === 'completion_date') {
        cmp = new Date(a.expected_completion_date).getTime() - new Date(b.expected_completion_date).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [projects, search, statusFilter, sortBy, sortOrder]);

  const handleConfirmComplete = async (projectId: string) => {
    try {
      setIsCompleting(true);
      await onMarkCompleted(projectId);
      setConfirmCompleteId(null);
    } catch (e: any) {
      alert(e.message || 'Failed to mark project as completed');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8E8] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#666666] mb-1">
            <button onClick={onNavigateBack} className="hover:text-[#111111] transition-colors">
              Company Home
            </button>
            <span>/</span>
            <span className="font-semibold text-[#111111]">Ongoing Projects</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#111111] tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[#111111]" />
            Ongoing Projects
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FFC400]/20 text-[#111111] border border-[#FFC400]/40 font-mono ml-1">
              {filteredProjects.length}
            </span>
          </h1>
        </div>

        {canCreate && (
          <button
            onClick={onNavigateCreate}
            className="px-4 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, client, code, manager..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] placeholder-[#888888] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#F7F7F7] p-1 rounded-xl text-xs border border-[#E8E8E8]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-[#FFC400] text-[#111111] font-semibold' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'in_progress' ? 'bg-[#FFC400] text-[#111111] font-semibold' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('planning')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'planning' ? 'bg-[#FFC400] text-[#111111] font-semibold' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              Planning
            </button>
            <button
              onClick={() => setStatusFilter('on_hold')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'on_hold' ? 'bg-[#FFC400] text-[#111111] font-semibold' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              On Hold
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#666666] hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs py-1.5 px-2.5 rounded-xl border border-[#E8E8E8] bg-white text-[#111111] focus:outline-none focus:border-[#FFC400]"
            >
              <option value="start_date">Start Date</option>
              <option value="completion_date">Due Date</option>
              <option value="name">Name</option>
              <option value="code">Code</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded-xl border border-[#E8E8E8] hover:bg-[#F7F7F7] text-[#111111]"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center shadow-xs">
          <Clock className="w-10 h-10 text-[#666666] mx-auto mb-2" />
          <h3 className="text-base font-semibold text-[#111111]">No matching ongoing projects found</h3>
          <p className="text-xs text-[#666666] max-w-sm mx-auto mt-1">
            {search ? 'Try clearing your search query or status filter.' : 'No active projects available.'}
          </p>
          {canCreate && (
            <button
              onClick={onNavigateCreate}
              className="mt-4 px-4 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredProjects.map((p) => {
            const isTargetNear =
              new Date(p.expected_completion_date).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-[#E8E8E8] hover:border-[#FFC400] hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden group shadow-xs"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-[#111111] bg-[#F7F7F7] px-2 py-0.5 rounded-md border border-[#E8E8E8]">
                      {p.code}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F7F7F7] text-[#666666] border border-[#E8E8E8] capitalize">
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <h3
                      onClick={() => onOpenProject(p)}
                      className="font-semibold text-[17px] text-[#111111] group-hover:text-black cursor-pointer transition-colors line-clamp-1"
                      title={p.name}
                    >
                      {p.name}
                    </h3>
                    <p className="text-xs text-[#666666] flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                      <span className="truncate">{p.client_name}</span>
                    </p>
                  </div>

                  <p className="text-xs text-[#666666] line-clamp-2 leading-relaxed">
                    {p.description || 'Standard multi-story construction site with active material tracking.'}
                  </p>

                  <div className="space-y-1.5 pt-2.5 border-t border-[#E8E8E8] text-xs text-[#666666]">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                      <span className="truncate font-medium text-[#111111]">{p.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                      <span className="truncate">PM: <strong className="text-[#111111] font-medium">{p.project_manager_name}</strong></span>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-[#666666] font-mono">
                      <span>Start: {p.start_date}</span>
                      <span className={isTargetNear ? 'text-[#111111] font-semibold' : ''}>
                        Due: {p.expected_completion_date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="bg-[#F7F7F7] px-5 py-3 border-t border-[#E8E8E8] flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenProject(p)}
                    className="text-xs font-semibold text-[#111111] hover:underline flex items-center gap-1 transition-colors"
                  >
                    Open Workspace
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {canComplete && (
                    <button
                      onClick={() => setConfirmCompleteId(p.id)}
                      className="text-[11px] font-medium text-[#666666] hover:text-[#111111] hover:underline transition-colors"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal to Mark Completed */}
      {confirmCompleteId && (
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E8E8E8] animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-[#FFC400] text-[#111111] flex items-center justify-center mx-auto">
              <CheckCheck className="w-6 h-6 text-[#111111]" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-[#111111]">Mark Project as Completed?</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                This project will be moved to <strong>Completed Projects</strong> archive. All material records and stock history will remain intact.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setConfirmCompleteId(null)}
                className="px-4 py-2 text-xs font-medium text-[#666666] hover:bg-[#F7F7F7] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCompleting}
                onClick={() => handleConfirmComplete(confirmCompleteId)}
                className="px-4 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isCompleting ? 'Finalizing...' : 'Confirm Completion'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
