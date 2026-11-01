import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { localAdminRecoveryPlugin } from './scripts/localAdminRecoveryPlugin.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ command, mode }) => {
  const localRecoveryMode = command === 'serve' && mode === 'local-recovery' && process.env.NODE_ENV !== 'production';
  const recoveryPort = Number(process.env.BP_RECOVERY_PORT || '3001');
  // Multiple local app/recovery servers can run from this checkout at once.
  // Vite's default node_modules/.vite cache is shared by all of them, so an
  // optimizer refresh in one server can leave another serving mixed React
  // module versions. Give each process an isolated dependency cache.
  const viteCacheDir = path.resolve(__dirname, 'node_modules', `.vite-buildpulse-${mode}-${process.pid}`);

  return {
    cacheDir: viteCacheDir,
    plugins: [
      react(),
      tailwindcss(),
      ...(localRecoveryMode ? [localAdminRecoveryPlugin(__dirname)] : [])
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom/client'],
    },
    server: {
      ...(localRecoveryMode ? {
        host: 'localhost',
        port: Number.isInteger(recoveryPort) && recoveryPort > 0 && recoveryPort < 65536 ? recoveryPort : 3001,
        strictPort: true
      } : {}),
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
