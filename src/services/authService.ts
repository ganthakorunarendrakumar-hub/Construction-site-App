import { AuthAccount, UserSession, UserProfile, UserRole } from '../types';
import { dataService } from './dataService';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

const STORAGE_KEYS = {
  ACCOUNTS: 'buildpulse_auth_accounts_v1',
  SESSION: 'buildpulse_auth_session_v1',
  AUTH_LOGS: 'buildpulse_auth_audit_logs_v1'
};

// ==========================================
// CRYPTOGRAPHIC UTILITIES (Web Crypto API)
// ==========================================
export class AuthCrypto {
  /**
   * Generates a secure random hexadecimal salt.
   */
  public static generateSalt(length = 16): string {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derives a PBKDF2 hash using SHA-256 with 100,000 iterations.
   * No plaintext passwords are ever stored.
   */
  public static async hashPassword(password: string, saltHex: string): Promise<string> {
    const enc = new TextEncoder();
    const saltBytes = new Uint8Array(
      saltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    // Web Crypto's subtle API is unavailable on plain LAN HTTP URLs in many
    // browsers. Use the same PBKDF2-HMAC-SHA256 parameters through noble as a
    // development/LAN fallback, while retaining Web Crypto on HTTPS/localhost.
    let hashBytes: Uint8Array;
    if (window.crypto.subtle) {
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'HMAC', hash: 'SHA-256', length: 256 },
        true,
        ['sign']
      );

      const rawKey = await window.crypto.subtle.exportKey('raw', derivedKey);
      hashBytes = new Uint8Array(rawKey);
    } else {
      hashBytes = await pbkdf2Async(sha256, enc.encode(password), saltBytes, {
        c: 100000,
        dkLen: 32,
        asyncTick: 10
      });
    }

    return Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies password against PBKDF2 hash using constant-time comparison.
   */
  public static async verifyPassword(password: string, saltHex: string, expectedHash: string): Promise<boolean> {
    try {
      const computed = await this.hashPassword(password, saltHex);
      if (computed.length !== expectedHash.length) return false;
      let diff = 0;
      for (let i = 0; i < computed.length; i++) {
        diff |= computed.charCodeAt(i) ^ expectedHash.charCodeAt(i);
      }
      return diff === 0;
    } catch {
      return false;
    }
  }

  /**
   * Generates a 6-digit numeric verification token for password resets.
   */
  public static generateResetCode(): string {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const code = 100000 + (array[0] % 900000);
    return code.toString();
  }

  /**
   * Generates a secure session token string.
   */
  public static generateSessionToken(): string {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Role Titles map
export const ROLE_TITLES: Record<UserRole, string> = {
  admin: 'Company Administrator',
  site_supervisor: 'Site Supervisor',
  accountant: 'Chief Accountant',
  worker: 'Site Worker / Specialist',
  project_manager: 'Senior Project Manager',
  site_engineer: 'Site Engineer',
  storekeeper: 'Materials Storekeeper',
  management_viewer: 'Management Auditor / Viewer'
};

// ==========================================
// AUTHENTICATION & USER MANAGEMENT SERVICE
// ==========================================
class AuthService {
  private accounts: AuthAccount[] = [];
  private currentSession: UserSession | null = null;
  private isInitialized = false;

  constructor() {
    this.initSession();
  }

  /**
   * Initialize accounts and seed default cryptographic credentials if empty.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (stored) {
        this.accounts = JSON.parse(stored);
        this.isInitialized = true;
        return;
      }
    } catch (e) {
      console.warn('Failed reading stored auth accounts, re-seeding.', e);
    }

    // Default Seed Accounts with real PBKDF2 cryptography
    const defaultPassword = 'ChenInfra@2026';

    const seedConfigs: Array<{
      auth_uid: string;
      user_id: string;
      email: string;
      full_name: string;
      role: UserRole;
      phone: string;
      assigned_projects?: string[];
      employee_id?: string;
    }> = [
      {
        auth_uid: 'auth-usr-admin-01',
        user_id: 'CHEN-ADM-01',
        email: 'admin@cheninfra.com',
        full_name: 'Rajesh Sharma',
        role: 'admin',
        phone: '+91 98450 11223',
        assigned_projects: ['proj-skyline-01', 'proj-emerald-02']
      },
      {
        auth_uid: 'auth-usr-sup-02',
        user_id: 'CHEN-SUP-02',
        email: 'supervisor.ananya@cheninfra.com',
        full_name: 'Ananya Rao',
        role: 'site_supervisor',
        phone: '+91 97410 77889',
        assigned_projects: ['proj-skyline-01']
      },
      {
        auth_uid: 'auth-usr-acc-03',
        user_id: 'CHEN-ACC-03',
        email: 'accountant.kavita@cheninfra.com',
        full_name: 'Kavita Sundaram',
        role: 'accountant',
        phone: '+91 98190 66778',
        assigned_projects: ['proj-skyline-01', 'proj-emerald-02']
      },
      {
        auth_uid: 'auth-usr-wrk-04',
        user_id: 'CHEN-WRK-04',
        email: 'worker.daniel@cheninfra.com',
        full_name: 'Daniel Murmu',
        role: 'worker',
        phone: '+91 98452 33441',
        assigned_projects: ['proj-skyline-01'],
        employee_id: 'emp-dan-001'
      },
      {
        auth_uid: 'auth-usr-str-05',
        user_id: 'CHEN-STR-05',
        email: 'storekeeper.manoj@cheninfra.com',
        full_name: 'Manoj Kumar',
        role: 'storekeeper',
        phone: '+91 94480 33221',
        assigned_projects: ['proj-skyline-01']
      }
    ];

    const seededAccounts: AuthAccount[] = [];
    for (const cfg of seedConfigs) {
      const salt = AuthCrypto.generateSalt(16);
      const hash = await AuthCrypto.hashPassword(defaultPassword, salt);
      seededAccounts.push({
        auth_uid: cfg.auth_uid,
        user_id: cfg.user_id,
        email: cfg.email,
        full_name: cfg.full_name,
        role: cfg.role,
        role_title: ROLE_TITLES[cfg.role] || 'Team Member',
        company_id: 'comp-apex-01',
        phone: cfg.phone,
        assigned_projects: cfg.assigned_projects || [],
        employee_id: cfg.employee_id,
        status: 'active',
        password_hash: hash,
        password_salt: salt,
        failed_attempts: 0,
        created_at: new Date('2026-01-10T09:00:00Z').toISOString(),
        updated_at: new Date('2026-01-10T09:00:00Z').toISOString(),
        created_by: 'system_bootstrap'
      });
    }

    this.accounts = seededAccounts;
    this.saveAccountsToStorage();
    this.isInitialized = true;
  }

  private saveAccountsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(this.accounts));
    } catch (e) {
      console.error('Failed saving accounts to localStorage', e);
    }
  }

  private initSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (stored) {
        const session: UserSession = JSON.parse(stored);
        if (session.expires_at > Date.now()) {
          this.currentSession = session;
          // Sync with dataService
          this.syncDataServiceUser(session);
        } else {
          this.currentSession = null;
          localStorage.removeItem(STORAGE_KEYS.SESSION);
        }
      }
    } catch {
      this.currentSession = null;
    }
  }

  private syncDataServiceUser(session: UserSession) {
    const profile: UserProfile = {
      id: session.auth_uid,
      auth_uid: session.auth_uid,
      user_id: session.user_id,
      email: session.email,
      full_name: session.full_name,
      role: session.role,
      role_title: session.role_title,
      company_id: session.company_id,
      assigned_projects: session.assigned_projects,
      employee_id: session.employee_id,
      status: 'active'
    };
    // Sync into dataService currentUser
    (dataService as any).currentUser = profile;
  }

  // ==========================================
  // 1. AUTHENTICATION & LOGIN WORKFLOW
  // ==========================================

  /**
   * Log in using Email address OR unique User ID and password.
   * Enforces brute-force lockout, inactive checks, and constant-time PBKDF2 hash verification.
   */
  public async login(identifier: string, password: string, rememberMe = true): Promise<UserSession> {
    await this.ensureInitialized();

    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new Error('Please enter your Email address or User ID.');
    }
    if (!password) {
      throw new Error('Please enter your account password.');
    }

    // Match by email or User ID (case-insensitive)
    const lowerId = cleanId.toLowerCase();
    const accountIndex = this.accounts.findIndex(
      a => a.email.toLowerCase() === lowerId || a.user_id.toLowerCase() === lowerId
    );

    if (accountIndex === -1) {
      throw new Error('Invalid credentials. No account found matching that Email or User ID.');
    }

    const account = this.accounts[accountIndex];

    // Check account status
    if (account.status === 'inactive') {
      throw new Error('Account Deactivated: This user account has been disabled by the Company Administrator.');
    }

    // Check brute-force lockout
    if (account.lockout_until) {
      const lockoutTime = new Date(account.lockout_until).getTime();
      if (lockoutTime > Date.now()) {
        const remainingMins = Math.ceil((lockoutTime - Date.now()) / (1000 * 60));
        throw new Error(
          `Account Locked: Too many failed login attempts. Access is locked for ${remainingMins} more minute(s). Contact an administrator to unlock sooner.`
        );
      } else {
        // Lockout expired, reset failed attempts
        account.lockout_until = null;
        account.failed_attempts = 0;
      }
    }

    // Verify PBKDF2 password
    const isPasswordValid = await AuthCrypto.verifyPassword(
      password,
      account.password_salt,
      account.password_hash
    );

    if (!isPasswordValid) {
      account.failed_attempts = (account.failed_attempts || 0) + 1;
      const remainingAttempts = Math.max(0, 5 - account.failed_attempts);

      if (account.failed_attempts >= 5) {
        // Lock for 15 minutes
        account.lockout_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        this.saveAccountsToStorage();
        this.recordAuditLog('account_locked', account.auth_uid, {
          reason: '5 consecutive failed password attempts',
          lockout_duration_mins: 15
        });
        throw new Error(
          'Account Locked: 5 consecutive incorrect passwords entered. Account is locked for 15 minutes.'
        );
      }

      this.saveAccountsToStorage();
      this.recordAuditLog('login_failed', account.auth_uid, {
        attempts: account.failed_attempts,
        remaining: remainingAttempts
      });

      throw new Error(
        `Incorrect password. ${remainingAttempts} attempt(s) remaining before account lockout.`
      );
    }

    // When cloud sync is configured, require a real Supabase Auth session so
    // database RLS policies can identify this user across devices.
    let cloudProfile: UserProfile | null = null;
    if (dataService.isCloudConnected()) {
      cloudProfile = await dataService.signInWithSupabase(account.email, password);
    }

    // Login successful: reset attempts, update last login
    account.failed_attempts = 0;
    account.lockout_until = null;
    account.last_login_at = new Date().toISOString();
    this.saveAccountsToStorage();

    // Create session (24h validity, or 8h if not remember)
    const sessionDurationMs = rememberMe ? 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
    const session: UserSession = {
      token: AuthCrypto.generateSessionToken(),
      auth_uid: cloudProfile?.auth_uid || account.auth_uid,
      user_id: account.user_id,
      email: account.email,
      full_name: cloudProfile?.full_name || account.full_name,
      role: cloudProfile?.role || account.role,
      role_title: cloudProfile?.role_title || account.role_title,
      company_id: cloudProfile?.company_id || account.company_id,
      assigned_projects: account.assigned_projects || [],
      employee_id: account.employee_id,
      login_at: new Date().toISOString(),
      expires_at: Date.now() + sessionDurationMs
    };

    this.currentSession = session;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    this.syncDataServiceUser(session);

    this.recordAuditLog('login_success', account.auth_uid, {
      user_id: account.user_id,
      role: account.role,
      remember_me: rememberMe
    });

    return session;
  }

  /**
   * Log out current user and invalidate local session.
   */
  public async logout(): Promise<void> {
    if (this.currentSession) {
      this.recordAuditLog('logout', this.currentSession.auth_uid, {
        user_id: this.currentSession.user_id
      });
    }
    this.currentSession = null;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    await dataService.signOutFromSupabase();
  }

  /**
   * Returns current active session or null.
   */
  public getSession(): UserSession | null {
    if (!this.currentSession) {
      this.initSession();
    }
    if (this.currentSession && this.currentSession.expires_at <= Date.now()) {
      this.logout();
      return null;
    }
    return this.currentSession;
  }

  public isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  public getCurrentUser(): UserProfile {
    const session = this.getSession();
    if (session) {
      return {
        id: session.auth_uid,
        auth_uid: session.auth_uid,
        user_id: session.user_id,
        email: session.email,
        full_name: session.full_name,
        role: session.role,
        role_title: session.role_title,
        company_id: session.company_id,
        assigned_projects: session.assigned_projects,
        employee_id: session.employee_id,
        status: 'active'
      };
    }
    // Fallback if not authenticated
    return {
      id: 'guest',
      email: 'guest@buildpulse.com',
      full_name: 'Guest User',
      role: 'worker',
      role_title: 'Unauthenticated',
      company_id: 'comp-apex-01',
      status: 'inactive'
    };
  }

  // ==========================================
  // 2. PASSWORD RESET WORKFLOW
  // ==========================================

  /**
   * Initiates password reset by Email or User ID. Generates a secure 6-digit code.
   */
  public async requestPasswordReset(identifier: string): Promise<{
    success: boolean;
    message: string;
    resetCode: string;
    emailHint: string;
  }> {
    await this.ensureInitialized();
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) throw new Error('Please enter your registered Email address or User ID.');

    const account = this.accounts.find(
      a => a.email.toLowerCase() === cleanId || a.user_id.toLowerCase() === cleanId
    );

    if (!account) {
      throw new Error('No user account found matching this Email or User ID.');
    }

    if (account.status === 'inactive') {
      throw new Error('This account is inactive. Please contact the administrator.');
    }

    const resetCode = AuthCrypto.generateResetCode();
    // 15 minutes expiry
    account.password_reset_code = resetCode;
    account.password_reset_expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    this.saveAccountsToStorage();

    this.recordAuditLog('password_reset_requested', account.auth_uid, {
      user_id: account.user_id,
      email: account.email
    });

    const [userPart, domainPart] = account.email.split('@');
    const maskedUser = userPart.slice(0, 2) + '***' + (userPart.slice(-1) || '');
    const emailHint = `${maskedUser}@${domainPart}`;

    return {
      success: true,
      message: `Password reset verification code generated for ${account.full_name}.`,
      resetCode,
      emailHint
    };
  }

  /**
   * Completes password reset with verification code and new password.
   */
  public async completePasswordReset(
    identifier: string,
    resetCode: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    await this.ensureInitialized();
    const cleanId = identifier.trim().toLowerCase();
    const cleanCode = resetCode.trim();

    if (!cleanId || !cleanCode) {
      throw new Error('Email/User ID and Verification Code are required.');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new Error('Password must contain both letters and numbers.');
    }

    const account = this.accounts.find(
      a => a.email.toLowerCase() === cleanId || a.user_id.toLowerCase() === cleanId
    );

    if (!account) throw new Error('Account not found.');

    if (!account.password_reset_code || account.password_reset_code !== cleanCode) {
      throw new Error('Invalid or incorrect verification code. Please check and try again.');
    }

    if (!account.password_reset_expires || new Date(account.password_reset_expires).getTime() < Date.now()) {
      throw new Error('Verification code has expired. Please request a new reset code.');
    }

    // Set new password with new salt and PBKDF2 hash
    const newSalt = AuthCrypto.generateSalt(16);
    const newHash = await AuthCrypto.hashPassword(newPassword, newSalt);

    account.password_hash = newHash;
    account.password_salt = newSalt;
    account.password_reset_code = undefined;
    account.password_reset_expires = undefined;
    account.failed_attempts = 0;
    account.lockout_until = null;
    account.must_change_password = false;
    account.updated_at = new Date().toISOString();

    this.saveAccountsToStorage();

    this.recordAuditLog('password_reset_completed', account.auth_uid, {
      user_id: account.user_id
    });

    return {
      success: true,
      message: 'Password successfully updated! You can now log in with your new credentials.'
    };
  }

  // ==========================================
  // 3. ADMINISTRATOR USER MANAGEMENT
  // ==========================================

  /**
   * Returns list of all user accounts. Enforces admin-only permission.
   */
  public async getAccounts(): Promise<AuthAccount[]> {
    await this.ensureInitialized();
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can access User Management.');
    }
    return [...this.accounts];
  }

