import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Building2,
  Calendar,
  User,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle2,
  Hash,
  ShieldAlert
} from 'lucide-react';
import { Project, ProjectStatus, UserProfile } from '../types';
import { PRESET_USERS } from '../services/dataService';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: {
    name: string;
    code: string;
    client_name: string;
    address: string;
    location: string;
    description: string;
    start_date: string;
    expected_completion_date: string;
    project_manager_id: string;
    project_manager_name: string;
    status: ProjectStatus;
  }) => Promise<Project>;
  currentUser: UserProfile;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [pmId, setPmId] = useState(PRESET_USERS.project_manager.id);
  const [status, setStatus] = useState<ProjectStatus>('in_progress');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCreated, setSuccessCreated] = useState<Project | null>(null);

  if (!isOpen) return null;

  const canCreate = currentUser.role === 'admin' || currentUser.role === 'project_manager';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!canCreate) {
      setErrorMessage('Access Denied: Only Company Administrators and Project Managers can create projects.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Project name is required.');
      return;
    }
    if (!code.trim()) {
      setErrorMessage('Unique project code is required (e.g. PRJ-2026-005).');
      return;
    }
    if (!clientName.trim()) {
      setErrorMessage('Client or Customer name is required.');
      return;
    }
    if (!location.trim()) {
      setErrorMessage('Location (City, State) is required.');
      return;
    }
    if (!startDate) {
      setErrorMessage('Start date is required.');
      return;
    }
    if (!expectedCompletionDate) {
      setErrorMessage('Expected completion date is required.');
      return;
    }
    if (new Date(expectedCompletionDate) < new Date(startDate)) {
      setErrorMessage('Expected completion date cannot be earlier than start date.');
      return;
    }

    const selectedPm = Object.values(PRESET_USERS).find(u => u.id === pmId) || PRESET_USERS.project_manager;

    try {
      setIsSubmitting(true);
      const created = await onSubmit({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        client_name: clientName.trim(),
        address: address.trim(),
        location: location.trim(),
        description: description.trim(),
        start_date: startDate,
        expected_completion_date: expectedCompletionDate,
        project_manager_id: selectedPm.id,
        project_manager_name: selectedPm.full_name,
        status
      });

      setSuccessCreated(created);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save project. Please verify inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setName('');
    setCode('');
    setClientName('');
    setAddress('');
    setLocation('');
    setDescription('');
    setErrorMessage(null);
    setSuccessCreated(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl border border-[#E8E8E8] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between border-b border-[#222222]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFC400] flex items-center justify-center text-[#111111]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Project</h3>
              <p className="text-xs text-[#AAAAAA]">Add a new construction site to your portfolio</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="text-[#AAAAAA] hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner if Saved */}
        {successCreated ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-[#FFC400] text-[#111111] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-[#111111]">Project Registered</h4>
              <p className="text-xs text-[#666666]">
                <strong className="text-[#111111]">{successCreated.name}</strong> ({successCreated.code}) is now active in the system.
              </p>
              <div className="pt-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]">
                  Ongoing Project
                </span>
              </div>
            </div>
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-6 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Done & Return to Projects
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {!canCreate && (
              <div className="bg-[#F7F7F7] border border-[#E8E8E8] text-[#111111] px-4 py-3 rounded-xl flex items-start gap-3 text-xs">
                <ShieldAlert className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Role Restriction</p>
                  <p className="text-[#666666]">Your current role is <strong className="text-[#111111]">{currentUser.role_title}</strong>. Only Company Administrators and Project Managers can create projects.</p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="bg-[#F7F7F7] border border-[#E8E8E8] text-[#111111] px-4 py-3 rounded-xl flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Project Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Project Name <span className="text-[#111111] font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Skyline Commercial Tower - Phase 1"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] placeholder-[#888888] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                />
              </div>

              {/* Unique Project Code */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Project Code <span className="text-[#111111] font-bold">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="PRJ-2026-004"
                    className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] font-mono focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                  />
                </div>
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Client / Customer <span className="text-[#111111] font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Brigade Realty Infrastructure"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Location (City, State) <span className="text-[#111111] font-bold">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Hyderabad, Telangana"
                    className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                  />
                </div>
              </div>

              {/* Project Manager */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Project Manager
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-3" />
                  <select
                    value={pmId}
                    onChange={(e) => setPmId(e.target.value)}
                    className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                  >
                    <option value={PRESET_USERS.project_manager.id}>
                      {PRESET_USERS.project_manager.full_name} (Senior PM)
                    </option>
                    <option value={PRESET_USERS.admin.id}>
                      {PRESET_USERS.admin.full_name} (Director / Admin)
                    </option>
                    <option value={PRESET_USERS.site_engineer.id}>
                      {PRESET_USERS.site_engineer.full_name} (Site In-Charge)
                    </option>
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Start Date <span className="text-[#111111] font-bold">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                />
              </div>

              {/* Expected Completion Date */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Target Completion <span className="text-[#111111] font-bold">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expectedCompletionDate}
                  onChange={(e) => setExpectedCompletionDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Site Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot / Survey No., Landmark, Zone"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Scope & Remarks
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope of work, structural details, concrete grades..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                />
              </div>

              {/* Initial Status */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] transition-colors"
                >
                  <option value="in_progress">Ongoing (Active Site)</option>
                  <option value="planning">Planning & Mobilization</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-[#E8E8E8] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2 text-xs font-semibold text-[#666666] hover:bg-[#F7F7F7] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !canCreate}
                className="px-5 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4 text-[#111111]" />
                {isSubmitting ? 'Saving...' : 'Create Project'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
