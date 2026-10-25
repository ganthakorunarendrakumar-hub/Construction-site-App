import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  Lock,
  Wrench,
  FileSpreadsheet,
  ChevronRight,
  Mountain,
  Boxes,
  Gem,
  ShieldAlert,
  Zap,
  Cpu,
  Flame,
  Droplet,
  Paintbrush,
  Crosshair,
  Grid,
  PackageCheck,
  DoorOpen,
  Umbrella,
  Compass,
  Truck,
  Plus,
  X,
  AlertTriangle,
  SlidersHorizontal,
  Sparkles,
  ClipboardList,
  Users
} from 'lucide-react';
import { Project, UserProfile, ProjectStockMetrics, MaterialCategoryDef } from '../types';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import { ReportsView } from './ReportsView';
import { AttendanceView } from './AttendanceView';

interface ProjectWorkspaceProps {
  project: Project;
  currentUser: UserProfile;
  stockMetrics: ProjectStockMetrics | null;
  onOpenCementModule: () => void;
  onOpenSteelModule: () => void;
  onOpenSandModule: () => void;
  onOpenBricksModule: () => void;
  onOpenAggregateModule: () => void;
  onOpenCategoryModule: (categoryId: string) => void;
  onOpenVehicleHire: () => void;
  onOpenMachineryHire: () => void;
  onNavigateHome: () => void;
  onNavigateProjects: () => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  currentUser,
  stockMetrics,
  onOpenCementModule,
  onOpenSteelModule,
  onOpenSandModule,
  onOpenBricksModule,
  onOpenAggregateModule,
  onOpenCategoryModule,
  onOpenVehicleHire,
  onOpenMachineryHire,
  onNavigateHome,
  onNavigateProjects
}) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'reports' | 'attendance'>('materials');
  const [categories, setCategories] = useState<MaterialCategoryDef[]>([]);
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatUnit, setNewCatUnit] = useState('Nos');
  const [newCatReusable, setNewCatReusable] = useState(false);
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Quick summary stats for core modules
  const [steelTotalKg, setSteelTotalKg] = useState<number | null>(null);
  const [sandTotalCft, setSandTotalCft] = useState<number | null>(null);
  const [bricksTotalNos, setBricksTotalNos] = useState<number | null>(null);
  const [aggregateTotalTonnes, setAggregateTotalTonnes] = useState<number | null>(null);

  const isCompleted = project.status === 'completed';
  const isAdmin = currentUser.role === 'admin';
  const canViewReports = authService.canPerformAction('view_reports');

  const loadCategoriesAndStats = async () => {
    try {
      const allCats = await dataService.getCategories();
      setCategories(allCats);

      // Load stock metrics for other core modules
      const [steelStats, sandStats, brickStats, aggStats] = await Promise.all([
        dataService.calculateCategoryStock(project.id, 'steel'),
        dataService.calculateCategoryStock(project.id, 'sand'),
        dataService.calculateCategoryStock(project.id, 'bricks'),
        dataService.calculateCategoryStock(project.id, 'aggregate')
      ]);

      setSteelTotalKg(steelStats.totalAvailableAggregate);
      setSandTotalCft(sandStats.totalAvailableAggregate);
      setBricksTotalNos(brickStats.totalAvailableAggregate);
      setAggregateTotalTonnes(aggStats.totalAvailableAggregate);
    } catch (e) {
      console.warn('Error loading categories & stats', e);
    }
  };

  useEffect(() => {
    loadCategoriesAndStats();
  }, [project.id]);

  const openAddCategory = () => {
    setNewCatName('');
    setNewCatDesc('');
    setNewCatUnit('Nos');
    setNewCatReusable(false);
    setCatError(null);
    setIsAddCatModalOpen(true);
  };

  const closeAddCategory = () => {
    if (catSaving) return;
    setIsAddCatModalOpen(false);
    setNewCatName('');
    setNewCatDesc('');
    setNewCatUnit('Nos');
    setNewCatReusable(false);
    setCatError(null);
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    if (!newCatName.trim()) {
      setCatError('Category name is required.');
      return;
    }
    try {
      setCatSaving(true);
      await dataService.addCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        default_unit: newCatUnit.trim() || 'Nos',
        is_reusable: newCatReusable,
        allowed_units: [newCatUnit.trim() || 'Nos']
      });
      setNewCatName('');
      setNewCatDesc('');
      setNewCatUnit('Nos');
      setNewCatReusable(false);
      setIsAddCatModalOpen(false);
      await loadCategoriesAndStats();
    } catch (err: any) {
      setCatError(err.message || 'Failed to add category');
    } finally {
      setCatSaving(false);
    }
  };

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'ShieldAlert': return <ShieldAlert className="w-5 h-5 text-bp-text" />;
      case 'Wrench': return <Wrench className="w-5 h-5 text-bp-text" />;
      case 'Zap': return <Zap className="w-5 h-5 text-bp-text" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-bp-text" />;
      case 'Flame': return <Flame className="w-5 h-5 text-bp-text" />;
      case 'Droplet': return <Droplet className="w-5 h-5 text-bp-text" />;
      case 'Paintbrush': return <Paintbrush className="w-5 h-5 text-bp-text" />;
      case 'Crosshair': return <Crosshair className="w-5 h-5 text-bp-text" />;
      case 'Grid': return <Grid className="w-5 h-5 text-bp-text" />;
      case 'PackageCheck': return <PackageCheck className="w-5 h-5 text-bp-text" />;
      case 'Boxes': return <Boxes className="w-5 h-5 text-bp-text" />;
      case 'DoorOpen': return <DoorOpen className="w-5 h-5 text-bp-text" />;
      case 'Umbrella': return <Umbrella className="w-5 h-5 text-bp-text" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-bp-text" />;
      case 'Compass': return <Compass className="w-5 h-5 text-bp-text" />;
      case 'Truck': return <Truck className="w-5 h-5 text-bp-text" />;
      case 'ClipboardList': return <ClipboardList className="w-5 h-5 text-bp-text" />;
      default: return <Package className="w-5 h-5 text-bp-text" />;
    }
  };

  // Priority ordering to place Regular Site-Use Materials alongside Safety Items & PPE, Hand Tools, and Power Tools
  const priorityOrder: Record<string, number> = {
    regular_site_use: 1,
    safety_ppe: 2,
    hand_tools: 3,
    power_tools: 4,
    electrical: 5
  };

  // Filter out core categories from the expandable secondary section and sort by priority
  const expandableCategories = [...categories]
    .filter(c => !c.is_core)
    .sort((a, b) => {
      const pA = priorityOrder[a.id] ?? 99;
      const pB = priorityOrder[b.id] ?? 99;
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-bp-muted">
        <button onClick={onNavigateHome} className="hover:text-bp-text transition-colors">
          Company Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-bp-muted" />
        <button onClick={onNavigateProjects} className="hover:text-bp-text transition-colors">
          {isCompleted ? 'Completed Projects' : 'Ongoing Projects'}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-bp-muted" />
        <span className="font-semibold text-bp-text truncate max-w-xs">{project.name}</span>
      </nav>

      {/* Modern Workspace Header */}
      <div className="bg-white rounded-2xl border border-bp-border p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-bp-background text-bp-text border border-bp-border">
                {project.code}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-bp-cyan/20 text-bp-text border border-bp-cyan/40">
                {isCompleted ? 'Completed Archive' : 'Active Site'}
              </span>
              {isCompleted && (
                <span className="text-[11px] font-medium text-bp-muted flex items-center gap-1">
                  <Lock className="w-3 h-3 text-bp-text" />
                  Read-Only Mode
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-[28px] font-bold text-bp-text tracking-tight">
              {project.name}
            </h1>

            <p className="text-xs sm:text-sm text-bp-muted">
              Client: <span className="font-semibold text-bp-text">{project.client_name}</span> &bull; {project.location} &bull; Manager: <span className="font-semibold text-bp-text">{project.project_manager_name}</span>
            </p>
          </div>

        </div>

        {/* Section Tabs */}
        <div className="pt-3 border-t border-bp-border flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'materials'
                ? 'bg-bp-cyan text-bp-text shadow-xs'
                : 'text-bp-muted hover:text-bp-text hover:bg-bp-background'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-bp-text" />
            Materials
          </button>

          {canViewReports && <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-bp-cyan text-bp-text shadow-xs'
                : 'text-bp-muted hover:text-bp-text hover:bg-bp-background'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Reports
          </button>}

          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-bp-cyan text-bp-text shadow-xs'
                : 'text-bp-muted hover:text-bp-text hover:bg-bp-background'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Attendance
          </button>
        </div>
      </div>

      {/* MATERIALS SECTION */}
      {activeTab === 'materials' ? (
        <div className="space-y-6 sm:space-y-8">
          
          {/* 1. PRIMARY BULK MATERIALS (5 Core Modules) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl sm:text-[22px] font-semibold text-bp-text tracking-tight flex items-center gap-2">
                  <Package className="w-5 h-5 text-bp-text" />
                  Primary Structural Materials
                </h2>
              </div>
            </div>

            {/* 5 Core Material Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              
              {/* 1. CEMENT */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Open cement ledger"
                onClick={onOpenCementModule}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenCementModule(); } }}
                className="bg-white rounded-2xl border border-bp-border hover:border-bp-cyan shadow-xs p-5 flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-bp-cyan text-bp-text flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-bp-text group-hover:text-bp-text">
                    Cement
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-bp-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-bp-muted">Available:</span>
                    <span className="font-bold text-bp-text bp-numeric text-sm">
                      {stockMetrics?.totalAvailableBags ?? 0} bags
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. STEEL MODULE */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Open steel inventory"
                onClick={onOpenSteelModule}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenSteelModule(); } }}
                className="bg-white rounded-2xl border border-bp-border hover:border-bp-cyan shadow-xs p-5 flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center mb-3">
                    <div className="w-9 h-9 rounded-xl bg-bp-background group-hover:bg-bp-cyan text-bp-text flex items-center justify-center font-bold text-xs transition-colors">
                      <Layers className="w-4 h-4 text-bp-text" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-bp-text group-hover:text-bp-text">
                    Steel
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-bp-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-bp-muted">Available:</span>
                    <span className="font-bold text-bp-text bp-numeric text-sm">
                      {steelTotalKg !== null ? (
                        steelTotalKg >= 1000 ? `${(steelTotalKg / 1000).toFixed(2)} t` : `${steelTotalKg} kg`
                      ) : 'Live'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. SAND MODULE */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Open sand inventory"
                onClick={onOpenSandModule}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenSandModule(); } }}
                className="bg-white rounded-2xl border border-bp-border hover:border-bp-cyan shadow-xs p-5 flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center mb-3">
                    <div className="w-9 h-9 rounded-xl bg-bp-background group-hover:bg-bp-cyan text-bp-text flex items-center justify-center font-bold text-xs transition-colors">
                      <Mountain className="w-4 h-4 text-bp-text" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-bp-text group-hover:text-bp-text">
                    Sand
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-bp-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-bp-muted">Available:</span>
                    <span className="font-bold text-bp-text bp-numeric text-sm">
                      {sandTotalCft !== null ? `${sandTotalCft.toLocaleString()} cft` : 'Live'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. BRICKS & BLOCKS */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Open bricks and blocks inventory"
                onClick={onOpenBricksModule}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenBricksModule(); } }}
                className="bg-white rounded-2xl border border-bp-border hover:border-bp-cyan shadow-xs p-5 flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center mb-3">
                    <div className="w-9 h-9 rounded-xl bg-bp-background group-hover:bg-bp-cyan text-bp-text flex items-center justify-center font-bold text-xs transition-colors">
                      <Boxes className="w-4 h-4 text-bp-text" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-bp-text group-hover:text-bp-text">
                    Bricks & Blocks
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-bp-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-bp-muted">Available:</span>
                    <span className="font-bold text-bp-text bp-numeric text-sm">
                      {bricksTotalNos !== null ? `${bricksTotalNos.toLocaleString()} Nos` : 'Live'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. COARSE AGGREGATE */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Open aggregate inventory"
                onClick={onOpenAggregateModule}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenAggregateModule(); } }}
                className="bg-white rounded-2xl border border-bp-border hover:border-bp-cyan shadow-xs p-5 flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center mb-3">
                    <div className="w-9 h-9 rounded-xl bg-bp-background group-hover:bg-bp-cyan text-bp-text flex items-center justify-center font-bold text-xs transition-colors">
                      <Gem className="w-4 h-4 text-bp-text" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-bp-text group-hover:text-bp-text">
                    Coarse Aggregate
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-bp-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-bp-muted">Available:</span>
                    <span className="font-bold text-bp-text bp-numeric text-sm">
                      {aggregateTotalTonnes !== null ? `${aggregateTotalTonnes.toLocaleString()} t` : 'Live'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 2. ADDITIONAL CONSTRUCTION MATERIALS & EQUIPMENT */}
          <div className="space-y-4 pt-4 border-t border-bp-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-[22px] font-semibold text-bp-text tracking-tight flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-bp-text" />
                  Material Categories & Equipment
                </h2>
              </div>

              {isAdmin && (
                <button
                  onClick={openAddCategory}
                  className="px-3.5 py-1.5 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Category
                </button>
              )}
            </div>

            {/* Material categories with hire modules after site-use materials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expandableCategories.map((cat) => (
                <React.Fragment key={cat.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenCategoryModule(cat.id)}
                    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenCategoryModule(cat.id); } }}
                    className="group flex cursor-pointer flex-col justify-between rounded-xl border border-bp-border bg-white p-4 transition-colors hover:border-bp-cyan hover:bg-bp-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
                  >
                    <div>
                      <div className="mb-3 flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-bp-background group-hover:bg-bp-cyan flex items-center justify-center shrink-0 transition-colors">
                          {getCategoryIcon(cat.iconName)}
                        </div>
                      </div>

                      <h3 className="text-[17px] font-semibold text-bp-text group-hover:text-bp-text transition-colors">
                        {cat.name}
                      </h3>
                    </div>

                    <div className="mt-5 pt-3 border-t border-bp-border flex items-center justify-between text-xs">
                      <span className="text-bp-muted">Unit: {cat.default_unit}</span>
                      <span className="font-semibold text-bp-text group-hover:underline flex items-center gap-1">
                        Open Module &rarr;
                      </span>
                    </div>
                  </div>
                  {cat.id === 'regular_site_use' && (
                    <>
                      <HireCard
                        title="Vehicle Hire"
                        icon={<Truck className="w-5 h-5 text-bp-text" />}
                        onOpen={onOpenVehicleHire}
                      />
                      <HireCard
                        title="Machinery Hire"
                        icon={<Wrench className="w-5 h-5 text-bp-text" />}
                        onOpen={onOpenMachineryHire}
                      />
                    </>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

        </div>
      ) : activeTab === 'reports' && canViewReports ? (
        /* LIVE REPORTS & INVENTORY AUDITS */
        <ReportsView
          initialProjectId={project.id}
          onNavigateBack={() => setActiveTab('materials')}
          onNavigateHome={onNavigateHome}
        />
      ) : activeTab === 'attendance' ? (
        /* GROUP-BASED ATTENDANCE & PAYROLL */
        <AttendanceView
          currentUser={currentUser}
          onNavigateHome={onNavigateHome}
          onNavigateProjects={onNavigateProjects}
        />
      ) : null}

      {/* Dynamic Add Category Modal for Administrators */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-bp-border max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-bp-border">
              <h3 className="text-base font-semibold text-bp-text flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-bp-text" />
                Add Material Category
              </h3>
              <button type="button" onClick={closeAddCategory} disabled={catSaving} className="text-bp-muted hover:text-bp-text disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {catError && (
              <div className="mt-4 p-2.5 bg-bp-background border border-bp-border text-bp-text text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-bp-text shrink-0" />
                <span>{catError}</span>
              </div>
            )}

            <form onSubmit={handleAddCategorySubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-bp-text uppercase mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., HVAC Ducts & Insulation, Solar Equipment"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-bp-border rounded-xl focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-bp-text uppercase mb-1">Description / Typical Items</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Flexible ducts, damping sheets, acoustic insulation foam..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-bp-border rounded-xl focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bp-text uppercase mb-1">Default Unit</label>
                  <input
                    type="text"
                    placeholder="Nos, Meters, kg, Sq.Ft"
                    value={newCatUnit}
                    onChange={(e) => setNewCatUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-bp-border rounded-xl focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bp-text uppercase mb-1">Inventory Type</label>
                  <select
                    value={newCatReusable ? 'true' : 'false'}
                    onChange={(e) => setNewCatReusable(e.target.value === 'true')}
                    className="w-full px-3.5 py-2.5 border border-bp-border rounded-xl focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan bg-white font-medium"
                  >
                    <option value="false">Consumable Material</option>
                    <option value="true">Reusable Equipment</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-bp-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddCategory}
                  disabled={catSaving}
                  className="px-4 py-2 text-xs font-medium text-bp-muted hover:bg-bp-background rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {catSaving ? 'Saving...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const HireCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  onOpen: () => void;
}> = ({ title, icon, onOpen }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onOpen}
    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }}
    className="group flex cursor-pointer flex-col justify-between rounded-xl border border-bp-border bg-white p-4 transition-colors hover:border-bp-cyan hover:bg-bp-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
  >
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bp-background transition-colors group-hover:bg-bp-cyan">
          {icon}
        </div>
      </div>
      <h3 className="text-[17px] font-semibold text-bp-text">{title}</h3>
    </div>
    <span className="mt-4 flex items-center justify-between border-t border-bp-border pt-3 text-xs font-semibold text-bp-text">
      Open module <ChevronRight className="h-4 w-4 text-bp-muted" />
    </span>
  </div>
);
