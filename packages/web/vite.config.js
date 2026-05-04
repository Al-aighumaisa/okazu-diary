import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    reactRouter(),
    svgr({
      svgrOptions: {
        svgo: true,
      },
    }),
  ],
  build: {
    sourcemap: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
});
