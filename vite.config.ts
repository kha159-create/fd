import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
        base: '/fd/', // المسار الأساسي لمشروعك على GitHub Pages
        
        plugins: [
            react(),
            VitePWA({
                // ✅ هذا السطر يخبر الإضافة أن تقوم بتسجيل الـ Service Worker تلقائيًا
                // وهي الطريقة الصحيحة والموصى بها
                registerType: 'autoUpdate',
                
                // هذا يضمن أن الـ Service Worker يعمل بشكل صحيح
                workbox: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg}']
                },
                
                // إعدادات ملف المانيفست ليكون تطبيقك قابلاً للتثبيت
                manifest: {
                    name: 'MASROF - لوحة التحكم المالية',
                    short_name: 'MASROF',
                    description: 'تطبيق إدارة المالية الشخصية مع الذكاء الاصطناعي',
                    theme_color: '#3b82f6',
                    icons: [
                        {
                            src: 'icon-192.png', // سيتم البحث عنها في مجلد public
                            sizes: '192x192',
                            type: 'image/png'
                        },
                        {
                            src: 'icon-512.png', // سيتم البحث عنها في مجلد public
                            sizes: '512x512',
                            type: 'image/png'
                        }
                    ]
                }
            })
        ],
        
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        
        css: {
            postcss: './postcss.config.js',
        },
        
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
        
        build: {
            sourcemap: false,
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor: ['react', 'react-dom'],
                        firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
                        gemini: ['@google/generative-ai']
                    }
                }
            }
        },
        
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        }
    };
});
