# BuildPulse local administrator recovery

This is a one-time, local-development recovery procedure for a locked-out owner. It does not change Supabase, cloud data, projects, stock, attendance, or other application records. The new account is stored in the same browser origin's existing local account store.

## Authorization boundary

The owner must start the dedicated recovery server from the project terminal and approve the account creation by typing `CREATE ADMIN` in that terminal after submitting the form. This verifies control of the local OS account, project workspace, and active development-server terminal. It does not independently verify a person's legal identity. Do not use this procedure on a shared workstation or if another person can control the same OS account and terminal.

The recovery server binds to `localhost`, rejects non-loopback requests, requires a matching browser origin, and is only installed for the explicit `local-recovery` development mode. The ordinary login page has no recovery button. A per-workspace completion marker in the current OS user's application-data directory disables recovery after success. No password or recovery grant is printed to the terminal.

## Steps

1. Stop the ordinary BuildPulse development server so the recovery server can use the **same host and port** as the browser profile containing the existing app data. Local storage is origin-specific.
2. In PowerShell at the project root, set the port to the port used by the existing app. This project is currently shared at `localhost:3001`:

   ```powershell
   $env:BP_RECOVERY_PORT = '3001'
   npm.cmd run recover:admin
   ```

   Keep this terminal open. If the existing app uses a different port, use that port instead. The recovery server fails to start if the chosen port is already occupied; it will not silently move to a different origin.

3. Open `http://localhost:3001/#local-admin-recovery` in the same browser profile and keep `localhost` and the port unchanged. The recovery screen is only rendered in the dedicated development mode.
4. Enter the administrator's full name, a unique User ID, email, and a new password of at least 12 characters. The password is entered in masked fields and is hashed in the browser with the existing PBKDF2 implementation; it is not sent to the recovery server.
5. Submit the form. Check that the request is yours, then type `CREATE ADMIN` in the project terminal. Any other response cancels the request. The recovery server does not log the form password or grant.
6. After success, return to the normal sign-in page and log in with the new User ID or email and password. The new account has the existing `admin` role, so the normal User Accounts interface and administrator permissions apply.
7. Stop the recovery server. Run the ordinary app again on the **same origin** to see the same local account store. Do not clear browser site data. Recovery cannot be used again for this workspace and OS account after its completion marker is written.

## Safeguards and limitations

- Recovery refuses to run if Supabase is connected or any Supabase URL/key is configured. It does not create a cloud Auth user.
- Recovery mode never seeds preset users. It appends to a valid existing local account store, creates the first local account only when the store is genuinely missing or empty, and refuses to overwrite a corrupt store.
- The PBKDF2 hash uses the same algorithm and parameters as normal login. The password is never stored in plaintext.
- A person with access to the same OS account, project workspace, and terminal shares the local trust boundary. This flow is not suitable as identity verification for a shared or remote machine.
- The account only exists in the browser's local storage for the chosen origin. This is not cross-device recovery or account synchronization.
