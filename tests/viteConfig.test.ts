import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import viteConfig from '../vite.config.ts';

type ViteEnvironment = { command: 'serve' | 'build'; mode: string };
type ViteConfigFactory = (environment: ViteEnvironment) => Promise<{
  cacheDir?: string;
  resolve?: { dedupe?: string[] };
  optimizeDeps?: { include?: string[] };
}> | {
  cacheDir?: string;
  resolve?: { dedupe?: string[] };
  optimizeDeps?: { include?: string[] };
};

test('each BuildPulse Vite process isolates its dependency cache and dedupes React', async () => {
  const createConfig = viteConfig as unknown as ViteConfigFactory;
  const development = await createConfig({ command: 'serve', mode: 'development' });
  const recovery = await createConfig({ command: 'serve', mode: 'local-recovery' });

  assert.equal(development.cacheDir, path.resolve(
    process.cwd(), 'node_modules', `.vite-buildpulse-development-${process.pid}`
  ));
  assert.notEqual(development.cacheDir, recovery.cacheDir);
  assert.deepEqual(development.resolve?.dedupe, ['react', 'react-dom']);
  assert.ok(development.optimizeDeps?.include?.includes('react'));
  assert.ok(development.optimizeDeps?.include?.includes('react-dom/client'));
});
