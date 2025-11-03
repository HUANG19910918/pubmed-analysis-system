import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  build: {
    // 提高块大小警告限制
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 手动分块配置，将大型依赖分离到单独的块中
        manualChunks: {
          // AI SDK 相关
          'ai-vendors': [
            '@anthropic-ai/sdk',
            '@google/generative-ai', 
            'openai'
          ],
          // React 生态系统
          'react-vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            'react-hook-form'
          ],
          // 图表库
          'charts': [
            'chart.js',
            'react-chartjs-2',
            'recharts',
            'chartjs-adapter-date-fns'
          ],
          // 工具库
          'utils': [
            'axios',
            '@tanstack/react-query',
            'date-fns',
            'clsx',
            'tailwind-merge',
            'zustand',
            'sonner'
          ],
          // Supabase
          'supabase': ['@supabase/supabase-js'],
          // 图标库
          'icons': ['lucide-react']
        }
      }
    },
    // 启用源码映射以便调试
    sourcemap: false, // 生产环境关闭源码映射以减少包大小
    // 压缩配置 - 使用默认的 esbuild 压缩器
    minify: 'esbuild'
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 60000, // 60秒超时
        proxyTimeout: 60000, // 代理超时
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})
