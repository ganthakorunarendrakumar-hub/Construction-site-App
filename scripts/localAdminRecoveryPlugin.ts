import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const RECOVERY_BASE_PATH = '/__buildpulse_local_admin_recovery';
const MAX_REQUEST_BYTES = 8 * 1024;
const GRANT_TTL_MS = 3 * 60 * 1000;
const RECOVERY_ADMIN_IDENTITY = {
  fullName: 'Uma Mahesh',
  userId: 'CHEN-ADM-01',
  email: 'admin@cheninfra.com'
};

interface PendingGrant {
  value: string;
  expiresAt: number;
  operation: 'create' | 'restore';
  restoreAfterCreation: boolean;
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase().replace(/^::ffff:/, '').split('%')[0];
  return normalized === '::1' || normalized.startsWith('127.');
}

function isAllowedLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function sendJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const contentType = req.headers['content-type']?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') throw new Error('Expected a JSON request.');

  const declaredLength = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new Error('Request is too large.');
  }

  let body = '';
  let tooLarge = false;
  req.setEncoding('utf8');
  for await (const chunk of req) {
    if (tooLarge) continue;
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    if (Buffer.byteLength(body, 'utf8') + Buffer.byteLength(text, 'utf8') > MAX_REQUEST_BYTES) {
      tooLarge = true;
      body = '';
    } else {
      body += text;
    }
  }
  if (tooLarge) throw new Error('Request is too large.');

  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid request.');
  }
  return parsed as Record<string, unknown>;
}

function sameGrant(provided: unknown, operation: unknown, expected: PendingGrant | null): boolean {
  if (typeof provided !== 'string' || !expected || expected.expiresAt <= Date.now() || operation !== expected.operation) return false;
  const providedBytes = Buffer.from(provided, 'utf8');
  const expectedBytes = Buffer.from(expected.value, 'utf8');
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

function promptOwnerForApproval(
  account: { fullName: string; userId: string; email: string },
  operation: 'create' | 'restore'
): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return Promise.resolve(false);

  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const confirmation = operation === 'restore' ? 'RESTORE ADMIN' : 'CREATE ADMIN';
  const description = operation === 'restore'
    ? 'reset and reactivate the existing local administrator account'
    : 'create the local administrator account';
  return terminal.question(
    `\nLocal administrator recovery request:\n  Action: ${description}\n  Name: ${account.fullName}\n  User ID: ${account.userId}\n  Email: ${account.email}\nConfirm these details and action match your request, then type ${confirmation} (anything else cancels): `
  ).then(answer => answer.trim() === confirmation).finally(() => terminal.close());
}

function createRecoveryMarkerPath(projectRoot: string): { directory: string; marker: string } {
  const projectKey = createHash('sha256')
    .update(path.resolve(projectRoot).toLowerCase())
    .digest('hex')
    .slice(0, 24);
  const stateRoot = process.env.LOCALAPPDATA || path.join(homedir(), '.local', 'share');
  const directory = path.join(stateRoot, 'BuildPulse', 'local-admin-recovery');
  return { directory, marker: path.join(directory, `${projectKey}.used`) };
}

function readCompletedGrantDigest(markerPath: string): string | null {
  try {
    const marker: unknown = JSON.parse(readFileSync(markerPath, 'utf8'));
    if (marker && typeof marker === 'object' &&
      'grantDigest' in marker && typeof marker.grantDigest === 'string' && /^[0-9a-f]{64}$/.test(marker.grantDigest)) {
      return marker.grantDigest;
    }
  } catch {
    // A malformed marker remains fail-closed because its presence still blocks recovery.
  }
  return null;
}

function readCompletedGrantOperation(markerPath: string): 'create' | 'restore' | null {
  try {
    const marker: unknown = JSON.parse(readFileSync(markerPath, 'utf8'));
    if (marker && typeof marker === 'object' && 'operation' in marker &&
      (marker.operation === 'create' || marker.operation === 'restore')) {
      return marker.operation;
    }
  } catch {
    // The marker remains fail-closed when its contents cannot be read.
  }
  return null;
}

