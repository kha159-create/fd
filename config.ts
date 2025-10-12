// إعدادات المشروع - مفاتيح Firebase و Gemini
export const config = {
  // Firebase Configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
  },
  
  // Gemini API Configuration
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || "",
    model: "gemini-2.5-flash"
  },
  
  // App Configuration
  app: {
    name: "لوحة التحكم المالية",
    version: "1.0.0",
    environment: import.meta.env.VITE_APP_ENVIRONMENT || "production"
  }
};

// التحقق من صحة الإعدادات
export const validateConfig = () => {
  const errors: string[] = [];
  
  // التحقق من Firebase
  if (!config.firebase.apiKey) {
    errors.push("مفتاح Firebase API مفقود");
  }
  if (!config.firebase.authDomain) {
    errors.push("Firebase Auth Domain مفقود");
  }
  if (!config.firebase.projectId) {
    errors.push("معرف مشروع Firebase مفقود");
  }
  if (!config.firebase.storageBucket) {
    errors.push("Firebase Storage Bucket مفقود");
  }
  if (!config.firebase.messagingSenderId) {
    errors.push("Firebase Messaging Sender ID مفقود");
  }
  if (!config.firebase.appId) {
    errors.push("Firebase App ID مفقود");
  }
  
  // التحقق من Gemini
  if (!config.gemini.apiKey) {
    errors.push("مفتاح Gemini API مفقود");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    hasFirebase: !!config.firebase.apiKey,
    hasGemini: !!config.gemini.apiKey
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
