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
    <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E8E8] max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold">
              <Users className="w-4 h-4 text-[#111111]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editingGroup ? 'Edit Worker Group' : 'Create New Worker Group'}
              </h2>
              <p className="text-[11px] text-[#888888]">
                Group-based workforce and gang management for CHEN INFRA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-white p-1 rounded-lg transition-colors"
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
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                Group Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Dan Group, Ram Group, Tile Masons..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3 py-2 text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Leader Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#111111]" />
                Supervisor / Group Leader *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Daniel Murmu"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#111111]" />
                Leader Phone (Optional)
              </label>
              <input
                type="tel"
                placeholder="+91 98450 00000"
                value={leaderPhone}
                onChange={(e) => setLeaderPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
              />
            </div>
          </div>

          {/* Project / Site Assignment */}
          <div>
            <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#111111]" />
              Project / Site Assignment
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] bg-white"
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
            <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#111111]" />
              Group Photo / Badge (Optional)
            </label>
            
            <div className="flex items-center gap-4">
              {photoUrl ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#E8E8E8] shrink-0 bg-[#F7F7F7]">
                  <img src={photoUrl} alt="Group preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="absolute top-1 right-1 p-0.5 bg-[#111111]/80 text-white rounded-full hover:bg-black"
                    title="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-[#CCCCCC] flex items-center justify-center text-[#888888] shrink-0 bg-[#F7F7F7]">
                  <Users className="w-6 h-6 text-[#AAAAAA]" />
                </div>
              )}

              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="block w-full text-xs text-[#666666] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#111111] file:text-[#FFC400] hover:file:bg-[#222222] file:cursor-pointer"
                />
                <p className="text-[10px] text-[#888888]">
                  {uploadingPhoto ? 'Processing photo...' : 'Upload gang team photo (JPEG, PNG, WEBP)'}
                </p>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
              Work Scope & Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Specialized in RCC casting, brickwork, floor slab bar bending..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 text-xs text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#666666] hover:bg-[#F7F7F7] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
