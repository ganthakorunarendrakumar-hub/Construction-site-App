import React, { useState, useEffect, useCallback } from 'react';
import {
  Company,
  Project,
  UserProfile,
  CementBrand,
  MaterialLocation,
  MaterialTransaction,
  ProjectStockMetrics,
  SupabaseConfig,
  TransactionType,
  ProjectStatus
} from './types';
import { dataService } from './services/dataService';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { OngoingProjectsView } from './components/OngoingProjectsView';
import { CompletedProjectsView } from './components/CompletedProjectsView';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { CementPage } from './components/CementPage';
import { SteelModule } from './components/SteelModule';
import { SandModule } from './components/SandModule';
import { BricksModule } from './components/BricksModule';
import { AggregateModule } from './components/AggregateModule';
import { GenericEquipmentModule } from './components/GenericEquipmentModule';
import { HireModule } from './components/HireModule';
import { ReportsView } from './components/ReportsView';
import { AttendanceView } from './components/AttendanceView';
import { UserManagementView } from './components/UserManagementView';
import { WorkerPortalView } from './components/WorkerPortalView';
import { LoginPage } from './components/LoginPage';
import { authService } from './services/authService';
import { UserSession } from './types';
import { CreateProjectModal } from './components/CreateProjectModal';
import { CloudSetupModal } from './components/CloudSetupModal';
import { ModalDismissalManager } from './components/ModalDismissalManager';
import { CompanyBrandingContext } from './contexts/CompanyBrandingContext';

type ViewMode = 
  | 'home' 
  | 'ongoing_projects' 
  | 'completed_projects' 
  | 'project_workspace' 
  | 'cement_module'
  | 'steel_module'
  | 'sand_module'
  | 'bricks_module'
  | 'aggregate_module'
  | 'category_module'
  | 'vehicle_hire'
  | 'machinery_hire'
  | 'reports'
  | 'attendance'
  | 'user_management';

