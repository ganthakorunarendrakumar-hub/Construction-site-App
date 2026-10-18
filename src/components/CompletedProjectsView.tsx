import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  Calendar,
  User,
  MapPin,
  Building2,
  RotateCcw,
  ArrowRight,
  Lock,
  AlertCircle
} from 'lucide-react';
import { Project, UserProfile } from '../types';

interface CompletedProjectsViewProps {
  projects: Project[];
  currentUser: UserProfile;
  onOpenProject: (project: Project) => void;
  onReopenProject: (projectId: string, reason: string) => Promise<void>;
  onNavigateBack: () => void;
}

export const CompletedProjectsView: React.FC<CompletedProjectsViewProps> = ({
  projects,
  currentUser,
  onOpenProject,
  onReopenProject,
  onNavigateBack
}) => {
  const [search, setSearch] = useState('');
  const [reopenProjectId, setReopenProjectId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [isSubmittingReopen, setIsSubmittingReopen] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';

  const filteredProjects = useMemo(() => {
    let result = [...projects];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.client_name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q)
      );
    }
    return result;
  }, [projects, search]);

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) {
      setReopenError('Mandatory: Please provide an audited reason for reopening this project.');
      return;
    }
    if (!reopenProjectId) return;

    try {
      setIsSubmittingReopen(true);
      setReopenError(null);
      await onReopenProject(reopenProjectId, reopenReason.trim());
      setReopenProjectId(null);
      setReopenReason('');
    } catch (err: any) {
      setReopenError(err.message || 'Failed to reopen project');
    } finally {
      setIsSubmittingReopen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8E8] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#666666] mb-1">
            <button onClick={onNavigateBack} className="hover:text-[#111111] transition-colors">
              Company Home
            </button>
            <span>/</span>
            <span className="font-semibold text-[#111111]">Completed Projects</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#111111] tracking-tight flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-[#111111]" />
            Completed Projects
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8] font-mono ml-1">
              {filteredProjects.length}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-white border border-[#E8E8E8] text-[#666666] px-3.5 py-1.5 rounded-xl text-xs font-medium shadow-xs">
          <Lock className="w-3.5 h-3.5 text-[#111111]" />
          <span>Read-only archive</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-3.5 sm:p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search completed projects by name, code, client, location..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] placeholder-[#888888] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-[#666666] mx-auto mb-2" />
          <h3 className="text-base font-semibold text-[#111111]">No completed projects found</h3>
          <p className="text-xs text-[#666666] max-w-sm mx-auto mt-1">
            When ongoing projects reach completion, authorized managers can mark them as finished to store them in this archive.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-[#E8E8E8] hover:border-[#FFC400] hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden shadow-xs"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-[#111111] bg-[#F7F7F7] px-2 py-0.5 rounded-md border border-[#E8E8E8]">
                    {p.code}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#111111]" />
                    Archived
                  </span>
                </div>

                <div>
                  <h3
                    onClick={() => onOpenProject(p)}
                    className="font-semibold text-[17px] text-[#111111] hover:underline cursor-pointer transition-colors line-clamp-1"
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
                  {p.description || 'Commercial project finalized and archived with complete material audit trail.'}
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
                    <span>Started: {p.start_date}</span>
                    <span className="text-[#111111] font-medium">
                      Finished: {p.actual_completion_date || p.expected_completion_date}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-[#F7F7F7] px-5 py-3 border-t border-[#E8E8E8] flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenProject(p)}
                  className="text-xs font-semibold text-[#111111] hover:underline flex items-center gap-1 transition-colors"
                >
                  View Archive
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setReopenProjectId(p.id);
                      setReopenReason('');
                      setReopenError(null);
                    }}
                    className="text-[11px] font-medium text-[#666666] hover:text-[#111111] hover:underline transition-colors flex items-center gap-1"
                    title="Company Administrator privilege: Reopen project for corrections"
                  >
                    <RotateCcw className="w-3 h-3 text-[#111111]" />
                    Reopen Project
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Reopen Confirmation Dialog */}
      {reopenProjectId && (
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E8E8E8] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-[#111111]">
              <RotateCcw className="w-5 h-5 text-[#111111]" />
              <h3 className="text-base font-bold text-[#111111]">Reopen Completed Project</h3>
            </div>
            
            <p className="text-xs text-[#666666] leading-relaxed">
              As a Company Administrator, you can return this project to <strong>Ongoing</strong> status to allow additional stock receipts or usage entries. All existing historical transactions and ledger records will be preserved intact.
            </p>

            {reopenError && (
              <div className="p-2.5 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl text-[#111111] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#111111] shrink-0" />
                <span>{reopenError}</span>
              </div>
            )}

            <form onSubmit={handleReopenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">
                  Reason for Reopening <span className="text-[#FFC400]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Additional punch-list finishing works approved; additional 50 bags cement requisitioned."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReopenProjectId(null)}
                  className="px-4 py-2 text-xs font-medium text-[#666666] hover:bg-[#F7F7F7] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReopen}
                  className="px-4 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSubmittingReopen ? 'Processing...' : 'Reopen to Ongoing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
