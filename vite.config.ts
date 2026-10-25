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

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(localRecoveryMode ? [localAdminRecoveryPlugin(__dirname)] : [])
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
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
