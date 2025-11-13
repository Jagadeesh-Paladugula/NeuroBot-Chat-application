import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Build optimization
    target: 'esnext',
    minify: 'esbuild', // Use esbuild for faster builds (terser is slower)
    // Note: To use terser, install: npm install -D terser
    // Then change minify to 'terser' and uncomment terserOptions
    // terserOptions: {
    //   compress: {
    //     drop_console: true, // Remove console.log in production
    //     drop_debugger: true,
    //   },
    // },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'apollo-vendor': ['@apollo/client', 'graphql'],
          'ui-vendor': ['styled-components'],
          'socket-vendor': ['socket.io-client'],
        },
        // Optimize chunk names
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Source maps for production debugging (can be disabled)
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
    // Asset inlining threshold (4kb)
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    include: [
      '@apollo/client',
      '@apollo/client/core',
      '@apollo/client/react',
      '@apollo/client/cache',
      '@apollo/client/link/context',
      '@apollo/client/link/http',
      'graphql',
      'graphql-tag',
      'react',
      'react-dom',
      'react-router-dom',
      'styled-components',
      'socket.io-client',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  resolve: {
    dedupe: ['@apollo/client', 'graphql', 'react', 'react-dom'],
    alias: {
      '@': '/src',
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.*',
        '**/*.spec.*',
      ],
    },
  },
});

