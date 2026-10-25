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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bp-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-bp-muted mb-1">
            <button onClick={onNavigateBack} className="hover:text-bp-text transition-colors">
              Company Home
            </button>
            <span>/</span>
            <span className="font-semibold text-bp-text">Completed Projects</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-bp-text tracking-tight flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-bp-text" />
            Completed Projects
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-bp-background text-bp-text border border-bp-border font-mono ml-1">
              {filteredProjects.length}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-white border border-bp-border text-bp-muted px-3.5 py-1.5 rounded-xl text-xs font-medium shadow-xs">
          <Lock className="w-3.5 h-3.5 text-bp-text" />
          <span>Read-only archive</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-2xl border border-bp-border p-3.5 sm:p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-bp-muted absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search completed projects by name, code, client, location..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text placeholder-[#64748B] focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-bp-border p-12 text-center shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-bp-muted mx-auto mb-2" />
          <h3 className="text-base font-semibold text-bp-text">No completed projects found</h3>
          <p className="text-xs text-bp-muted max-w-sm mx-auto mt-1">
            When ongoing projects reach completion, authorized managers can mark them as finished to store them in this archive.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-bp-border hover:border-bp-cyan hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden shadow-xs"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-bp-text bg-bp-background px-2 py-0.5 rounded-md border border-bp-border">
                    {p.code}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-bp-background text-bp-text border border-bp-border flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-bp-text" />
                    Archived
                  </span>
                </div>

                <div>
                  <h3
                    className="font-semibold text-[17px] text-bp-text line-clamp-1"
                    title={p.name}
                  >
                    {p.name}
                  </h3>
                  <p className="text-xs text-bp-muted flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-bp-muted shrink-0" />
                    <span className="truncate">{p.client_name}</span>
                  </p>
                </div>

                {p.description && (
                  <p className="text-xs text-bp-muted line-clamp-2 leading-relaxed">{p.description}</p>
                )}

                <div className="space-y-1.5 pt-2.5 border-t border-bp-border text-xs text-bp-muted">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-bp-muted shrink-0" />
                    <span className="truncate font-medium text-bp-text">{p.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-bp-muted shrink-0" />
                    <span className="truncate">PM: <strong className="text-bp-text font-medium">{p.project_manager_name}</strong></span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-bp-muted font-mono">
                    <span>Started: {p.start_date}</span>
                    <span className="text-bp-text font-medium">
                      Finished: {p.actual_completion_date || p.expected_completion_date}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-bp-background px-5 py-3 border-t border-bp-border flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenProject(p)}
                  className="text-xs font-semibold text-bp-text hover:underline flex items-center gap-1 transition-colors"
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
                    className="text-[11px] font-medium text-bp-muted hover:text-bp-text hover:underline transition-colors flex items-center gap-1"
                    title="Company Administrator privilege: Reopen project for corrections"
                  >
                    <RotateCcw className="w-3 h-3 text-bp-text" />
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
        <div className="fixed inset-0 z-50 bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-bp-border animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-bp-text">
              <RotateCcw className="w-5 h-5 text-bp-text" />
              <h3 className="text-base font-bold text-bp-text">Reopen Completed Project</h3>
            </div>
            
            <p className="text-xs text-bp-muted leading-relaxed">
              As a Company Administrator, you can return this project to <strong>Ongoing</strong> status to allow additional stock receipts or usage entries. All existing historical transactions and ledger records will be preserved intact.
            </p>

            {reopenError && (
              <div className="p-2.5 bg-bp-background border border-bp-border rounded-xl text-bp-text text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-bp-text shrink-0" />
                <span>{reopenError}</span>
              </div>
            )}

            <form onSubmit={handleReopenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-bp-text uppercase tracking-wider mb-1">
                  Reason for Reopening <span className="text-bp-cyan">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Additional punch-list finishing works approved; additional 50 bags cement requisitioned."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-bp-border focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReopenProjectId(null)}
                  className="px-4 py-2 text-xs font-medium text-bp-muted hover:bg-bp-background rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReopen}
                  className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
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