function isSameLocalOrigin(req: IncomingMessage, requireOrigin: boolean): boolean {
  if (!isLoopbackAddress(req.socket.remoteAddress)) return false;

  const hostHeader = req.headers.host;
  if (!hostHeader) return false;

  let requestUrl: URL;
  try {
    requestUrl = new URL(`http://${hostHeader}`);
  } catch {
    return false;
  }
  if (!isAllowedLocalHostname(requestUrl.hostname)) return false;

  if (!requireOrigin) return true;
  const origin = req.headers.origin;
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    return originUrl.protocol === 'http:' &&
      isAllowedLocalHostname(originUrl.hostname) &&
      originUrl.origin === requestUrl.origin;
  } catch {
    return false;
  }
}

function validAccountRequest(body: Record<string, unknown>): boolean {
  const validFields = typeof body.full_name === 'string' && body.full_name.trim().length > 0 && body.full_name.length <= 120 &&
    !/[\u0000-\u001f\u007f]/.test(body.full_name) &&
    typeof body.user_id === 'string' && /^[A-Za-z0-9._-]{3,40}$/.test(body.user_id) &&
    typeof body.email === 'string' && body.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) &&
    (body.operation === 'create' || body.operation === 'restore');
  return validFields &&
    (body.full_name as string).trim().toLocaleLowerCase() === RECOVERY_ADMIN_IDENTITY.fullName.toLocaleLowerCase() &&
    (body.user_id as string).trim().toLocaleUpperCase() === RECOVERY_ADMIN_IDENTITY.userId &&
    (body.email as string).trim().toLocaleLowerCase() === RECOVERY_ADMIN_IDENTITY.email;
}

