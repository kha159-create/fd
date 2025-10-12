// إعدادات المشروع - مفاتيح Firebase و Gemini
export const config = {
  // Firebase Configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBA1uXbBt5qHfOh9nTFXuI2IVN-uhWYD_g",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "expenses-140c4.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "expenses-140c4",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "expenses-140c4.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "221809737779",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:221809737779:web:a0e2f3d1b9b6c1e1f2d3e4"
  },
  
  // Gemini API Configuration
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCU4hOMnyFAWpi1zuy1tRuWW9AV358_njE",
    model: "gemini-2.5-flash"
  },
  
  // App Configuration
  app: {
    name: "لوحة التحكم المالية",
    version: "1.0.0",
    environment: import.meta.env.VITE_APP_ENVIRONMENT || "development"
  }
};

// التحقق من صحة الإعدادات
export const validateConfig = () => {
  const errors: string[] = [];
  
  // التحقق من Firebase
  if (!config.firebase.apiKey) {
    errors.push("مفتاح Firebase API مفقود");
  }
  if (!config.firebase.projectId) {
    errors.push("معرف مشروع Firebase مفقود");
  }
  
  // التحقق من Gemini
  if (!config.gemini.apiKey || config.gemini.apiKey === "your-gemini-api-key-here") {
    errors.push("مفتاح Gemini API مفقود أو غير مُعد");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// طباعة تحذير في الكونسول إذا كانت الإعدادات غير مكتملة
if (typeof window !== 'undefined') {
  const validation = validateConfig();
  if (!validation.isValid) {
    console.warn("⚠️ تحذير: بعض الإعدادات غير مكتملة:", validation.errors);
  } else {
    console.log("✅ جميع الإعدادات صحيحة ومكتملة");
  }
}
