import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://bmznfrxllzxamwwqwdjn.supabase.co'
      ),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(
        process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtem5mcnhsbHp4YW13d3F3ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTg2NTYsImV4cCI6MjEwNTM5NDY1Nn0.W6WX551eWrx8GQ8Gclfw-UIoCmcV1xDNtHSQ0CnMqW0'
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
