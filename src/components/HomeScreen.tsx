import React, { useEffect, useState } from 'react';
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
  ShieldCheck,
  Settings2,
  Upload,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { Company, CompanyStockBackgroundSlideshow, Project, StockInventoryModuleId, UserProfile } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { DEFAULT_STOCK_BACKGROUND_SLIDESHOW, MAX_LOCAL_STOCK_BACKGROUND_BYTES, MAX_STOCK_BACKGROUND_IMAGE_BYTES, MAX_STOCK_BACKGROUND_IMAGES, STOCK_INVENTORY_MODULES } from '../utils/stockBackground';

interface StockBackgroundDraftImage {
  id: string;
  name: string;
  size_bytes: number;
  previewUrl?: string;
  url?: string;
  file?: File;
}

interface HomeScreenProps {
  company: Company;
  companyLogoDisplayUrl?: string;
  ongoingProjects: Project[];
  completedProjects: Project[];
  currentUser: UserProfile;
  onUpdateCompanyName: (newName: string) => Promise<void>;
  onSaveCompanyBranding: (
    settings: { watermark_enabled: boolean; watermark_opacity: number; watermark_size: number },
    logoFile: File | undefined,
    slideshow: Omit<CompanyStockBackgroundSlideshow, 'images'> & {
      images: Array<{ id: string; name: string; size_bytes: number; url?: string; file?: File }>;
    }
  ) => Promise<CompanyStockBackgroundSlideshow>;
  resolvedStockBackgroundImages: Array<{ id: string; src: string }>;
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
  companyLogoDisplayUrl,
  resolvedStockBackgroundImages,
  ongoingProjects,
  completedProjects,
  currentUser,
  onUpdateCompanyName,
  onSaveCompanyBranding,
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
  const [isBrandingSettingsOpen, setIsBrandingSettingsOpen] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(companyLogoDisplayUrl);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingNotice, setBrandingNotice] = useState<string | null>(null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [watermarkEnabled, setWatermarkEnabled] = useState(company.watermark_enabled === true);
  const [watermarkOpacity, setWatermarkOpacity] = useState(company.watermark_opacity ?? 6);
  const [watermarkSize, setWatermarkSize] = useState(company.watermark_size ?? 280);
  const [stockSlideshowEnabled, setStockSlideshowEnabled] = useState(company.stock_background_slideshow?.enabled ?? false);
  const [stockTransitionSeconds, setStockTransitionSeconds] = useState(company.stock_background_slideshow?.transition_seconds ?? DEFAULT_STOCK_BACKGROUND_SLIDESHOW.transition_seconds);
  const [stockOverlayOpacity, setStockOverlayOpacity] = useState(company.stock_background_slideshow?.overlay_opacity ?? DEFAULT_STOCK_BACKGROUND_SLIDESHOW.overlay_opacity);
  const [stockModules, setStockModules] = useState<StockInventoryModuleId[]>(company.stock_background_slideshow?.modules ?? [...DEFAULT_STOCK_BACKGROUND_SLIDESHOW.modules]);
  const [stockBackgroundImages, setStockBackgroundImages] = useState<StockBackgroundDraftImage[]>([]);
  const [isValidatingStockImages, setIsValidatingStockImages] = useState(false);

  const canEditCompany = currentUser.role === 'admin';
  const canCreateProject = currentUser.role === 'admin' || currentUser.role === 'project_manager';
  const companyNameConfigured = Boolean(company.name.trim());

  useEffect(() => {
    let previewUrl: string | undefined;
    if (selectedLogoFile) {
      previewUrl = URL.createObjectURL(selectedLogoFile);
      setLogoPreview(previewUrl);
    } else {
      setLogoPreview(companyLogoDisplayUrl);
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [selectedLogoFile, companyLogoDisplayUrl]);

  useEffect(() => {
    setEditNameValue(company.name);
    setWatermarkEnabled(company.watermark_enabled === true);
    setWatermarkOpacity(company.watermark_opacity ?? 6);
    setWatermarkSize(company.watermark_size ?? 280);
  }, [company.name, company.watermark_enabled, company.watermark_opacity, company.watermark_size]);

  useEffect(() => {
    if (isBrandingSettingsOpen && !isSavingBranding) return;
    const slideshow = company.stock_background_slideshow ?? DEFAULT_STOCK_BACKGROUND_SLIDESHOW;
    const resolvedById = new Map(resolvedStockBackgroundImages.map(image => [image.id, image.src]));
    setStockSlideshowEnabled(slideshow.enabled);
    setStockTransitionSeconds(slideshow.transition_seconds);
    setStockOverlayOpacity(slideshow.overlay_opacity);
    setStockModules([...slideshow.modules]);
    setStockBackgroundImages(slideshow.images.map(image => ({
      ...image,
      previewUrl: image.url.startsWith('data:image/') ? image.url : resolvedById.get(image.id)
    })));
  }, [company.stock_background_slideshow, resolvedStockBackgroundImages, isBrandingSettingsOpen, isSavingBranding]);

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

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setBrandingError('Choose a PNG, JPG, or WebP image.');
      return;
    }
    if (file.size <= 0 || file.size > 512 * 1024) {
      setBrandingError('Company logos must be 512 KB or smaller.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const preview = new Image();
    preview.onload = () => {
      URL.revokeObjectURL(previewUrl);
      setBrandingError(null);
      setBrandingNotice(null);
      setSelectedLogoFile(file);
    };
    preview.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      setBrandingError('The selected file is not a readable image. Your current logo is unchanged.');
    };
    preview.src = previewUrl;
  };

  const resetBrandingDraft = () => {
    setSelectedLogoFile(null);
    setWatermarkEnabled(company.watermark_enabled === true);
    setWatermarkOpacity(company.watermark_opacity ?? 6);
    setWatermarkSize(company.watermark_size ?? 280);
    const slideshow = company.stock_background_slideshow ?? DEFAULT_STOCK_BACKGROUND_SLIDESHOW;
    const resolvedById = new Map(resolvedStockBackgroundImages.map(image => [image.id, image.src]));
    setStockSlideshowEnabled(slideshow.enabled);
    setStockTransitionSeconds(slideshow.transition_seconds);
    setStockOverlayOpacity(slideshow.overlay_opacity);
    setStockModules([...slideshow.modules]);
    setStockBackgroundImages(slideshow.images.map(image => ({
      ...image,
      previewUrl: image.url.startsWith('data:image/') ? image.url : resolvedById.get(image.id)
    })));
    setBrandingError(null);
    setBrandingNotice(null);
  };

  const readAndValidateStockImage = async (file: File): Promise<string> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error(`Image “${file.name}” could not be read.`));
      reader.onerror = () => reject(new Error(`Image “${file.name}” could not be read.`));
      reader.readAsDataURL(file);
    });

    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Image “${file.name}” is not a readable image.`));
      image.src = dataUrl;
    });
    return dataUrl;
  };

  const handleStockBackgroundFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setBrandingError(null);
    setBrandingNotice(null);

    if (stockBackgroundImages.length + files.length > MAX_STOCK_BACKGROUND_IMAGES) {
      setBrandingError(`Choose up to ${MAX_STOCK_BACKGROUND_IMAGES} stock background images.`);
      return;
    }
    if (files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) {
      setBrandingError('Stock backgrounds must be PNG, JPG, or WebP images.');
      return;
    }
    if (files.some(file => file.size <= 0 || file.size > MAX_STOCK_BACKGROUND_IMAGE_BYTES)) {
      setBrandingError('Each stock background image must be 1.5 MB or smaller.');
      return;
    }
    const totalBytes = stockBackgroundImages.reduce((total, image) => total + image.size_bytes, 0)
      + files.reduce((total, file) => total + file.size, 0);
    if (totalBytes > MAX_LOCAL_STOCK_BACKGROUND_BYTES) {
      setBrandingError('Keep the combined stock background images under 2 MB for reliable local browser storage.');
      return;
    }

    setIsValidatingStockImages(true);
    try {
      const previews = await Promise.all(files.map(readAndValidateStockImage));
      const additions = files.map((file, index): StockBackgroundDraftImage => ({
        id: `pending-stock-bg-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size_bytes: file.size,
        previewUrl: previews[index],
        file
      }));
      setStockBackgroundImages(previous => [...previous, ...additions]);
    } catch (error) {
      setBrandingError(error instanceof Error ? error.message : 'One or more stock background images could not be previewed.');
    } finally {
      setIsValidatingStockImages(false);
    }
  };

  const moveStockBackgroundImage = (index: number, direction: -1 | 1) => {
    setStockBackgroundImages(previous => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= previous.length) return previous;
      const reordered = [...previous];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      return reordered;
    });
  };

  const toggleStockModule = (moduleId: StockInventoryModuleId, checked: boolean) => {
    setStockModules(previous => checked
      ? Array.from(new Set([...previous, moduleId]))
      : previous.filter(id => id !== moduleId));
  };

  const openBrandingSettings = () => {
    resetBrandingDraft();
    setIsBrandingSettingsOpen(value => !value);
  };

  const handleSaveBranding = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBrandingError(null);
    setBrandingNotice(null);
    if (stockSlideshowEnabled && stockBackgroundImages.length === 0) {
      setBrandingError('Add at least one stock background image before enabling the slideshow.');
      return;
    }
    if (stockSlideshowEnabled && stockModules.length === 0) {
      setBrandingError('Select at least one stock inventory module for the slideshow.');
      return;
    }
    setIsSavingBranding(true);
    try {
      const savedSlideshow = await onSaveCompanyBranding({
        watermark_enabled: watermarkEnabled,
        watermark_opacity: Number(watermarkOpacity),
        watermark_size: Number(watermarkSize)
      }, selectedLogoFile || undefined, {
        enabled: stockSlideshowEnabled,
        transition_seconds: Number(stockTransitionSeconds),
        overlay_opacity: Number(stockOverlayOpacity),
        modules: stockModules,
        images: stockBackgroundImages.map(({ id, name, size_bytes, url, file }) => ({ id, name, size_bytes, url, file }))
      });
      const previousPreviews = new Map(stockBackgroundImages.map(image => [image.id, image.previewUrl]));
      setStockSlideshowEnabled(savedSlideshow.enabled);
      setStockTransitionSeconds(savedSlideshow.transition_seconds);
      setStockOverlayOpacity(savedSlideshow.overlay_opacity);
      setStockModules([...savedSlideshow.modules]);
      setStockBackgroundImages(savedSlideshow.images.map(image => ({
        ...image,
        previewUrl: previousPreviews.get(image.id) || (image.url.startsWith('data:image/') ? image.url : undefined)
      })));
      setSelectedLogoFile(null);
      setBrandingNotice('Company branding settings saved.');
    } catch (error) {
      setBrandingError(error instanceof Error ? error.message : 'Company branding could not be saved.');
    } finally {
      setIsSavingBranding(false);
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

            {/* Company identity and setup */}
            {!companyNameConfigured && canEditCompany ? (
              <form onSubmit={handleSaveCompanyName} className="max-w-xl space-y-2 pt-2">
                <h2 className="text-sm font-semibold text-white">Set Up Your Company</h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <CompanyLogo src={companyLogoDisplayUrl} companyName={company.name} size={36} className="border border-white/20 bg-white" />
                  <label className="sr-only" htmlFor="company-name-setup">Company Name</label>
                  <input
                    id="company-name-setup"
                    type="text"
                    value={editNameValue}
                    onChange={event => setEditNameValue(event.target.value)}
                    autoComplete="organization"
                    maxLength={255}
                    required
                    className="min-h-10 w-full rounded-xl border border-bp-cyan bg-white px-3 py-2 text-sm font-semibold text-bp-text focus:outline-none focus:ring-2 focus:ring-bp-cyan sm:max-w-sm"
                    aria-label="Company Name"
                  />
                  <button
                    type="submit"
                    disabled={isSavingName || !editNameValue.trim()}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-bp-cyan px-4 py-2 text-xs font-semibold text-bp-navy transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    Save Company Name
                  </button>
                </div>
                {editError && <p role="alert" className="text-xs text-rose-200">{editError}</p>}
              </form>
            ) : !companyNameConfigured ? (
              <p className="pt-1 text-sm text-white/75">Company name has not been configured.</p>
            ) : isEditingName ? (
              <form onSubmit={handleSaveCompanyName} className="flex flex-wrap items-center gap-2 pt-1">
                <CompanyLogo src={companyLogoDisplayUrl} companyName={company.name} size={32} className="border border-white/20 bg-white" />
                <input
                  type="text"
                  aria-label="Company Name"
                  autoComplete="organization"
                  maxLength={255}
                  required
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className="w-full rounded-xl border border-bp-cyan bg-bp-background px-3 py-1.5 text-lg font-semibold text-bp-text focus:outline-none focus:ring-1 focus:ring-bp-cyan sm:w-80"
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
              <div className="flex min-w-0 flex-wrap items-center gap-2 pt-0.5">
                <CompanyLogo src={companyLogoDisplayUrl} companyName={company.name} size={34} className="border border-white/20 bg-white" />
                <span className="max-w-full break-words text-sm font-semibold text-white/85 sm:text-base">
                  {company.name}
                </span>
                {canEditCompany && (
                  <button
                    type="button"
                    onClick={() => { setEditNameValue(company.name); setEditError(null); setIsEditingName(true); }}
                    className="rounded-lg p-1 text-bp-border-strong transition-colors hover:bg-white/10 hover:text-white"
                    title="Edit company name"
                    aria-label="Edit company name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canEditCompany && (
                  <button
                    type="button"
                    onClick={openBrandingSettings}
                    className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
                    aria-expanded={isBrandingSettingsOpen}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Company branding
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 md:max-w-xs">
            <div className="bp-dashboard-stat rounded-xl border border-white/10 bg-white/10 px-3.5 py-3">
              <p className="text-[11px] font-medium text-bp-border-strong">Ongoing projects</p>
              <p className="mt-0.5 bp-numeric text-2xl font-semibold text-white">{ongoingProjects.length}</p>
            </div>
            <div className="bp-dashboard-stat rounded-xl border border-white/10 bg-white/10 px-3.5 py-3">
              <p className="text-[11px] font-medium text-bp-border-strong">Completed projects</p>
              <p className="mt-0.5 bp-numeric text-2xl font-semibold text-white">{completedProjects.length}</p>
            </div>
          </div>
        </div>
      </section>

      {isBrandingSettingsOpen && canEditCompany && companyNameConfigured && (
        <section className="rounded-2xl border border-bp-border bg-white p-4 shadow-xs sm:p-5" aria-labelledby="company-branding-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="company-branding-heading" className="text-base font-semibold text-bp-text">Company Branding</h2>
              <p className="mt-0.5 text-xs text-bp-muted">Manage the company logo, watermark, and stock inventory backgrounds.</p>
            </div>
            <button type="button" onClick={() => setIsBrandingSettingsOpen(false)} className="rounded-lg p-2 text-bp-muted hover:bg-bp-background" aria-label="Close company branding settings">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4">
            {brandingError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{brandingError}</p>}
            {brandingNotice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{brandingNotice}</p>}

            <div className="flex flex-col gap-4 rounded-xl border border-bp-border bg-bp-background p-3 sm:flex-row sm:items-center">
              <CompanyLogo src={logoPreview} companyName={company.name} size={68} className="border border-bp-border bg-white p-2" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-bp-text">Company Logo</p>
                <p className="mt-0.5 text-xs text-bp-muted">PNG, JPG, or WebP; maximum 512 KB. The BuildPulse mark is shown when no company logo is saved.</p>
                <label className="mt-2 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-bp-border-strong bg-white px-3 py-2 text-xs font-semibold text-bp-navy hover:border-bp-cyan">
                  <Upload className="h-4 w-4" />
                  {selectedLogoFile ? 'Choose a different logo' : 'Upload or select logo'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoFileChange} className="sr-only" aria-label="Upload company logo" />
                </label>
                {!logoPreview && <span className="ml-2 inline-flex items-center gap-1 text-xs text-bp-muted"><ImageIcon className="h-3.5 w-3.5" /> No logo selected</span>}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
              <div className="space-y-3 rounded-xl border border-bp-border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label htmlFor="company-watermark-toggle" className="text-sm font-semibold text-bp-text">Enable Watermark</label>
                    <p className="mt-0.5 text-xs text-bp-muted">Show the company logo behind application pages.</p>
                  </div>
                  <input
                    id="company-watermark-toggle"
                    type="checkbox"
                    checked={watermarkEnabled}
                    disabled={!company.logo_url && !selectedLogoFile}
                    onChange={event => setWatermarkEnabled(event.target.checked)}
                    className="h-5 w-5 accent-bp-blue disabled:cursor-not-allowed"
                    aria-label="Enable company logo watermark"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-bp-border pt-3">
                  <span className="text-sm font-semibold text-bp-text">Disable Watermark</span>
                  <button type="button" onClick={() => setWatermarkEnabled(false)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!watermarkEnabled ? 'bg-bp-navy text-white' : 'border border-bp-border text-bp-muted hover:bg-bp-background'}`}>
                    Disable
                  </button>
                </div>
                <label className="block text-xs font-medium text-bp-text">
                  Watermark opacity: {watermarkOpacity}%
                  <input type="range" min="1" max="20" value={watermarkOpacity} onChange={event => setWatermarkOpacity(Number(event.target.value))} disabled={!watermarkEnabled} className="mt-2 block w-full accent-bp-blue disabled:opacity-50" />
                </label>
                <label className="block text-xs font-medium text-bp-text">
                  Watermark size: {watermarkSize}px
                  <input type="range" min="120" max="360" step="10" value={watermarkSize} onChange={event => setWatermarkSize(Number(event.target.value))} disabled={!watermarkEnabled} className="mt-2 block w-full accent-bp-blue disabled:opacity-50" />
                </label>
              </div>

              <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-bp-border bg-bp-background p-4" aria-label="Watermark preview">
                {watermarkEnabled && logoPreview ? (
                  <img src={logoPreview} alt="Watermark preview" className="max-h-full max-w-full object-contain" style={{ width: Math.min(watermarkSize, 320), opacity: watermarkOpacity / 100 }} />
                ) : (
                  <div className="text-center text-bp-muted">
                    <CompanyLogo src={logoPreview} companyName={company.name} size={48} className="mx-auto mb-2 bg-white" />
                    <p className="text-xs">Watermark is disabled.</p>
                  </div>
                )}
              </div>
            </div>

            <section className="space-y-4 rounded-xl border border-bp-border bg-white p-3 sm:p-4" aria-labelledby="stock-background-settings-heading">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 id="stock-background-settings-heading" className="text-sm font-semibold text-bp-text">Stock Background Slideshow</h3>
                  <p className="mt-0.5 text-xs text-bp-muted">Use your uploaded photos behind selected inventory pages only.</p>
                </div>
                <label className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-bp-border px-3 py-2 text-xs font-semibold text-bp-text">
                  <input
                    type="checkbox"
                    checked={stockSlideshowEnabled}
                    onChange={event => setStockSlideshowEnabled(event.target.checked)}
                    disabled={isSavingBranding}
                    className="h-4 w-4 accent-bp-blue"
                    aria-label="Enable stock background slideshow"
                  />
                  Enable slideshow
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-bp-muted">{stockBackgroundImages.length} of {MAX_STOCK_BACKGROUND_IMAGES} images · up to 2 MB combined</p>
                <label className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-bp-border-strong bg-white px-3 py-2 text-xs font-semibold text-bp-navy hover:border-bp-cyan ${stockBackgroundImages.length >= MAX_STOCK_BACKGROUND_IMAGES || isValidatingStockImages ? 'pointer-events-none opacity-50' : ''}`}>
                  <Upload className="h-4 w-4" />
                  {isValidatingStockImages ? 'Checking images…' : 'Upload background images'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    disabled={stockBackgroundImages.length >= MAX_STOCK_BACKGROUND_IMAGES || isValidatingStockImages || isSavingBranding}
                    onChange={handleStockBackgroundFiles}
                    className="sr-only"
                    aria-label="Upload multiple stock background images"
                  />
                </label>
              </div>

              {stockBackgroundImages.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {stockBackgroundImages.map((image, index) => (
                    <article key={image.id} className="overflow-hidden rounded-xl border border-bp-border bg-bp-background">
                      <div className="relative flex h-32 items-center justify-center overflow-hidden bg-slate-100">
                        {image.previewUrl ? (
                          <img src={image.previewUrl} alt={`Preview ${index + 1}: ${image.name}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 px-3 text-center text-xs text-bp-muted">
                            <ImageIcon className="h-5 w-5" />
                            Preview unavailable; saved reference is retained
                          </div>
                        )}
                        <span className="absolute left-2 top-2 rounded-md bg-bp-navy/85 px-2 py-1 text-[10px] font-semibold text-white">Image {index + 1}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-bp-text" title={image.name}>{image.name}</p>
                          <p className="text-[10px] text-bp-muted">{image.size_bytes < 1024 ? `${image.size_bytes} B` : `${(image.size_bytes / 1024).toFixed(0)} KB`}</p>
                        </div>
                        <button type="button" onClick={() => moveStockBackgroundImage(index, -1)} disabled={index === 0 || isSavingBranding} className="rounded-lg p-2 text-bp-muted hover:bg-white hover:text-bp-navy disabled:opacity-30" aria-label={`Move ${image.name} earlier`} title="Move earlier">
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => moveStockBackgroundImage(index, 1)} disabled={index === stockBackgroundImages.length - 1 || isSavingBranding} className="rounded-lg p-2 text-bp-muted hover:bg-white hover:text-bp-navy disabled:opacity-30" aria-label={`Move ${image.name} later`} title="Move later">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button type="button" disabled={isSavingBranding} onClick={() => setStockBackgroundImages(previous => previous.filter(item => item.id !== image.id))} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-40" aria-label={`Remove ${image.name}`} title="Remove image">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-bp-border-strong bg-bp-background px-4 py-6 text-center text-xs text-bp-muted">
                  No background images selected. The stock pages will keep their current background.
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block text-xs font-medium text-bp-text">
                  Transition speed: {stockTransitionSeconds} seconds
                  <input type="range" min="5" max="15" step="1" value={stockTransitionSeconds} onChange={event => setStockTransitionSeconds(Number(event.target.value))} disabled={isSavingBranding} className="mt-2 block w-full accent-bp-blue disabled:opacity-50" />
                </label>
                <label className="block text-xs font-medium text-bp-text">
                  Background overlay: {stockOverlayOpacity}%
                  <input type="range" min="0" max="80" step="5" value={stockOverlayOpacity} onChange={event => setStockOverlayOpacity(Number(event.target.value))} disabled={isSavingBranding} className="mt-2 block w-full accent-bp-blue disabled:opacity-50" />
                </label>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-bp-text">Show slideshow in these modules</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {STOCK_INVENTORY_MODULES.map(module => (
                    <label key={module.id} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-bp-border bg-bp-background px-3 py-2 text-xs text-bp-text">
                      <input
                        type="checkbox"
                        checked={stockModules.includes(module.id)}
                        onChange={event => toggleStockModule(module.id, event.target.checked)}
                        disabled={isSavingBranding}
                        className="h-4 w-4 accent-bp-blue"
                      />
                      {module.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>

            <div className="flex flex-col-reverse gap-2 border-t border-bp-border pt-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => { resetBrandingDraft(); setIsBrandingSettingsOpen(false); }} disabled={isSavingBranding} className="min-h-10 rounded-xl px-3 text-xs font-semibold text-bp-muted hover:bg-bp-background disabled:opacity-50">Cancel</button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => { setWatermarkEnabled(false); setWatermarkOpacity(6); setWatermarkSize(280); }} disabled={isSavingBranding} className="min-h-10 rounded-xl border border-bp-border px-3 text-xs font-semibold text-bp-muted hover:bg-bp-background disabled:opacity-50">Reset watermark defaults</button>
                <button type="submit" disabled={isSavingBranding} className="min-h-10 rounded-xl bg-bp-navy px-4 text-xs font-semibold text-white hover:bg-bp-blue disabled:opacity-50">{isSavingBranding ? 'Saving…' : 'Save Settings'}</button>
              </div>
            </div>
          </form>
        </section>
      )}

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
            <ArrowRight className="h-4 w-4 shrink-0 text-bp-muted transition-transform group-hover:translate-x-0.5" />
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
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-bp-muted transition-transform group-hover:translate-x-0.5" />
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
              <ArrowRight className="h-4 w-4 shrink-0 text-bp-muted transition-transform group-hover:translate-x-0.5" />
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
