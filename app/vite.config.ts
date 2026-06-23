import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 소스는 app/ 에 두고, 빌드 결과물은 레포 루트(..)로 출력해
// GitHub Pages(main 루트 서빙)가 별도 설정 없이 바로 서빙하도록 한다.
// base: 레포명(GitHub Pages 프로젝트 페이지). 루트 레포면 '/'.
export default defineConfig({
  plugins: [react()],
  base: '/academy-schedule-generator/',
  build: {
    outDir: '..',
    emptyOutDir: false, // 루트의 SPEC.md/README.md 등을 지우지 않도록
    rollupOptions: {
      output: {
        // 해시 없는 고정 파일명 → 매 빌드마다 덮어써 루트에 잔여 파일이 쌓이지 않게 함
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/index.[ext]',
      },
    },
  },
});