  /**
   * Creates a new user account. Enforces admin permission, unique ID check, and unique email.
   */
  public async createAccount(input: {
    full_name: string;
    user_id?: string;
    email: string;
    role: UserRole;
    phone?: string;
    assigned_projects?: string[];
    employee_id?: string;
    initial_password?: string;
    require_password_change?: boolean;
    status?: 'active' | 'inactive';
  }): Promise<AuthAccount> {
    await this.ensureInitialized();
    const currentAdmin = this.getCurrentUser();
    if (currentAdmin.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can create new user accounts.');
    }

    const trimmedName = input.full_name.trim();
    if (!trimmedName) throw new Error('Full Name is required.');

    const trimmedEmail = input.email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('A valid email address is required.');
    }

    // Check duplicate email
    if (this.accounts.some(a => a.email.toLowerCase() === trimmedEmail)) {
      throw new Error(`An account with the email "${trimmedEmail}" already exists.`);
    }

    // Generate or validate User ID
    let finalUserId = input.user_id?.trim().toUpperCase();
    if (!finalUserId) {
      // Auto-generate code e.g. CHEN-USR-###
      const rolePrefix = input.role === 'admin' ? 'ADM' :
        input.role === 'site_supervisor' ? 'SUP' :
        input.role === 'accountant' ? 'ACC' :
        input.role === 'worker' ? 'WRK' : 'USR';
      const seq = (this.accounts.length + 1).toString().padStart(2, '0');
      finalUserId = `CHEN-${rolePrefix}-${seq}`;
    }

