import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  MapPin,
  Calendar,
  User,
  Lock,
  Wrench,
  TrendingUp,
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
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  ClipboardList,
  Users
} from 'lucide-react';
import { Project, UserProfile, ProjectStockMetrics, MaterialCategoryDef } from '../types';
import { dataService } from '../services/dataService';
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
  const [activeTab, setActiveTab] = useState<'materials' | 'progress' | 'sites' | 'reports' | 'attendance'>('materials');
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
      case 'ShieldAlert': return <ShieldAlert className="w-5 h-5 text-[#111111]" />;
      case 'Wrench': return <Wrench className="w-5 h-5 text-[#111111]" />;
      case 'Zap': return <Zap className="w-5 h-5 text-[#111111]" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-[#111111]" />;
      case 'Flame': return <Flame className="w-5 h-5 text-[#111111]" />;
      case 'Droplet': return <Droplet className="w-5 h-5 text-[#111111]" />;
      case 'Paintbrush': return <Paintbrush className="w-5 h-5 text-[#111111]" />;
      case 'Crosshair': return <Crosshair className="w-5 h-5 text-[#111111]" />;
      case 'Grid': return <Grid className="w-5 h-5 text-[#111111]" />;
      case 'PackageCheck': return <PackageCheck className="w-5 h-5 text-[#111111]" />;
      case 'Boxes': return <Boxes className="w-5 h-5 text-[#111111]" />;
      case 'DoorOpen': return <DoorOpen className="w-5 h-5 text-[#111111]" />;
      case 'Umbrella': return <Umbrella className="w-5 h-5 text-[#111111]" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-[#111111]" />;
      case 'Compass': return <Compass className="w-5 h-5 text-[#111111]" />;
      case 'Truck': return <Truck className="w-5 h-5 text-[#111111]" />;
      case 'ClipboardList': return <ClipboardList className="w-5 h-5 text-[#111111]" />;
      default: return <Package className="w-5 h-5 text-[#111111]" />;
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
      <nav className="flex items-center gap-2 text-xs text-[#666666]">
        <button onClick={onNavigateHome} className="hover:text-[#111111] transition-colors">
          Company Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
        <button onClick={onNavigateProjects} className="hover:text-[#111111] transition-colors">
          {isCompleted ? 'Completed Projects' : 'Ongoing Projects'}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
        <span className="font-semibold text-[#111111] truncate max-w-xs">{project.name}</span>
      </nav>

      {/* Modern Workspace Header */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]">
                {project.code}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#FFC400]/20 text-[#111111] border border-[#FFC400]/40">
                {isCompleted ? 'Completed Archive' : 'Active Site'}
              </span>
              {isCompleted && (
                <span className="text-[11px] font-medium text-[#666666] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#111111]" />
                  Read-Only Mode
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-[28px] font-bold text-[#111111] tracking-tight">
              {project.name}
            </h1>

            <p className="text-xs sm:text-sm text-[#666666]">
              Client: <span className="font-semibold text-[#111111]">{project.client_name}</span> &bull; {project.location}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[#E8E8E8] pt-4 md:pt-0 md:pl-6 shrink-0">
            <div>
              <p className="text-xs font-medium text-[#666666]">Project Manager</p>
              <p className="text-sm font-semibold text-[#111111] flex items-center gap-1 mt-0.5">
                <User className="w-3.5 h-3.5 text-[#111111]" />
                {project.project_manager_name}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#666666]">Available Cement</p>
              <p className="text-xl sm:text-2xl font-bold text-[#111111] font-mono tabular-nums mt-0.5">
                {stockMetrics?.totalAvailableBags ?? 0} <span className="text-xs text-[#666666] font-normal">bags</span>
              </p>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="pt-3 border-t border-[#E8E8E8] flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'materials'
                ? 'bg-[#FFC400] text-[#111111] shadow-xs'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7]'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-[#111111]" />
            Materials & Inventory
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'progress'
                ? 'bg-[#111111] text-white'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Work Progress
            <span className="text-[10px] px-1.5 py-0.2 bg-[#F7F7F7] text-[#666666] rounded border border-[#E8E8E8]">
              Phase 2
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sites')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'sites'
                ? 'bg-[#111111] text-white'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Site Locations
            <span className="text-[10px] px-1.5 py-0.2 bg-[#F7F7F7] text-[#666666] rounded border border-[#E8E8E8]">
              Phase 2
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-[#FFC400] text-[#111111] shadow-xs'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Reports & Audits
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-[#FFC400] text-[#111111] shadow-xs'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Attendance & Labor
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
                <h2 className="text-xl sm:text-[22px] font-semibold text-[#111111] tracking-tight flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#111111]" />
                  Primary Structural Materials
                </h2>
                <p className="text-xs text-[#666666]">
                  Real-time stock ledger, delivery challan verification, and consumption tracking.
                </p>
              </div>
              <span className="text-xs font-medium text-[#111111] bg-[#F7F7F7] px-2.5 py-1 rounded-xl border border-[#E8E8E8] self-start sm:self-auto flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#111111]" />
                5 Modules Active
              </span>
            </div>

            {/* 5 Core Material Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              
              {/* 1. CEMENT */}
              <div
                onClick={onOpenCementModule}
                className="bg-white rounded-2xl border border-[#E8E8E8] hover:border-[#FFC400] shadow-xs p-5 flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold text-xs">
                      01
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FFC400]/20 text-[#111111]">
                      Live
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#111111] group-hover:text-black">
                    Cement
                  </h3>
                  <p className="text-xs text-[#666666] mt-1 line-clamp-2">
                    Multi-brand ledger, receipts, pouring consumption & damage tracking.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E8E8E8] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Available:</span>
                    <span className="font-bold text-[#111111] font-mono text-sm">
                      {stockMetrics?.totalAvailableBags ?? 0} bags
                    </span>
                  </div>
                  <button className="w-full py-1.5 px-3 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl transition-colors text-center">
                    Open Ledger &rarr;
                  </button>
                </div>
              </div>

              {/* 2. STEEL MODULE */}
              <div
                onClick={onOpenSteelModule}
                className="bg-white rounded-2xl border border-[#E8E8E8] hover:border-[#FFC400] shadow-xs p-5 flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7F7F7] group-hover:bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold text-xs transition-colors">
                      <Layers className="w-4 h-4 text-[#111111]" />
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]">
                      TMT Rebars
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#111111] group-hover:text-black">
                    Steel
                  </h3>
                  <p className="text-xs text-[#666666] mt-1 line-clamp-2">
                    Tata Tiscon, JSW, SAIL, Vizag & custom brands. Diameters 6mm–32mm.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E8E8E8] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Available:</span>
                    <span className="font-bold text-[#111111] font-mono text-sm">
                      {steelTotalKg !== null ? (
                        steelTotalKg >= 1000 ? `${(steelTotalKg / 1000).toFixed(2)} t` : `${steelTotalKg} kg`
                      ) : 'Live'}
                    </span>
                  </div>
                  <button className="w-full py-1.5 px-3 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl transition-colors text-center">
                    Open Inventory &rarr;
                  </button>
                </div>
              </div>

              {/* 3. SAND MODULE */}
              <div
                onClick={onOpenSandModule}
                className="bg-white rounded-2xl border border-[#E8E8E8] hover:border-[#FFC400] shadow-xs p-5 flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7F7F7] group-hover:bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold text-xs transition-colors">
                      <Mountain className="w-4 h-4 text-[#111111]" />
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]">
                      Aggregates
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#111111] group-hover:text-black">
                    Sand
                  </h3>
                  <p className="text-xs text-[#666666] mt-1 line-clamp-2">
                    River, M-Sand, Pit, Concrete sand with volumetric & mass conversion.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E8E8E8] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Available:</span>
                    <span className="font-bold text-[#111111] font-mono text-sm">
                      {sandTotalCft !== null ? `${sandTotalCft.toLocaleString()} cft` : 'Live'}
                    </span>
                  </div>
                  <button className="w-full py-1.5 px-3 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl transition-colors text-center">
                    Open Inventory &rarr;
                  </button>
                </div>
              </div>

              {/* 4. BRICKS & BLOCKS */}
              <div
                onClick={onOpenBricksModule}
                className="bg-white rounded-2xl border border-[#E8E8E8] hover:border-[#FFC400] shadow-xs p-5 flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7F7F7] group-hover:bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold text-xs transition-colors">
                      <Boxes className="w-4 h-4 text-[#111111]" />
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]">
                      Masonry
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#111111] group-hover:text-black">
                    Bricks & Blocks
                  </h3>
                  <p className="text-xs text-[#666666] mt-1 line-clamp-2">
                    Red clay, Fly Ash, AAC blocks, Porotherm with breakage tracking.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E8E8E8] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Available:</span>
                    <span className="font-bold text-[#111111] font-mono text-sm">
                      {bricksTotalNos !== null ? `${bricksTotalNos.toLocaleString()} Nos` : 'Live'}
                    </span>
                  </div>
                  <button className="w-full py-1.5 px-3 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl transition-colors text-center">
                    Open Inventory &rarr;
                  </button>
                </div>
              </div>

              {/* 5. COARSE AGGREGATE */}
              <div
                onClick={onOpenAggregateModule}
                className="bg-white rounded-2xl border border-[#E8E8E8] hover:border-[#FFC400] shadow-xs p-5 flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7F7F7] group-hover:bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold text-xs transition-colors">
                      <Gem className="w-4 h-4 text-[#111111]" />
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]">
                      Blue Metal
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#111111] group-hover:text-black">
                    Coarse Aggregate
                  </h3>
                  <p className="text-xs text-[#666666] mt-1 line-clamp-2">
                    10mm, 20mm, 40mm, 63mm, 80mm with bulk density conversion.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E8E8E8] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Available:</span>
                    <span className="font-bold text-[#111111] font-mono text-sm">
                      {aggregateTotalTonnes !== null ? `${aggregateTotalTonnes.toLocaleString()} t` : 'Live'}
                    </span>
                  </div>
                  <button className="w-full py-1.5 px-3 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl transition-colors text-center">
                    Open Inventory &rarr;
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* 2. ADDITIONAL CONSTRUCTION MATERIALS & EQUIPMENT */}
          <div className="space-y-4 pt-4 border-t border-[#E8E8E8]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-[22px] font-semibold text-[#111111] tracking-tight flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#111111]" />
                  Material Categories & Equipment
                </h2>
                <p className="text-xs text-[#666666]">
                  Dedicated interactive inventory ledgers for tool checkouts, returns, and consumables.
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setIsAddCatModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Category
                </button>
              )}
            </div>

            {/* Grid of the 9 Expandable Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expandableCategories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => onOpenCategoryModule(cat.id)}
                  className="bg-white rounded-2xl border border-[#E8E8E8] p-5 hover:border-[#FFC400] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F7F7] group-hover:bg-[#FFC400] flex items-center justify-center shrink-0 transition-colors">
                        {getCategoryIcon(cat.iconName)}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                        cat.id === 'regular_site_use'
                          ? 'bg-[#FFC400]/20 text-[#111111] border-[#FFC400]/40 font-semibold'
                          : 'bg-[#F7F7F7] text-[#111111] border-[#E8E8E8]'
                      }`}>
                        {cat.id === 'regular_site_use' ? 'Site Essentials (29 Items)' : (cat.is_reusable ? 'Equipment' : 'Consumables')}
                      </span>
                    </div>

                    <h3 className="text-[17px] font-semibold text-[#111111] group-hover:text-black transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-[#666666] mt-1 line-clamp-2">
                      {cat.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E8E8E8] flex items-center justify-between text-xs">
                    <span className="text-[#666666]">Unit: {cat.default_unit}</span>
                    <span className="font-semibold text-[#111111] group-hover:underline flex items-center gap-1">
                      Open Module &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
            <HireCard
              title="Vehicle Hire"
              description="Manage hired vehicles, operators, working hours, fuel, and supporting documents."
              icon={<Truck className="w-5 h-5 text-[#111111]" />}
              onOpen={onOpenVehicleHire}
            />
            <HireCard
              title="Machinery Hire"
              description="Manage rented machinery, drilling tools, cutting tools, rental costs, and returns."
              icon={<Wrench className="w-5 h-5 text-[#111111]" />}
              onOpen={onOpenMachineryHire}
            />
          </div>

        </div>
      ) : activeTab === 'reports' ? (
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
      ) : (
        /* Placeholder for Phase 2 tabs */
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center space-y-3 shadow-xs">
          <Layers className="w-10 h-10 text-[#666666] mx-auto" />
          <h3 className="text-base font-semibold text-[#111111]">
            {activeTab === 'progress' && 'Work Progress & Milestones'}
            {activeTab === 'sites' && 'Site Locations'}
          </h3>
          <p className="text-xs text-[#666666] max-w-md mx-auto">
            This module is reserved for Phase 2. The database schema and permission tables are configured to support this workflow.
          </p>
          <button
            onClick={() => setActiveTab('materials')}
            className="px-4 py-2 bg-[#FFC400] text-[#111111] text-xs font-semibold rounded-xl hover:bg-[#F0B800] transition-colors inline-block shadow-xs"
          >
            Switch to Materials Section &rarr;
          </button>
        </div>
      )}

      {/* Dynamic Add Category Modal for Administrators */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E8E8E8] max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E8]">
              <h3 className="text-base font-semibold text-[#111111] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#111111]" />
                Add Material Category
              </h3>
              <button onClick={() => setIsAddCatModalOpen(false)} className="text-[#666666] hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {catError && (
              <div className="mt-4 p-2.5 bg-[#F7F7F7] border border-[#E8E8E8] text-[#111111] text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#111111] shrink-0" />
                <span>{catError}</span>
              </div>
            )}

            <form onSubmit={handleAddCategorySubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., HVAC Ducts & Insulation, Solar Equipment"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1">Description / Typical Items</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Flexible ducts, damping sheets, acoustic insulation foam..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1">Default Unit</label>
                  <input
                    type="text"
                    placeholder="Nos, Meters, kg, Sq.Ft"
                    value={newCatUnit}
                    onChange={(e) => setNewCatUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1">Inventory Type</label>
                  <select
                    value={newCatReusable ? 'true' : 'false'}
                    onChange={(e) => setNewCatReusable(e.target.value === 'true')}
                    className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] bg-white font-medium"
                  >
                    <option value="false">Consumable Material</option>
                    <option value="true">Reusable Equipment</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#666666] hover:bg-[#F7F7F7] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="px-4 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl shadow-xs transition-colors"
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
  description: string;
  icon: React.ReactNode;
  onOpen: () => void;
}> = ({ title, description, icon, onOpen }) => (
  <div
    onClick={onOpen}
    className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-[#E8E8E8] bg-white p-5 shadow-xs transition-all hover:border-[#FFC400] hover:shadow-xs"
  >
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F7F7] transition-colors group-hover:bg-[#FFC400]">
          {icon}
        </div>
        <ChevronRight className="h-4 w-4 text-[#888888]" />
      </div>
      <h3 className="text-[17px] font-semibold text-[#111111]">{title}</h3>
      <p className="mt-1 text-xs text-[#666666]">{description}</p>
    </div>
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        onOpen();
      }}
      className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#FFC400] px-3 py-1.5 text-center text-xs font-semibold text-[#111111] transition-colors hover:bg-[#F0B800]"
    >
      Open Module &rarr;
    </button>
  </div>
);
