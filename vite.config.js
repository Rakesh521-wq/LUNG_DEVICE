import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    watch: {
      ignored: ['**/*.crdownload', '**/*.tmp', '**/assets/**']
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
