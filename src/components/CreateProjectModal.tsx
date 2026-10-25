import React, { useEffect, useState } from 'react';
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
import { AuthAccount, Project, ProjectStatus, UserProfile } from '../types';
import { authService } from '../services/authService';
import { getLocalDateString, getLocalDateStringOffset } from '../utils/dateUtils';

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
  project?: Project | null;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  project = null
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    getLocalDateStringOffset(180)
  );
  const [projectManagers, setProjectManagers] = useState<AuthAccount[]>([]);
  const [pmId, setPmId] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('in_progress');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCreated, setSuccessCreated] = useState<Project | null>(null);

  const isEditMode = Boolean(project);
  const hasCustomProjectManager = Boolean(
    project && !projectManagers.some(user =>
      user.auth_uid === project.project_manager_id || user.user_id === project.project_manager_id
    )
  );

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    authService.getProjectManagerCandidates()
      .then(accounts => {
        if (active) setProjectManagers(accounts);
      })
      .catch(() => {
        if (active) setProjectManagers([]);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !project || projectManagers.length === 0) return;
    const matchingManager = projectManagers.find(user =>
      user.auth_uid === project.project_manager_id || user.user_id === project.project_manager_id
    );
    if (matchingManager) setPmId(matchingManager.auth_uid);
  }, [isOpen, project?.id, project?.project_manager_id, projectManagers]);

  useEffect(() => {
    if (isOpen && project) {
      setName(project.name);
      setCode(project.code);
      setClientName(project.client_name);
      setAddress(project.address);
      setLocation(project.location);
      setDescription(project.description);
      setStartDate(project.start_date);
      setExpectedCompletionDate(project.expected_completion_date);
      setPmId(project.project_manager_id);
      setStatus(project.status === 'completed' ? 'in_progress' : project.status);
      setErrorMessage(null);
      setSuccessCreated(null);
    }
  }, [isOpen, project]);

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
      setErrorMessage('Unique project code is required.');
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
    const today = getLocalDateString();
    if (expectedCompletionDate < startDate) {
      setErrorMessage('Expected completion date cannot be earlier than start date.');
      return;
    }
    if (status === 'in_progress' && startDate > today) {
      setErrorMessage("An ongoing project's start date cannot be in the future.");
      return;
    }
    if (status === 'planning' && startDate < today) {
      setErrorMessage("A planning project's start date cannot be in the past.");
      return;
    }

    const selectedPm = projectManagers.find(user =>
      user.auth_uid === pmId || user.user_id === pmId
    );
    const preservingLegacyAssignment = Boolean(
      isEditMode && project && pmId === project.project_manager_id && !selectedPm
    );

    if (!selectedPm && !preservingLegacyAssignment) {
      setErrorMessage('Please select an active eligible project manager.');
      return;
    }

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
        project_manager_id: selectedPm?.auth_uid || project!.project_manager_id,
        project_manager_name: selectedPm?.full_name || project!.project_manager_name,
        status
      });

      if (isEditMode) {
        window.alert('Project updated successfully.');
        resetAndClose();
      } else {
        setSuccessCreated(created);
      }
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
    setStartDate(getLocalDateString());
    setExpectedCompletionDate(getLocalDateStringOffset(180));
    setPmId('');
    setStatus('in_progress');
    setErrorMessage(null);
    setSuccessCreated(null);
    onClose();
  };

  const handleUserClose = () => {
    if (isSubmitting) return;
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl border border-bp-border w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-bp-navy text-white px-6 py-4 flex items-center justify-between border-b border-bp-navy-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-bp-cyan flex items-center justify-center text-bp-text">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{isEditMode ? 'Edit Project' : 'Create Project'}</h3>
              <p className="text-xs text-bp-border-strong">{isEditMode ? 'Update the existing construction site details' : 'Add a new construction site to your portfolio'}</p>
            </div>
          </div>
          <button
            onClick={handleUserClose}
            className="text-bp-border-strong hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner if Saved */}
        {successCreated ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-bp-cyan text-bp-text rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-bp-text">Project Registered</h4>
              <p className="text-xs text-bp-muted">
                <strong className="text-bp-text">{successCreated.name}</strong> ({successCreated.code}) is now active in the system.
              </p>
              <div className="pt-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-bp-background text-bp-text border border-bp-border">
                  Ongoing Project
                </span>
              </div>
            </div>
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={handleUserClose}
                className="px-6 py-2.5 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Done & Return to Projects
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {!canCreate && (
              <div className="bg-bp-background border border-bp-border text-bp-text px-4 py-3 rounded-xl flex items-start gap-3 text-xs">
                <ShieldAlert className="w-4 h-4 text-bp-text shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Role Restriction</p>
                  <p className="text-bp-muted">Your current role is <strong className="text-bp-text">{currentUser.role_title}</strong>. Only Company Administrators and Project Managers can create projects.</p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="bg-bp-background border border-bp-border text-bp-text px-4 py-3 rounded-xl flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 text-bp-text shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Project Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                  Project Name <span className="text-bp-text font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                />
              </div>

              {/* Unique Project Code */}
              <div>
                <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                  Project Code <span className="text-bp-text font-bold">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-bp-muted absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text font-mono focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                  />
                </div>
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                  Client / Customer <span className="text-bp-text font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                  Location (City, State) <span className="text-bp-text font-bold">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-bp-muted absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                  />
                </div>
              </div>

              {/* Project Manager */}
              <div>
                <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                  Project Manager
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-bp-muted absolute left-3 top-3" />
                  <select
                    value={pmId}
                    onChange={(e) => setPmId(e.target.value)}
                    required={!isEditMode}
                    className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                  >
                    <option value="" disabled>
                      {projectManagers.length > 0 ? 'Select a project manager' : 'No eligible active managers found'}
                    </option>
                    {hasCustomProjectManager && project && (
                      <option value={project.project_manager_id}>
                        {project.project_manager_name} (Current Manager)
                      </option>
                    )}
                    {projectManagers.map(manager => (
                      <option key={manager.auth_uid} value={manager.auth_uid}>
                        {manager.full_name} ({manager.role_title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                  Start Date <span className="text-bp-text font-bold">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                />
              </div>

              {/* Expected Completion Date */}
              <div>
                <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                  Target Completion <span className="text-bp-text font-bold">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expectedCompletionDate}
                  onChange={(e) => setExpectedCompletionDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                  Site Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                  Scope & Remarks
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                />
              </div>

              {/* Initial Status */}
              <div>
                <label className="block text-xs font-semibold text-bp-text uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan transition-colors"
                >
                  <option value="in_progress">Ongoing (Active Site)</option>
                  <option value="planning">Planning & Mobilization</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-bp-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleUserClose}
                className="px-4 py-2 text-xs font-semibold text-bp-muted hover:bg-bp-background rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !canCreate}
                className="px-5 py-2.5 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4 text-bp-text" />
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
