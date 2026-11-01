import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { localAdminRecoveryPlugin } from '../scripts/localAdminRecoveryPlugin.ts';

test('local recovery server is loopback-only and fails closed without interactive owner approval', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'buildpulse-recovery-plugin-'));
  const previousLocalAppData = process.env.LOCALAPPDATA;
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  process.env.LOCALAPPDATA = path.join(temporaryRoot, 'app-data');
  Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
  Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: false });

  let recoveryMiddleware: ((req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => void) | undefined;
  const plugin = localAdminRecoveryPlugin(temporaryRoot);
  const configureServer = plugin.configureServer as unknown as (server: {
    config: { logger: { info: () => void } };
    middlewares: { use: (middleware: typeof recoveryMiddleware) => void };
  }) => void;
  configureServer({
    config: { logger: { info: () => undefined } },
    middlewares: { use: (middleware: typeof recoveryMiddleware) => { recoveryMiddleware = middleware; } }
  });

  const server = createServer((req, res) => {
    if (!recoveryMiddleware) {
      res.statusCode = 500;
      res.end();
      return;
    }
    recoveryMiddleware(req, res, () => {
      res.statusCode = 404;
      res.end();
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    const statusResponse = await fetch(`${origin}/__buildpulse_local_admin_recovery/status?operation=create`);
    assert.equal(statusResponse.status, 200);
    assert.deepEqual(await statusResponse.json(), { available: true });

    const identity = {
      full_name: 'Uma Mahesh',
      user_id: 'CHEN-ADM-01',
      email: 'admin@cheninfra.com',
      operation: 'create'
    };
    const authorizeResponse = await fetch(`${origin}/__buildpulse_local_admin_recovery/authorize`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(identity)
    });
    assert.equal(authorizeResponse.status, 403);
    assert.match(String((await authorizeResponse.json()).message), /did not approve/i);

    const completeResponse = await fetch(`${origin}/__buildpulse_local_admin_recovery/complete`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant: 'unapproved', operation: 'create' })
    });
    assert.equal(completeResponse.status, 403);
    const stillAvailable = await fetch(`${origin}/__buildpulse_local_admin_recovery/status?operation=create`);
    assert.deepEqual(await stillAvailable.json(), { available: true });
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (previousLocalAppData === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = previousLocalAppData;
    if (stdinDescriptor) Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    else Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: undefined });
    if (stdoutDescriptor) Object.defineProperty(process.stdout, 'isTTY', stdoutDescriptor);
    else Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: undefined });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('a consumed creation marker blocks another account but keeps exact-identity password restore owner-gated', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'buildpulse-recovery-used-marker-'));
  const previousLocalAppData = process.env.LOCALAPPDATA;
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const appDataRoot = path.join(temporaryRoot, 'app-data');
  process.env.LOCALAPPDATA = appDataRoot;
  Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
  Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: false });

  const projectKey = createHash('sha256')
    .update(path.resolve(temporaryRoot).toLowerCase())
    .digest('hex')
    .slice(0, 24);
  const markerDirectory = path.join(appDataRoot, 'BuildPulse', 'local-admin-recovery');
  const markerPath = path.join(markerDirectory, `${projectKey}.used`);
  mkdirSync(markerDirectory, { recursive: true });
  const markerContents = JSON.stringify({ completedAt: new Date().toISOString(), grantDigest: 'a'.repeat(64) });
  writeFileSync(markerPath, markerContents, 'utf8');

  let recoveryMiddleware: ((req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => void) | undefined;
  const plugin = localAdminRecoveryPlugin(temporaryRoot);
  const configureServer = plugin.configureServer as unknown as (server: {
    config: { logger: { info: () => void } };
    middlewares: { use: (middleware: typeof recoveryMiddleware) => void };
  }) => void;
  configureServer({
    config: { logger: { info: () => undefined } },
    middlewares: { use: middleware => { recoveryMiddleware = middleware; } }
  });

  const server = createServer((req, res) => {
    if (!recoveryMiddleware) {
      res.statusCode = 500;
      res.end();
      return;
    }
    recoveryMiddleware(req, res, () => {
      res.statusCode = 404;
      res.end();
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    const createStatus = await fetch(`${origin}/__buildpulse_local_admin_recovery/status?operation=create`);
    const restoreStatus = await fetch(`${origin}/__buildpulse_local_admin_recovery/status?operation=restore`);
    assert.deepEqual(await createStatus.json(), { available: false });
    assert.deepEqual(await restoreStatus.json(), { available: true });

    const headers = { Origin: origin, 'Content-Type': 'application/json' };
    const createResponse = await fetch(`${origin}/__buildpulse_local_admin_recovery/authorize`, {
      method: 'POST', headers,
      body: JSON.stringify({ full_name: 'Uma Mahesh', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com', operation: 'create' })
    });
    assert.equal(createResponse.status, 410);

    const restoreResponse = await fetch(`${origin}/__buildpulse_local_admin_recovery/authorize`, {
      method: 'POST', headers,
      body: JSON.stringify({ full_name: 'Uma Mahesh', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com', operation: 'restore' })
    });
    assert.equal(restoreResponse.status, 403);
    assert.match(String((await restoreResponse.json()).message), /did not approve/i);
    assert.equal(readFileSync(markerPath, 'utf8'), markerContents);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (previousLocalAppData === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = previousLocalAppData;
    if (stdinDescriptor) Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    else Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: undefined });
    if (stdoutDescriptor) Object.defineProperty(process.stdout, 'isTTY', stdoutDescriptor);
    else Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: undefined });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