export function localAdminRecoveryPlugin(projectRoot: string): Plugin {
  const markerPaths = createRecoveryMarkerPath(projectRoot);
  let pendingGrant: PendingGrant | null = null;
  let completedGrantDigest = readCompletedGrantDigest(markerPaths.marker);
  let completedGrantOperation: 'create' | 'restore' | null = readCompletedGrantOperation(markerPaths.marker);
  let ownerConfirmationInProgress = false;

  return {
    name: 'buildpulse-local-admin-recovery',
    apply: 'serve',
    configureServer(server) {
      server.config.logger.info(
        existsSync(markerPaths.marker)
          ? 'BuildPulse local administrator recovery has already been used for this workspace.'
          : 'BuildPulse local administrator recovery is restricted to this loopback development server.'
      );

      server.middlewares.use((req, res, next) => {
        let pathname = '';
        try {
          pathname = new URL(req.url || '/', 'http://localhost').pathname;
        } catch {
          return next();
        }

        if (!pathname.startsWith(`${RECOVERY_BASE_PATH}/`)) return next();
        if (!isSameLocalOrigin(req, req.method !== 'GET')) {
          sendJson(res, 404, { message: 'Recovery is available only from this local development browser.' });
          return;
        }

        void (async () => {
          if (req.method === 'GET' && pathname === `${RECOVERY_BASE_PATH}/status`) {
            const operation = new URL(req.url || '/', 'http://localhost').searchParams.get('operation');
            const markerExists = existsSync(markerPaths.marker);
            sendJson(res, 200, { available: operation === 'restore' || (operation === 'create' && !markerExists) });
            return;
          }

          if (req.method !== 'POST') {
            sendJson(res, 405, { message: 'Method not allowed.' });
            return;
          }

          let body: Record<string, unknown>;
          try {
            body = await readJsonBody(req);
          } catch {
            sendJson(res, 400, { message: 'Invalid recovery request.' });
            return;
          }

          if (pathname === `${RECOVERY_BASE_PATH}/authorize`) {
            const markerAlreadyUsed = existsSync(markerPaths.marker);
            if (markerAlreadyUsed && body.operation !== 'restore') {
              sendJson(res, 410, { message: 'The one-time local recovery has already been used.' });
              return;
            }
            if (!validAccountRequest(body)) {
              sendJson(res, 400, { message: 'Enter a valid administrator identity and recovery action.' });
              return;
            }
            if (ownerConfirmationInProgress || (pendingGrant && pendingGrant.expiresAt > Date.now())) {
              sendJson(res, 409, { message: 'A recovery request is already awaiting completion.' });
              return;
            }

            ownerConfirmationInProgress = true;
            try {
              const operation = body.operation as 'create' | 'restore';
              const approved = await promptOwnerForApproval({
                fullName: (body.full_name as string).replace(/[\r\n\t]/g, ' '),
                userId: body.user_id as string,
                email: (body.email as string).replace(/[\r\n\t]/g, ' ')
              }, operation);
              if (!approved) {
                sendJson(res, 403, { message: 'The local owner did not approve this recovery request.' });
                return;
              }
              if (existsSync(markerPaths.marker) && operation !== 'restore') {
                sendJson(res, 410, { message: 'The one-time local recovery has already been used.' });
                return;
              }

              const value = randomBytes(32).toString('hex');
              pendingGrant = {
                value,
                expiresAt: Date.now() + GRANT_TTL_MS,
                operation,
                restoreAfterCreation: markerAlreadyUsed
              };
              sendJson(res, 200, { grant: value });
            } finally {
              ownerConfirmationInProgress = false;
            }
            return;
          }

          if (pathname === `${RECOVERY_BASE_PATH}/complete`) {
            if (existsSync(markerPaths.marker)) {
              const submittedGrant = typeof body.grant === 'string' ? body.grant : '';
              const submittedDigest = createHash('sha256').update(submittedGrant).digest('hex');
              if (completedGrantDigest && body.operation === completedGrantOperation && submittedGrant && timingSafeEqual(
                Buffer.from(submittedDigest, 'hex'),
                Buffer.from(completedGrantDigest, 'hex')
              )) {
                sendJson(res, 200, { completed: true });
                return;
              }
              const approvedRestore = pendingGrant;
              if (!approvedRestore?.restoreAfterCreation || approvedRestore.operation !== 'restore' ||
                !sameGrant(body.grant, body.operation, approvedRestore)) {
                pendingGrant = null;
                sendJson(res, 410, { message: 'The one-time local recovery has already been used. Only an owner-approved reset of the existing administrator is available.' });
                return;
              }
              const restoreGrantDigest = createHash('sha256').update(approvedRestore.value).digest('hex');
              completedGrantDigest = restoreGrantDigest;
              completedGrantOperation = 'restore';
              pendingGrant = null;
              sendJson(res, 200, { completed: true });
              return;
            }
            const approvedGrant = pendingGrant;
            if (!approvedGrant || !sameGrant(body.grant, body.operation, approvedGrant)) {
              sendJson(res, 403, { message: 'The owner approval has expired. Start the recovery flow again.' });
              return;
            }

            try {
              mkdirSync(markerPaths.directory, { recursive: true, mode: 0o700 });
              const grantDigest = createHash('sha256').update(approvedGrant.value).digest('hex');
              const descriptor = openSync(markerPaths.marker, 'wx', 0o600);
              try {
                writeFileSync(descriptor, JSON.stringify({
                  completedAt: new Date().toISOString(),
                  grantDigest,
                  operation: approvedGrant.operation
                }), 'utf8');
              } finally {
                closeSync(descriptor);
              }
              completedGrantDigest = grantDigest;
              completedGrantOperation = approvedGrant.operation;
              pendingGrant = null;
              sendJson(res, 200, { completed: true });
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
                pendingGrant = null;
                sendJson(res, 410, { message: 'The one-time local recovery has already been used.' });
                return;
              }
              sendJson(res, 500, { message: 'Could not record the one-time recovery. No account was committed.' });
            }
            return;
          }

          if (pathname === `${RECOVERY_BASE_PATH}/status`) {
            const submittedGrant = typeof body.grant === 'string' ? body.grant : '';
            const submittedDigest = submittedGrant ? createHash('sha256').update(submittedGrant).digest('hex') : '';
            const completedForThisGrant = body.operation === completedGrantOperation && !!completedGrantDigest && !!submittedDigest && timingSafeEqual(
              Buffer.from(submittedDigest, 'hex'),
              Buffer.from(completedGrantDigest, 'hex')
            );
            const markerExists = existsSync(markerPaths.marker);
            sendJson(res, 200, {
              available: body.operation === 'restore' || (body.operation === 'create' && !markerExists),
              completedForThisGrant
            });
            return;
          }

          if (pathname === `${RECOVERY_BASE_PATH}/cancel`) {
            if (sameGrant(body.grant, body.operation, pendingGrant)) pendingGrant = null;
            sendJson(res, 200, { cancelled: true });
            return;
          }

          sendJson(res, 404, { message: 'Recovery route not found.' });
        })().catch(() => {
          if (!res.headersSent) sendJson(res, 500, { message: 'Local recovery request failed.' });
        });
      });
    }
  };
}