export default function App() {
  // Navigation & View state
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('safety_ppe');

  // Modals state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCloudSetupOpen, setIsCloudSetupOpen] = useState(false);

  // Core Data state
  const [company, setCompany] = useState<Company>(() => ({
    id: authService.getCurrentUser().company_id || 'comp-apex-01',
    name: '',
    code: '',
    watermark_enabled: false,
    watermark_opacity: 6,
    watermark_size: 280,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  const [companyLogoDisplayUrl, setCompanyLogoDisplayUrl] = useState<string | undefined>();

  const [session, setSession] = useState<UserSession | null>(() => authService.getSession());
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => authService.getCurrentUser());
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const canViewReports = authService.canPerformAction('view_reports');
  const canViewAttendance = authService.canPerformAction('view_attendance');

  useEffect(() => {
    async function initAuth() {
      try {
        await authService.ensureInitialized();
        const active = authService.getSession();
        setSession(active);
        if (active) {
          const u = authService.getCurrentUser();
          setCurrentUser(u);
          dataService.setCurrentUser(u);
        }
      } finally {
        setIsAuthChecking(false);
      }
    }
    initAuth();
  }, []);

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    const u = authService.getCurrentUser();
    setCurrentUser(u);
    dataService.setCurrentUser(u);
    setCurrentView('home');
  };

  const handleLogout = async () => {
    await authService.logout();
    setSession(null);
    const u = authService.getCurrentUser();
    setCurrentUser(u);
    dataService.setCurrentUser(u);
  };

  const [projects, setProjects] = useState<Project[]>([]);
  const [brands, setBrands] = useState<CementBrand[]>([]);
  const [locations, setLocations] = useState<MaterialLocation[]>([]);
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([]);
  const [stockMetrics, setStockMetrics] = useState<ProjectStockMetrics | null>(null);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(dataService.getConfig());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load all initial data
  const loadData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [comp, allProjects, allBrands] = await Promise.all([
        dataService.getCompany(),
        dataService.getProjects(),
        dataService.getCementBrands()
      ]);

      setCompany(comp);
      try {
        setCompanyLogoDisplayUrl(await dataService.resolveCompanyLogoUrl(comp.logo_url));
      } catch {
        setCompanyLogoDisplayUrl(undefined);
      }
      setProjects(allProjects);
      setBrands(allBrands);
      setSupabaseConfig(dataService.getConfig());

      // If a project is selected, load its locations, transactions and stock
      if (selectedProject) {
        const [locs, txs, metrics] = await Promise.all([
          dataService.getMaterialLocations(selectedProject.id),
          dataService.getCementTransactions(selectedProject.id),
          dataService.calculateCementStock(selectedProject.id)
        ]);
        setLocations(locs);
        setTransactions(txs);
        setStockMetrics(metrics);
      }
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedProject, currentUser.company_id]);

  const handleRefreshData = useCallback(async () => {
    await dataService.syncCloudState();
    await loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived lists
  const ongoingProjects = projects.filter(p => p.status !== 'completed');
  const completedProjects = projects.filter(p => p.status === 'completed');

  // Navigation handlers
  const handleOpenProject = async (project: Project) => {
    // Role check: Site Supervisors can only access assigned sites
    if (
      currentUser.role === 'site_supervisor' &&
      currentUser.assigned_projects &&
      currentUser.assigned_projects.length > 0 &&
      !currentUser.assigned_projects.includes(project.id)
    ) {
      alert(`Access Restricted: As a Site Supervisor, you are only authorized to access your assigned site(s). You do not have permission to view "${project.name}".`);
      return;
    }

    setSelectedProject(project);
    const [locs, txs, metrics] = await Promise.all([
      dataService.getMaterialLocations(project.id),
      dataService.getCementTransactions(project.id),
      dataService.calculateCementStock(project.id)
    ]);
    setLocations(locs);
    setTransactions(txs);
    setStockMetrics(metrics);
    setCurrentView('project_workspace');
  };

  const handleOpenCementModule = () => {
    setCurrentView('cement_module');
  };

  const handleUpdateCompanyName = async (newName: string) => {
    const updated = await dataService.updateCompanyName(newName);
    setCompany(updated);
  };

  const handleSaveCompanyBranding = async (
    settings: { watermark_enabled: boolean; watermark_opacity: number; watermark_size: number },
    logoFile?: File
  ) => {
    const logoUrl = logoFile ? await dataService.uploadCompanyLogo(logoFile) : company.logo_url;
    const updated = await dataService.updateCompanySettings({
      ...settings,
      ...(logoUrl ? { logo_url: logoUrl } : {})
    });
    setCompany(updated);
    try {
      setCompanyLogoDisplayUrl(await dataService.resolveCompanyLogoUrl(updated.logo_url));
    } catch {
      setCompanyLogoDisplayUrl(undefined);
    }
  };

  const handleCreateProject = async (projectData: any) => {
    const created = await dataService.createProject(projectData);
    await loadData();
    return created;
  };

  const handleMarkProjectCompleted = async (projectId: string) => {
    await dataService.markProjectCompleted(projectId);
    await loadData();
  };

  const handleReopenProject = async (projectId: string, reason: string) => {
    await dataService.reopenProject(projectId, reason);
    await loadData();
  };

  const handleSaveCementTransaction = async (txData: any) => {
    const saved = await dataService.recordCementTransaction(txData);
    if (selectedProject) {
      const [txs, metrics] = await Promise.all([
        dataService.getCementTransactions(selectedProject.id),
        dataService.calculateCementStock(selectedProject.id)
      ]);
      setTransactions(txs);
      setStockMetrics(metrics);
    }
    return saved;
  };

  const handleUploadFile = async (file: File) => {
    if (!selectedProject) throw new Error('No project selected');
    return dataService.uploadAttachment(file, selectedProject.id);
  };

  const handleReverseTransaction = async (txId: string, reason: string) => {
    await dataService.reverseTransaction(txId, reason);
    if (selectedProject) {
      const [txs, metrics] = await Promise.all([
        dataService.getCementTransactions(selectedProject.id),
        dataService.calculateCementStock(selectedProject.id)
      ]);
      setTransactions(txs);
      setStockMetrics(metrics);
    }
  };

  const handleAddBrand = async (brandName: string) => {
    const newBrand = await dataService.addCementBrand(brandName);
    const allBrands = await dataService.getCementBrands();
    setBrands(allBrands);
    if (selectedProject) {
      const metrics = await dataService.calculateCementStock(selectedProject.id);
      setStockMetrics(metrics);
    }
    return newBrand;
  };

  const handleSaveSupabaseConfig = async (url: string, key: string) => {
    const res = await dataService.saveConfig(url, key);
    setSupabaseConfig(dataService.getConfig());
    return res;
  };

  const handleTestSupabaseConnection = async () => {
    const res = await dataService.checkLiveConnection();
    setSupabaseConfig(dataService.getConfig());
    return res;
  };

  const handleUpdateProject = async (projectData: any) => {
    if (!editingProject) throw new Error('No project selected for editing.');
    const updated = await dataService.updateProject(editingProject.id, projectData);
    await loadData();
    setEditingProject(null);
    return updated;
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-bp-background flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-bp-cyan border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-bp-text">Verifying Secure Session...</p>
      </div>
    );
  }

  // Authentication Gate: Render secure individual login page if unauthenticated
  if (!session) {
    return (
      <>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <ModalDismissalManager />
      </>
    );
  }

  return (
    <CompanyBrandingContext.Provider value={{ companyName: company.name.trim(), companyLogoUrl: companyLogoDisplayUrl }}>
    <div className="bp-app-shell min-h-screen flex flex-col font-sans lg:flex-row">
      <Navbar
        currentUser={currentUser}
        companyName={company.name}
        companyLogoUrl={companyLogoDisplayUrl}
        activeView={currentView}
        onOpenCloudSetup={() => setIsCloudSetupOpen(true)}
        onNavigateHome={() => setCurrentView('home')}
        onNavigateProjects={() => setCurrentView('ongoing_projects')}
        onNavigateReports={canViewReports ? () => setCurrentView('reports') : undefined}
        onNavigateAttendance={canViewAttendance ? () => setCurrentView('attendance') : undefined}
        onNavigateUserManagement={() => setCurrentView('user_management')}
        onLogout={handleLogout}
        onProfileUpdated={(profile) => {
          setCurrentUser(profile);
          dataService.setCurrentUser(profile);
        }}
        supabaseConfig={supabaseConfig}
        onRefreshData={handleRefreshData}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Viewport */}
      <div className="bp-main-viewport relative min-h-[calc(100vh-68px)] min-w-0 flex-1 lg:min-h-screen">
      {company.watermark_enabled && companyLogoDisplayUrl && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
          <img
            src={companyLogoDisplayUrl}
            alt=""
            className="h-auto max-w-[78vw] object-contain"
            style={{
              width: company.watermark_size ?? 280,
              maxWidth: 'min(78vw, 320px)',
              opacity: (company.watermark_opacity ?? 6) / 100
            }}
          />
        </div>
      )}
      <main className="bp-main-content relative min-w-0 w-full max-w-[1680px] flex-1 px-4 py-5 sm:px-6 sm:py-7 xl:px-9">
        
        {/* ROLE-RESTRICTED VIEW: WORKER PORTAL (Restricted only to own records) */}
        {currentUser.role === 'worker' ? (
          <WorkerPortalView currentUser={currentUser} />
        ) : (
          <>
            {/* VIEW 1: COMPANY HOME SCREEN */}
            {currentView === 'home' && (
              <HomeScreen
                company={company}
                companyLogoDisplayUrl={companyLogoDisplayUrl}
                ongoingProjects={ongoingProjects}
                completedProjects={completedProjects}
                currentUser={currentUser}
                onUpdateCompanyName={handleUpdateCompanyName}
                onSaveCompanyBranding={handleSaveCompanyBranding}
                onNavigateCreateProject={() => setIsCreateProjectOpen(true)}
                onNavigateOngoing={() => setCurrentView('ongoing_projects')}
                onNavigateCompleted={() => setCurrentView('completed_projects')}
                onNavigateReports={canViewReports ? () => setCurrentView('reports') : undefined}
                onNavigateAttendance={canViewAttendance ? () => setCurrentView('attendance') : undefined}
                onNavigateUserManagement={() => setCurrentView('user_management')}
                onOpenProject={handleOpenProject}
              />
            )}

            {/* VIEW 2: ONGOING PROJECTS */}
            {currentView === 'ongoing_projects' && (
              <OngoingProjectsView
                projects={ongoingProjects}
                currentUser={currentUser}
                onOpenProject={handleOpenProject}
                onEditProject={setEditingProject}
                onNavigateCreate={() => setIsCreateProjectOpen(true)}
                onMarkCompleted={handleMarkProjectCompleted}
                onNavigateBack={() => setCurrentView('home')}
              />
            )}

            {/* VIEW 3: COMPLETED PROJECTS */}
            {currentView === 'completed_projects' && (
              <CompletedProjectsView
                projects={completedProjects}
                currentUser={currentUser}
                onOpenProject={handleOpenProject}
                onReopenProject={handleReopenProject}
                onNavigateBack={() => setCurrentView('home')}
              />
            )}

            {/* VIEW 4: PROJECT WORKSPACE */}
            {currentView === 'project_workspace' && selectedProject && (
              <ProjectWorkspace
                project={selectedProject}
                currentUser={currentUser}
                stockMetrics={stockMetrics}
                onOpenCementModule={handleOpenCementModule}
                onOpenSteelModule={() => setCurrentView('steel_module')}
                onOpenSandModule={() => setCurrentView('sand_module')}
                onOpenBricksModule={() => setCurrentView('bricks_module')}
                onOpenAggregateModule={() => setCurrentView('aggregate_module')}
                onOpenCategoryModule={(catId) => {
                  setActiveCategoryId(catId);
                  setCurrentView('category_module');
                }}
                onOpenVehicleHire={() => setCurrentView('vehicle_hire')}
                onOpenMachineryHire={() => setCurrentView('machinery_hire')}
                onNavigateHome={() => setCurrentView('home')}
                onNavigateProjects={() => setCurrentView(selectedProject.status === 'completed' ? 'completed_projects' : 'ongoing_projects')}
              />
            )}

            {/* VIEW 5: CEMENT MODULE (PRESERVED) */}
            {currentView === 'cement_module' && selectedProject && (
              <CementPage
                project={selectedProject}
                currentUser={currentUser}
                brands={brands}
                locations={locations}
                transactions={transactions}
                stockMetrics={stockMetrics}
                onNavigateBack={() => setCurrentView('project_workspace')}
                onNavigateHome={() => setCurrentView('home')}
                onSaveTransaction={handleSaveCementTransaction}
                onUploadFile={handleUploadFile}
                onReverseTransaction={handleReverseTransaction}
                onAddBrand={handleAddBrand}
              />
            )}

            {/* VIEW 6: STEEL MODULE */}
            {currentView === 'steel_module' && selectedProject && (
              <SteelModule
                project={selectedProject}
                currentUser={currentUser}
                locations={locations}
                onNavigateBack={() => setCurrentView('project_workspace')}
                onNavigateHome={() => setCurrentView('home')}
                onUploadFile={handleUploadFile}
              />
            )}

            {/* VIEW 7: SAND MODULE */}
            {currentView === 'sand_module' && selectedProject && (
              <SandModule
                project={selectedProject}
                currentUser={currentUser}
                locations={locations}
                onNavigateBack={() => setCurrentView('project_workspace')}
                onNavigateHome={() => setCurrentView('home')}
                onUploadFile={handleUploadFile}
              />
            )}

            {/* VIEW 8: BRICKS & BLOCKS MODULE */}
            {currentView === 'bricks_module' && selectedProject && (
              <BricksModule
                project={selectedProject}
                currentUser={currentUser}
                locations={locations}
                onNavigateBack={() => setCurrentView('project_workspace')}
                onNavigateHome={() => setCurrentView('home')}
                onUploadFile={handleUploadFile}
              />
            )}

            {/* VIEW 9: COARSE AGGREGATE MODULE */}
            {currentView === 'aggregate_module' && selectedProject && (
              <AggregateModule
                project={selectedProject}
                currentUser={currentUser}
                locations={locations}
                onNavigateBack={() => setCurrentView('project_workspace')}
                onNavigateHome={() => setCurrentView('home')}
                onUploadFile={handleUploadFile}
              />
            )}

            {/* VIEW 10: ADDITIONAL CATEGORIES & EQUIPMENT MODULE */}
            {currentView === 'category_module' && selectedProject && (
              <GenericEquipmentModule
                categoryId={activeCategoryId}
                project={selectedProject}
                currentUser={currentUser}
                locations={locations}
                onNavigateBack={() => setCurrentView('project_workspace')}
                onNavigateHome={() => setCurrentView('home')}
                onUploadFile={handleUploadFile}
              />
            )}

            {currentView === 'vehicle_hire' && selectedProject && (
              <HireModule mode="vehicle" project={selectedProject} currentUser={currentUser} onNavigateBack={() => setCurrentView('project_workspace')} onNavigateHome={() => setCurrentView('home')} onUploadFile={handleUploadFile} />
            )}

            {currentView === 'machinery_hire' && selectedProject && (
              <HireModule mode="machinery" project={selectedProject} currentUser={currentUser} onNavigateBack={() => setCurrentView('project_workspace')} onNavigateHome={() => setCurrentView('home')} onUploadFile={handleUploadFile} />
            )}

            {/* VIEW 11: MATERIALS & STOCK REPORTS */}
            {currentView === 'reports' && (
              <ReportsView
                initialProjectId={selectedProject?.id || 'all'}
                onNavigateBack={() => setCurrentView(selectedProject ? 'project_workspace' : 'home')}
                onNavigateHome={() => setCurrentView('home')}
                onOpenProject={(proj) => {
                  handleOpenProject(proj);
                }}
              />
            )}

            {/* VIEW 12: GROUP-BASED ATTENDANCE & PAYROLL */}
            {currentView === 'attendance' && (
              <AttendanceView
                currentUser={currentUser}
                onNavigateHome={() => setCurrentView('home')}
                onNavigateProjects={() => setCurrentView('ongoing_projects')}
              />
            )}

            {/* VIEW 13: USER MANAGEMENT & SECURITY ACCOUNTS (Admin Only) */}
            {currentView === 'user_management' && (
              <UserManagementView
                onNavigateHome={() => setCurrentView('home')}
              />
            )}
          </>
        )}

      </main>
      </div>

      {/* CREATE PROJECT MODAL */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSubmit={handleCreateProject}
        currentUser={currentUser}
      />

      <CreateProjectModal
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        onSubmit={handleUpdateProject}
        currentUser={currentUser}
        project={editingProject}
      />

      {/* CLOUD DATABASE & SETUP MODAL */}
      <CloudSetupModal
        isOpen={isCloudSetupOpen}
        onClose={() => setIsCloudSetupOpen(false)}
        config={supabaseConfig}
        onSaveConfig={handleSaveSupabaseConfig}
        onTestConnection={handleTestSupabaseConnection}
      />

      <ModalDismissalManager />

    </div>
    </CompanyBrandingContext.Provider>
  );
}
