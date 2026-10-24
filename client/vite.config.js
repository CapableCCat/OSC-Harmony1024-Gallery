import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 零后端（D-01）：没有 /api 代理，数据全部来自构建期生成的静态 works.json
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
