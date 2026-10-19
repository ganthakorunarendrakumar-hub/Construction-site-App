# Construction Site App Upgrade Roadmap

## 1. Current status

- Frontend stack: React + TypeScript + Vite + Tailwind
- Data model: localStorage-first, Supabase-ready
- Business domain: construction ERP dashboard for projects, materials, attendance, reports, and user roles
- Current state: feature-rich UI and workflow prototype, not yet production-hardened

## 2. Build issue resolved

Root cause: the project pinned a direct `esbuild` dependency that conflicted with Vite 8.

Fix applied:
- removed the incompatible direct `esbuild` package
- verified the app installs and builds successfully

### Verified build result

Command run:

```bash
npm install --no-fund --no-audit
npm run build
```

Result:
- dependencies installed successfully
- Vite production build completed successfully
- output generated in `dist/`

## 3. Recommended upgrade roadmap

### Phase 1: Stabilize and refactor the app foundation

- remove unused libraries and dead code
- standardize naming, state patterns, and shared types
- split large files into smaller feature modules
- add a clean config and environment management standard
- add route-level structure for app pages

### Phase 2: Move from local-first to production-ready data architecture

- keep Supabase as the primary backend
- create a real database schema with migrations
- move auth to Supabase Auth or a secure backend auth provider
- add server logic for validating stock, payments, materials, and project status
- use RLS policies for role-based access control

### Phase 3: Improve user and business workflows

- add approval workflows for purchases, stock usage, and payment entries
- add audit logs for every material and project update
- add notifications and alerts for low stock, payment due dates, and project risks
- add offline-safe sync for field workers

### Phase 4: Production quality and security

- add automated tests (unit, integration, E2E)
- add linting and CI/CD checks
- add environment validation and secret management
- secure all API calls and data transfer
- add observability, error logging, and monitoring

### Phase 5: Modernization and scale

- convert to a more structured stack such as Next.js or a lightweight React + backend separation
- if needed, introduce a dedicated backend API for complex ERP rules
- add reporting, dashboards, and analytics modules for executives
- add document upload, PDF exports, and role-specific portals

## 4. Recommended production deployment setup

### Best-fit setup for this app

- Frontend hosting: Vercel
- Database/auth: Supabase Postgres + Supabase Auth + Storage
- CI/CD: GitHub Actions
- Domain/SSL: Vercel-managed custom domain with HTTPS
- Monitoring: Sentry + basic uptime monitoring

### Why this fits well

- this project already uses Supabase patterns and local-first data design
- it is a React app, which deploys efficiently to Vercel
- the app needs auth, storage, and database features that Supabase supports well
- this gives a low-complexity, scalable cloud setup without building a large custom backend immediately

## 5. Modernization recommendations

1. Replace localStorage-driven core logic with a proper backend state layer.
2. Introduce service modules for auth, projects, inventory, payroll, reports, and attendance.
3. Separate UI screens from business logic and create reusable domain services.
4. Add route-based navigation and proper state management for large feature sets.
5. Add unit tests for material flows and ledger calculations.
6. Improve performance with code splitting and lazy-loaded modules.
7. Standardize data contracts between frontend and backend.

## 6. Suggested next milestone

The next practical milestone is:

- project builds cleanly
- JSON/database schema is cleaned and structured
- Supabase is activated as the real source of truth
- deployment pipeline is configured in Vercel
- CI runs lint/test/build on every push

This will move the app from an advanced prototype to a stable business platform.
