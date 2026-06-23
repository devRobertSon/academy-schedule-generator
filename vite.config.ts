import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: 레포명(GitHub Pages 프로젝트 페이지). 루트 레포면 '/'.
export default defineConfig({
  plugins: [react()],
  base: '/academy-schedule-generator/',
});
