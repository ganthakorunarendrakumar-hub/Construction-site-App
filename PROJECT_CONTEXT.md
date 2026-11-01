# BuildPulse Construction ERP — Project Reference

Analysis snapshot: 2026-10-24. This document records the existing implementation only; it is not a proposed redesign.

## 1. Architecture

BuildPulse is a single-page React application. [main.tsx](./src/main.tsx) mounts [App.tsx](./src/App.tsx), which owns authentication state, selected project, top-level navigation, cloud configuration, and the data needed by the active project view. Navigation is state-based rather than URL/router-based (`ViewMode` in [App.tsx](./src/App.tsx)).

The application has three persistence layers:

1. Local browser `localStorage` is the default source of truth for authentication accounts/session, projects, master catalogs, generic inventory, attendance, payroll, and audit snapshots.
2. Supabase tables are used when configured for company, projects, cement brands, locations, and cement transactions.
3. The Supabase `app_state` JSONB row mirrors most `buildpulse_*` localStorage keys so the local-first modules can be synchronized across devices.

The cloud path is therefore hybrid, not a fully normalized backend. [dataService.ts](./src/services/dataService.ts) monkey-patches `localStorage.setItem` to debounce cloud-state writes and restores the whole company snapshot on refresh.

## 2. Technology stack

- React 19 + TypeScript 7 + Vite 8.
- Tailwind CSS 4 via `@tailwindcss/vite`; Lucide React icons; Motion is declared but not materially used in the inspected application flow.
- Supabase JS client for optional PostgreSQL/Auth/Storage integration.
- Web Crypto PBKDF2-SHA-256, with `@noble/hashes` as a fallback, for the local authentication prototype.
- Browser APIs: localStorage, Web Crypto, FileReader, Blob/Object URLs, clipboard, timers, and CSV downloads.
- No application test suite, backend server, migrations directory, router, or API route implementation was present.
- [SUPABASE_AUTH_SETUP.sql](./SUPABASE_AUTH_SETUP.sql) is the bootstrap/patch SQL; [supabaseSchemaSql.ts](./src/services/supabaseSchemaSql.ts) contains the first-run schema text shown in the UI.

## 3. Repository structure

- [src/App.tsx](./src/App.tsx): application shell, auth gate, state, navigation, project loading, and the Section 16 workflow runner.
- [src/components/](./src/components): all screens, modules, tables, forms, and modal dialogs.
  - Company/project flow: [HomeScreen.tsx](./src/components/HomeScreen.tsx), [OngoingProjectsView.tsx](./src/components/OngoingProjectsView.tsx), [CompletedProjectsView.tsx](./src/components/CompletedProjectsView.tsx), [CreateProjectModal.tsx](./src/components/CreateProjectModal.tsx).
  - Project/inventory flow: [ProjectWorkspace.tsx](./src/components/ProjectWorkspace.tsx), [CementPage.tsx](./src/components/CementPage.tsx), [CementLedgerTable.tsx](./src/components/CementLedgerTable.tsx), [CementTransactionModal.tsx](./src/components/CementTransactionModal.tsx), [SteelModule.tsx](./src/components/SteelModule.tsx), [SandModule.tsx](./src/components/SandModule.tsx), [BricksModule.tsx](./src/components/BricksModule.tsx), [AggregateModule.tsx](./src/components/AggregateModule.tsx), and [GenericEquipmentModule.tsx](./src/components/GenericEquipmentModule.tsx).
  - Reporting and labor: [ReportsView.tsx](./src/components/ReportsView.tsx), [AttendanceView.tsx](./src/components/AttendanceView.tsx), [CreateGroupModal.tsx](./src/components/CreateGroupModal.tsx), [AddEmployeeModal.tsx](./src/components/AddEmployeeModal.tsx), [RecordPaymentModal.tsx](./src/components/RecordPaymentModal.tsx), [WorkerPortalView.tsx](./src/components/WorkerPortalView.tsx).
  - Auth/admin/cloud: [LoginPage.tsx](./src/components/LoginPage.tsx), [PasswordResetModal.tsx](./src/components/PasswordResetModal.tsx), [UserManagementView.tsx](./src/components/UserManagementView.tsx), [Navbar.tsx](./src/components/Navbar.tsx), [CloudSetupModal.tsx](./src/components/CloudSetupModal.tsx).
