import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 启用 React Fast Refresh
      fastRefresh: true,
      // 优化 JSX 运行时
      jsxRuntime: 'automatic'
    }),
    tsconfigPaths(),
    // 包分析插件
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    // 设置合理的块大小警告限制
    chunkSizeWarningLimit: 500,
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 优化构建性能
    target: 'esnext',
    // 启用实验性功能以提升性能
    reportCompressedSize: false, // 禁用压缩大小报告以加快构建
    rollupOptions: {
      // 优化外部依赖处理
      external: [],
      output: {
        // 更细粒度的手动分块配置
        manualChunks: (id) => {
          // 将 node_modules 中的包分离
          if (id.includes('node_modules')) {
            // AI SDK 相关 - 这些通常很大，单独分离
            if (id.includes('@anthropic-ai/sdk')) return 'anthropic';
            if (id.includes('@google/generative-ai')) return 'google-ai';
            if (id.includes('openai')) return 'openai';
            
            // React 核心库
            if (id.includes('react') || id.includes('react-dom')) return 'react-core';
            if (id.includes('react-router')) return 'react-router';
            if (id.includes('react-hook-form')) return 'react-forms';
            
            // 图表库 - 通常较大
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'chartjs';
            if (id.includes('recharts')) return 'recharts';
            
            // 工具库
            if (id.includes('axios')) return 'http-client';
            if (id.includes('@tanstack/react-query')) return 'react-query';
            if (id.includes('date-fns')) return 'date-utils';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@supabase/supabase-js')) return 'supabase';
            
            // 其他小型工具库合并
            if (id.includes('clsx') || id.includes('tailwind-merge') || 
                id.includes('zustand') || id.includes('sonner')) return 'utils';
            
            // 其他第三方库
            return 'vendor';
          }
          
          // 将页面组件分离到单独的块
          if (id.includes('/pages/Home')) return 'page-home';
          if (id.includes('/pages/Settings')) return 'page-settings';
          if (id.includes('/components/AIModelSettings')) return 'ai-settings';
        },
        // 优化文件名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // 生产环境关闭源码映射以减少包大小
    sourcemap: false,
    // 使用 terser 进行更好的压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console.log
        drop_debugger: true, // 移除 debugger
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // 移除特定函数调用
        passes: 2 // 多次压缩以获得更好的结果
      },
      mangle: {
        safari10: true // 兼容 Safari 10
      }
    }
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