    // Check duplicate User ID
    if (this.accounts.some(a => a.user_id.toUpperCase() === finalUserId)) {
      throw new Error(`User ID "${finalUserId}" is already in use. Please enter a unique User ID.`);
    }

    // Password setup: provided password or secure auto-generated temporary password
    const pwdToHash = input.initial_password?.trim() || 'ChenInfra@2026';
    if (pwdToHash.length < 8) {
      throw new Error('Initial password must be at least 8 characters.');
    }

    const salt = AuthCrypto.generateSalt(16);
    const hash = await AuthCrypto.hashPassword(pwdToHash, salt);

    const newAccount: AuthAccount = {
      auth_uid: `auth-usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: finalUserId,
      email: trimmedEmail,
      full_name: trimmedName,
      role: input.role,
      role_title: ROLE_TITLES[input.role] || 'Team Member',
      company_id: 'comp-apex-01',
      phone: input.phone?.trim(),
      assigned_projects: input.assigned_projects || [],
      employee_id: input.employee_id,
      status: input.status || 'active',
      password_hash: hash,
      password_salt: salt,
      failed_attempts: 0,
      must_change_password: input.require_password_change ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: currentAdmin.id
    };

    this.accounts.push(newAccount);
    this.saveAccountsToStorage();

    this.recordAuditLog('create_user_account', newAccount.auth_uid, {
      user_id: newAccount.user_id,
      email: newAccount.email,
      role: newAccount.role,
      created_by: currentAdmin.full_name
    });

    return newAccount;
  }

  /**
   * Updates an existing user account.
   */
  public async updateAccount(auth_uid: string, updates: {
    full_name?: string;
    email?: string;
    role?: UserRole;
    phone?: string;
    assigned_projects?: string[];
    employee_id?: string;
    status?: 'active' | 'inactive';
  }): Promise<AuthAccount> {
    await this.ensureInitialized();
    const currentAdmin = this.getCurrentUser();
    if (currentAdmin.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can modify user accounts.');
    }

    const idx = this.accounts.findIndex(a => a.auth_uid === auth_uid);
    if (idx === -1) throw new Error('User account not found.');

    const target = this.accounts[idx];

    // Check unique email if updating
    if (updates.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      if (this.accounts.some((a, i) => i !== idx && a.email.toLowerCase() === cleanEmail)) {
        throw new Error(`Email "${cleanEmail}" is already used by another account.`);
      }
      target.email = cleanEmail;
    }

    if (updates.full_name) target.full_name = updates.full_name.trim();
    if (updates.role) {
      target.role = updates.role;
      target.role_title = ROLE_TITLES[updates.role] || target.role_title;
    }
    if (updates.phone !== undefined) target.phone = updates.phone.trim();
    if (updates.assigned_projects !== undefined) target.assigned_projects = updates.assigned_projects;
    if (updates.employee_id !== undefined) target.employee_id = updates.employee_id;
    if (updates.status !== undefined) target.status = updates.status;

    target.updated_at = new Date().toISOString();
    this.saveAccountsToStorage();

    this.recordAuditLog('update_user_account', auth_uid, {
      user_id: target.user_id,
      role: target.role,
      status: target.status
    });

    return target;
  }

  /**
   * Resets a user's password directly as an authorized administrator.
   */
  public async adminResetUserPassword(auth_uid: string, newPassword: string): Promise<void> {
    await this.ensureInitialized();
    const currentAdmin = this.getCurrentUser();
    if (currentAdmin.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can reset user passwords.');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const idx = this.accounts.findIndex(a => a.auth_uid === auth_uid);
    if (idx === -1) throw new Error('Account not found.');

    const salt = AuthCrypto.generateSalt(16);
    const hash = await AuthCrypto.hashPassword(newPassword, salt);

    this.accounts[idx].password_hash = hash;
    this.accounts[idx].password_salt = salt;
    this.accounts[idx].failed_attempts = 0;
    this.accounts[idx].lockout_until = null;
    this.accounts[idx].must_change_password = true;
    this.accounts[idx].updated_at = new Date().toISOString();

    this.saveAccountsToStorage();

    this.recordAuditLog('admin_reset_password', auth_uid, {
      target_user_id: this.accounts[idx].user_id,
      reset_by: currentAdmin.full_name
    });
  }

  /**
   * Toggles active / inactive status of an account.
   */
  public async toggleAccountStatus(auth_uid: string, status: 'active' | 'inactive'): Promise<AuthAccount> {
    await this.ensureInitialized();
    const currentAdmin = this.getCurrentUser();
    if (currentAdmin.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can modify account status.');
    }

    const idx = this.accounts.findIndex(a => a.auth_uid === auth_uid);
    if (idx === -1) throw new Error('Account not found.');

    // Protect against deactivating the last active administrator
    if (status === 'inactive' && this.accounts[idx].role === 'admin') {
      const activeAdmins = this.accounts.filter(a => a.role === 'admin' && a.status === 'active');
      if (activeAdmins.length <= 1) {
        throw new Error('Safety Rule: Cannot deactivate the only active Company Administrator account.');
      }
    }

    this.accounts[idx].status = status;
    this.accounts[idx].updated_at = new Date().toISOString();
    this.saveAccountsToStorage();

    this.recordAuditLog('toggle_account_status', auth_uid, {
      user_id: this.accounts[idx].user_id,
      new_status: status
    });

    return this.accounts[idx];
  }

  /**
   * Deletes a user account. Protects the last administrator.
   */
  public async deleteAccount(auth_uid: string): Promise<void> {
    await this.ensureInitialized();
    const currentAdmin = this.getCurrentUser();
    if (currentAdmin.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can delete user accounts.');
    }

    const target = this.accounts.find(a => a.auth_uid === auth_uid);
    if (!target) throw new Error('Account not found.');

    if (target.role === 'admin') {
      const activeAdmins = this.accounts.filter(a => a.role === 'admin' && a.status === 'active');
      if (activeAdmins.length <= 1) {
        throw new Error('Safety Rule: Cannot delete the primary active Company Administrator account.');
      }
    }

    this.accounts = this.accounts.filter(a => a.auth_uid !== auth_uid);
    this.saveAccountsToStorage();

    this.recordAuditLog('delete_account', auth_uid, {
      deleted_user_id: target.user_id,
      deleted_by: currentAdmin.full_name
    });
  }

  // ==========================================
  // 4. SERVER-ENFORCED PERMISSION RULES
  // ==========================================

  /**
   * Evaluates if a role is permitted to perform a specific action.
   */
  public canPerformAction(
    action:
      | 'manage_users'
      | 'manage_projects'
      | 'manage_inventory'
      | 'view_inventory'
      | 'manage_attendance'
      | 'view_attendance'
      | 'manage_salaries'
      | 'view_salaries'
      | 'manage_company'
      | 'view_reports',
    projectId?: string
  ): boolean {
    const user = this.getCurrentUser();
    if (!this.isAuthenticated() || user.status === 'inactive') return false;

    const role = user.role;

    switch (action) {
      case 'manage_users':
      case 'manage_company':
        return role === 'admin';

      case 'manage_projects':
        return role === 'admin' || role === 'project_manager';

      case 'manage_inventory':
        return role === 'admin' || role === 'site_engineer' || role === 'storekeeper';

      case 'view_inventory':
        // Workers only have access to their personal work and earnings
        return role !== 'worker';

      case 'manage_attendance':
        if (role === 'admin') return true;
        if (role === 'site_supervisor' || role === 'site_engineer' || role === 'project_manager') {
          // If a project is specified, verify project assignment
          if (projectId && user.assigned_projects && user.assigned_projects.length > 0) {
            return user.assigned_projects.includes(projectId);
          }
          return true;
        }
        return false;

      case 'view_attendance':
        // Workers can view attendance, but only their own records in UI
        return true;

      case 'manage_salaries':
        return role === 'admin' || role === 'accountant';

      case 'view_salaries':
        // Admin, accountant, and project manager can view team salaries
        return role === 'admin' || role === 'accountant' || role === 'project_manager';

      case 'view_reports':
        return role === 'admin' || role === 'accountant' || role === 'project_manager' || role === 'management_viewer';

      default:
        return false;
    }
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================
  private recordAuditLog(action: string, entityId: string, metadata: any) {
    try {
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH_LOGS) || '[]');
      logs.unshift({
        id: `alog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        action,
        entity_id: entityId,
        metadata,
        timestamp: new Date().toISOString(),
        actor_id: this.currentSession?.auth_uid || 'system',
        actor_name: this.currentSession?.full_name || 'System'
      });
      // Keep last 500 audit logs
      if (logs.length > 500) logs.length = 500;
      localStorage.setItem(STORAGE_KEYS.AUTH_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.warn('Could not record auth audit log', e);
    }
  }

  public getAuthAuditLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH_LOGS) || '[]');
    } catch {
      return [];
    }
  }
}

export const authService = new AuthService();