- [src/services/dataService.ts](./src/services/dataService.ts): central data facade, seed data, local/cloud configuration, project CRUD, cement ledger, generic ledger, catalogs, uploads, cloud snapshot sync, and local audit log.
- [src/services/authService.ts](./src/services/authService.ts): local account bootstrap, PBKDF2 password hashing, login/session/lockout/reset, admin account CRUD, role checks, and auth audit log.
- [src/services/attendanceService.ts](./src/services/attendanceService.ts): worker groups, employees, attendance register, hours, earnings, salary summaries, payments, CSV export, and audit log.
- [src/services/reportService.ts](./src/services/reportService.ts): unifies cement and generic transactions and creates date-range/cumulative CSV reports.
- [src/services/materialCatalog.ts](./src/services/materialCatalog.ts): initial categories, material names, steel brands/sizes, sand/brick/aggregate seeds, and detailed regular-site-use catalog seeds.
- [src/types/index.ts](./src/types/index.ts): shared domain contracts for users, companies, projects, cement, generic inventory, attendance, and payroll.
- [src/index.css](./src/index.css): minimal global styling; most visual design is inline Tailwind classes.
- [package.json](./package.json), [tsconfig.json](./tsconfig.json), [vite.config.ts](./vite.config.ts), [index.html](./index.html): build/runtime configuration.

## 4. Main workflow and data flow

1. `App` initializes `authService`; the service reads a local session, seeds default accounts if needed, and gates the UI behind [LoginPage.tsx](./src/components/LoginPage.tsx).
2. After login, the session user is copied into `dataService.currentUser`. `App` loads company, projects, and cement brands; selecting a project loads locations, cement transactions, and cement stock metrics.
3. The home screen links to ongoing/completed projects, reports, attendance, and admin user management. A project workspace links to five core material views plus generic categories.
4. Cement forms call `recordCementTransaction`; generic material forms call `recordGenericTransaction`. Both validate quantity/date/project status/role and prevent deductions above calculated stock. Corrections are represented by reversal records rather than ordinary deletion.
5. Inventory tables filter/search transactions, show running balances and attachments, and permit admin reversal. Catalog additions are mostly admin-only; category items also allow project managers.
6. Attendance loads groups, employees, projects, records, and payments. The daily register calculates hours and daily earnings, upserts one employee/date record, and computes salary summaries. Admin/project manager users can record payments; reports export CSV.
7. [ReportsView.tsx](./src/components/ReportsView.tsx) uses [reportService.ts](./src/services/reportService.ts) to merge cement and generic local ledgers, calculate historical balances, and download date-range or cumulative CSVs.
8. File attachments are limited to 10 MB and selected image/PDF types. Supabase mode uploads to `construction-docs`; fallback mode embeds a Data URL in the transaction/form state.

## 5. Persistence/schema map

### Supabase tables defined

- `companies`: company identity and metadata.
- `profiles`: Auth-linked user profile, company, role, contact fields.
- `projects`: project metadata/status/dates/manager and completion/reopen audit fields.
- `cement_brands`: company-scoped cement catalog.
- `material_locations`: project-scoped storage locations.
- `material_transactions`: immutable-intended cement ledger, quantities, documents, reversals, approval status, and running balance.
- `audit_logs`: SQL audit table exists in the schema, but the client audit implementations write localStorage instead.
- `app_state` (added by [SUPABASE_AUTH_SETUP.sql](./SUPABASE_AUTH_SETUP.sql)): one company-scoped JSONB snapshot for local-first module state.

### Local storage collections

