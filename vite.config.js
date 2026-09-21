import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 相对路径产物：放 Vercel 根域、GitHub Pages 子路径、本地直开都不会 404
  base: './',
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5178,
    open: false,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 字体本身很大，单独切出来，别和业务代码混在一个 chunk
    // 注意 Vite 8 底层换成了 rolldown，manualChunks 只接受函数形式
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/@vue')) {
            return 'vue-vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  // 像素画的渲染逻辑挂在 onMounted 里，SSR 冒烟测试覆盖不到，
  // 所以另有一组跑在 jsdom 里的真实挂载测试
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
})
