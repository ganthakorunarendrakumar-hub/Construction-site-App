import React, { useState, useEffect } from 'react';
import { X, Upload, Users, Building2, Phone, UserCheck, AlertTriangle } from 'lucide-react';
import { AttendanceGroup, Project } from '../types';
import { dataService } from '../services/dataService';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (groupData: {
    name: string;
    photo_url?: string;
    leader_name: string;
    leader_phone?: string;
    project_id?: string;
    remarks?: string;
    status?: 'active' | 'inactive';
  }) => Promise<void>;
  editingGroup?: AttendanceGroup | null;
  projects: Project[];
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingGroup,
  projects
}) => {
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [projectId, setProjectId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name);
      setPhotoUrl(editingGroup.photo_url || '');
      setLeaderName(editingGroup.leader_name);
      setLeaderPhone(editingGroup.leader_phone || '');
      setProjectId(editingGroup.project_id || '');
      setRemarks(editingGroup.remarks || '');
      setStatus(editingGroup.status || 'active');
    } else {
      setName('');
      setPhotoUrl('');
      setLeaderName('');
      setLeaderPhone('');
      setProjectId(projects[0]?.id || '');
      setRemarks('');
      setStatus('active');
    }
    setError(null);
  }, [editingGroup?.id, isOpen]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setError(null);
      const res = await dataService.uploadAttachment(file, projectId || 'general');
      setPhotoUrl(res.url);
    } catch (err: any) {
      setError(err.message || 'Failed to process group photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name.');
      return;
    }
    if (!leaderName.trim()) {
      setError('Please provide a supervisor / team leader name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        photo_url: photoUrl.trim() || undefined,
        leader_name: leaderName.trim(),
        leader_phone: leaderPhone.trim() || undefined,
        project_id: projectId || undefined,
        remarks: remarks.trim() || undefined,
        status
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-bp-border max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-bp-navy text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-bp-cyan text-bp-text flex items-center justify-center font-bold">
              <Users className="w-4 h-4 text-bp-text" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editingGroup ? 'Edit Worker Group' : 'Create New Worker Group'}
              </h2>
              <p className="text-[11px] text-bp-muted">
                Group-based workforce and gang management for CHEN INFRA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || uploadingPhoto}
            className="text-bp-muted hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Group Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
                Group Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Dan Group, Ram Group, Tile Masons..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3 py-2 text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Leader Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-bp-text uppercase mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-bp-text" />
                Supervisor / Group Leader *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Daniel Murmu"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-bp-text rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-bp-text uppercase mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-bp-text" />
                Leader Phone (Optional)
              </label>
              <input
                type="tel"
                placeholder="+91 98450 00000"
                value={leaderPhone}
                onChange={(e) => setLeaderPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-bp-text rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
              />
            </div>
          </div>

          {/* Project / Site Assignment */}
          <div>
            <label className="block text-[11px] font-bold text-bp-text uppercase mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-bp-text" />
              Project / Site Assignment
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan bg-white"
            >
              <option value="">Unassigned / Floating Gang</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Group Photo Upload & Preview */}
          <div>
            <label className="block text-[11px] font-bold text-bp-text uppercase mb-1 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-bp-text" />
              Group Photo / Badge (Optional)
            </label>
            
            <div className="flex items-center gap-4">
              {photoUrl ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-bp-border shrink-0 bg-bp-background">
                  <img src={photoUrl} alt="Group preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="absolute top-1 right-1 p-0.5 bg-bp-navy/80 text-white rounded-full hover:bg-bp-navy-deep"
                    title="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-bp-border-strong flex items-center justify-center text-bp-muted shrink-0 bg-bp-background">
                  <Users className="w-6 h-6 text-bp-border-strong" />
                </div>
              )}

              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="block w-full text-xs text-bp-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-bp-navy file:text-bp-cyan hover:file:bg-bp-navy-light file:cursor-pointer"
                />
                <p className="text-[10px] text-bp-muted">
                  {uploadingPhoto ? 'Processing photo...' : 'Upload gang team photo (JPEG, PNG, WEBP)'}
                </p>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
              Work Scope & Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Specialized in RCC casting, brickwork, floor slab bar bending..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 text-xs text-bp-text rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-bp-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || uploadingPhoto}
              className="px-4 py-2 text-xs font-semibold text-bp-muted hover:bg-bp-background rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