The important keys are `buildpulse_auth_accounts_v1`, `buildpulse_auth_session_v1`, `buildpulse_auth_audit_logs_v1`, `buildpulse_company_v1`, `buildpulse_projects_v1`, `buildpulse_cement_brands_v1`, `buildpulse_material_locations_v1`, `buildpulse_transactions_v1`, `buildpulse_categories_v1`, `buildpulse_category_items_v1`, `buildpulse_generic_transactions_v2`, catalog keys for steel/sand/bricks/aggregate, attendance group/employee/record/payment keys, and `buildpulse_audit_logs_v1`.

### Stock rules

- Cement: available = opening + receipts - returns - usage - damage, calculated per brand.
- Generic consumables: available = opening + receipts - returns - used/issued - damage.
- Generic reusable items: available = opening + receipts + returns - issued - damage; `in_use_stock` is issued minus returns.
- Attendance: Present = 1 payable day, Half Day = 0.5; monthly salary uses a fixed 30-day divisor; overtime is hours × overtime rate; hours support overnight shifts.
- Dates are stored as `YYYY-MM-DD` for business dates and ISO strings for timestamps. Several UI report/attendance defaults are hardcoded to October 2026.

## 6. Permissions and security behavior

Roles are `admin`, `site_supervisor`, `accountant`, `worker`, `project_manager`, `site_engineer`, `storekeeper`, and `management_viewer`.

- Admin: broadest access, project/company/catalog/account management, reversals, and payments.
- Project manager: project creation/status actions, material item management, attendance/payment operations in the client logic.
- Storekeeper: intended receipts/returns/opening stock.
- Site engineer: intended usage/damage.
- Management viewer: read-only material behavior.
- Worker: forced into the personal worker portal.
- Site supervisor filtering is enforced in `App` only when opening a project, based on `assigned_projects`.

Local passwords are salted PBKDF2 hashes, with five-failure/15-minute lockout and expiring local sessions. Password reset codes are generated and returned to the UI rather than delivered through an email service.

## 7. Existing problems and risk areas (analysis only)

### Definite build/type concern

- [WorkerPortalView.tsx](./src/components/WorkerPortalView.tsx) imports and uses `AttendanceRecord`, but [types/index.ts](./src/types/index.ts) defines `DailyAttendanceRecord` and no `AttendanceRecord`. TypeScript compilation is expected to fail unless an external/generated declaration exists (none was present in the repository).

### Data correctness and synchronization

- Generic inventory, attendance, payroll, catalogs, and local audits are synchronized as one whole JSON snapshot. Concurrent users can overwrite each other; there is no version, merge, conflict detection, transaction, or per-record server validation.
- Generic stock calculations and reports read localStorage even when Supabase is connected. Cement reads cloud transactions in some list paths, but stock calculation reads local cement storage, so cloud/local views can disagree.
- Writes generally update cloud first or local first depending on operation, and many cloud update errors are ignored. There is no durable retry queue or clear rollback strategy.
- Running balances are computed client-side and are not safe under concurrent writes; reversing a transaction can also make the displayed historical running balance differ from the original event order.
- Hardcoded company/project IDs such as `comp-apex-01` remain in upload paths and attendance records, while Supabase uses UUIDs and the bootstrap company is database-generated.

### Schema/RLS mismatch

- The initial SQL policies and the later bootstrap patch are different generations. The patch replaces some policies, but the final policies mostly constrain company membership, not the role-specific restrictions described in comments.
- The normalized SQL schema has no tables for attendance, employees, payroll, categories, generic items, or generic transactions; those remain inside `app_state`.
- The `profiles.role` check in the initial schema lists only five roles, while the TypeScript model and local accounts support eight roles.
- Storage setup comments create a private bucket, but client upload code calls `getPublicUrl`; private-bucket access should instead use authenticated download or signed URLs.
- The client stores Supabase URL/anon key in localStorage. The anon key is public by design, but the application must never accept a service-role key; the UI warns about this.

