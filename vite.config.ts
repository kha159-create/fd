import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = {
  ...process.env,
  ...loadEnv(mode, process.cwd(), '')
};
    
    // طباعة جميع متغيرات البيئة للتشخيص
    console.log('🔍 Environment variables loaded:', {
      mode,
      envKeys: Object.keys(env).filter(key => key.startsWith('VITE_')),
      firebaseApiKey: env.VITE_FIREBASE_API_KEY ? '✅ موجود' : '❌ مفقود',
      firebaseProjectId: env.VITE_FIREBASE_PROJECT_ID ? '✅ موجود' : '❌ مفقود',
      geminiApiKey: env.VITE_GEMINI_API_KEY ? '✅ موجود' : '❌ مفقود'
    });
    
    return {
      base: '/fd/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Gemini API Keys
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        
        // Firebase Configuration
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
        
        // App Environment
        'import.meta.env.VITE_APP_ENVIRONMENT': JSON.stringify(env.VITE_APP_ENVIRONMENT || 'production'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
