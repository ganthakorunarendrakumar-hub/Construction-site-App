# BuildPulse local administrator recovery

This is the existing local-development recovery flow. It can restore the known Company Administrator account in place, or create that same identity once if its local account is absent. It does not create a Supabase Auth user or change cloud data, projects, inventory, attendance, payments, or other application records.

## Authorization boundary

The recovery page is not enabled in the normal app. The owner must start the dedicated recovery server from the project terminal and confirm the exact action there. Type `RESTORE ADMIN` to reset the existing local administrator's password and reactivate that account, or `CREATE ADMIN` to create the missing local account. After account creation, the one-time marker permanently blocks another creation; only an owner-confirmed restore of the exact existing administrator identity remains available. Any other response cancels the request.

This verifies control of the local OS account, project workspace, and active development-server terminal. It does not independently verify legal identity. Do not use it on a shared workstation or if another person can control the same OS account and terminal. The recovery server binds to loopback, requires a matching browser origin, and is installed only for the explicit `local-recovery` development mode.

## Current local environment

The active page at `http://localhost:3005/` has no local account store. A read-only check found the one existing account—Uma Mahesh, `CHEN-ADM-01`, `admin@cheninfra.com`, Company Administrator—in the browser origin `http://localhost:3000/`. The origins on ports 3001 and 3005 have no local account store. Supabase is not configured in these browser origins.

The workspace's one-time account-creation marker is already present (completed October 24, 2026). That older marker predates the action field, and the prior protocol supported account creation only. The updated existing flow allows a password reset only when it finds the exact known administrator account at the selected origin and the owner types `RESTORE ADMIN` in the terminal. It continues to block account creation.

## Steps to restore the existing account

Use **port 3000**, where the existing account is stored. Do not run recovery on port 3005; that origin has no account store and must not be used to create a second local account.

1. Stop the ordinary development server using port 3000 by pressing **Ctrl+C in the terminal that started it**. Do not terminate an unknown process. The recovery server uses strict port binding and will stop if port 3000 is occupied.
2. In PowerShell, run:

   ```powershell
   Set-Location 'C:\construction app\Construction-site-App'
   $env:BP_RECOVERY_PORT = '3000'
   npm.cmd run recover:admin
   ```

   Keep this terminal open and interactive.
3. Open **`http://localhost:3000/#local-admin-recovery`** in the same browser profile as the existing app data.
4. Confirm the read-only identity is **Uma Mahesh**, **CHEN-ADM-01**, **admin@cheninfra.com**. Set and confirm a private password of 12–128 characters. The password is PBKDF2-hashed in the browser and is never sent to the recovery server.
5. Select **Restore administrator access**. Verify the action and identity shown in the terminal, then type **`RESTORE ADMIN`**. Any other input cancels. The flow updates the existing local account in place; it does not create a second account.
6. After success, stop the recovery server with **Ctrl+C**, then start the normal app on the same port:

   ```powershell
   Remove-Item Env:BP_RECOVERY_PORT -ErrorAction SilentlyContinue
   npm.cmd run dev
   ```

7. Open **`http://localhost:3000/`** and sign in with **CHEN-ADM-01** or **admin@cheninfra.com** and the password you just set.

## Safeguards and limitations

- Recovery refuses to run if Supabase is connected or a Supabase URL/key is configured. It does not reset a Supabase password or create a cloud Auth account.
- Restore is restricted to the exact known Company Administrator identity. It preserves the existing auth ID, company, role, creation date, and assigned projects while updating the password and lockout state. An ID/email collision with another account blocks recovery without changing records.
- Creation is restricted to that same identity, occurs only when no matching account exists, and is allowed only before the per-workspace creation marker is written. A corrupt account store is left untouched and blocks recovery.
- The password is stored only as the app's PBKDF2 hash. No plaintext password or recovery grant is logged or sent to the recovery server.
- This local account is scoped to the browser origin. It is not cross-device access and does not prove that a matching Supabase Auth identity/profile exists. Cloud sign-in remains unavailable until the existing cloud authentication is configured and the administrator has a valid cloud Auth identity/profile.
- `Forgot Password` is not a trusted identity check in this local-only setup because its current code is displayed in the UI rather than delivered through a verified email service. Use only the terminal-approved recovery described above.