### Authentication/RBAC

- Local account records, password hashes, reset codes, and sessions are browser-controlled and therefore are a prototype authentication boundary, not a secure multi-user authority.
- The role switcher is exposed in the authenticated navbar and can log in using seeded credentials, which is useful for testing but unsafe as a production feature.
- `dataService` and `attendanceService` enforce many permissions in client code; only some core Supabase operations have RLS. All security-sensitive business rules need server-side enforcement before production use.
- `authService` uses a cast to mutate the private `dataService.currentUser`, indicating a coupling that can drift from the public service API.

### UI/feature quality

- The project workspace labels Work Progress and Site Locations as “Phase 2” and the inspected workspace does not expose complete implementations for those tabs; they should be treated as incomplete until verified interactively.
- Error handling is inconsistent: many operations use `alert`, some swallow errors, and several async effects log only to the console. There is no centralized notification/error boundary system.
- UI text contains mojibake sequences such as `â€”`, `â€¢`, and `â‚¹` in several source files, suggesting an encoding problem.
- CSV exports do not all escape fields consistently; the worker personal CSV uses raw comma-joined values, so commas/newlines in notes can corrupt rows.
- `Math.random()` is used for several local IDs. This is acceptable for demo data but not collision-safe for durable multi-user records.
- Attachments can become large Data URLs in localStorage, exhausting browser quotas. The fallback does not provide durable file storage.
- The Section 16 test runner creates and completes a real local test project/ledger; it is a destructive data-producing test workflow and has no cleanup step.

### Maintainability/performance

- [dataService.ts](./src/services/dataService.ts), [attendanceService.ts](./src/services/attendanceService.ts), [AttendanceView.tsx](./src/components/AttendanceView.tsx), and [GenericEquipmentModule.tsx](./src/components/GenericEquipmentModule.tsx) are very large and combine seed data, persistence, business rules, and UI concerns.
- `App` recalculates global cement stock by sequentially calling each project calculation whenever projects/transactions change.
- No automated tests, lint configuration beyond `tsc --noEmit`, API contract tests, or CI configuration was present.

## 8. Inspection limits and verification

Inspected all repository files reported by `rg --files` except dependency contents excluded by `node_modules` (which is not present in the checkout) and lockfile internals were treated as generated dependency metadata. Source files were traced through imports, exported APIs, storage keys, Supabase calls, component props, and navigation wiring; large seed/data and JSX sections were sampled in focused passes rather than reproduced in this document.

`npm run lint` and `npm run build` could not be executed because neither `npm` nor a Node/Bun executable was available in the analysis environment. No code changes were made to application files.

## 9. Modification precautions

- Preserve localStorage key names and existing fields unless a migration plan is explicit.
- For any cloud change, update both [supabaseSchemaSql.ts](./src/services/supabaseSchemaSql.ts) and [SUPABASE_AUTH_SETUP.sql](./SUPABASE_AUTH_SETUP.sql) as appropriate, and consider existing `app_state` data.
- Trace both cement and generic ledgers before changing inventory calculations; reports intentionally merge both.
- Keep reversal semantics and historical records intact; do not delete ledger rows as a correction shortcut.
- Treat role checks as defense-in-depth until equivalent RLS/server rules exist.
- Validate date boundaries, units, reusable-vs-consumable formulas, concurrent writes, and attachment behavior for every material/payroll change.

## 10. Sample-data cleanup status (2026-10-24)

- Automatic creation of seeded projects, locations, cement transactions, generic inventory transactions, worker groups, employees, attendance records, and payments has been disabled in [dataService.ts](./src/services/dataService.ts) and [attendanceService.ts](./src/services/attendanceService.ts).
- Existing browser storage and remote Supabase/app_state records are intentionally not deleted by the source change because they cannot be verified from this workspace.
- The production-visible Section 16 test runner in [App.tsx](./src/App.tsx) is hidden and its handler no longer writes test data.
- Required catalog defaults and authentication initialization remain available.
