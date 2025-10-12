<div align="center">
<img width="1200" height="475" alt="Financial Dashboard" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 💰 لوحة التحكم المالية - Financial Dashboard

لوحة تحكم مالية ذكية مع تحليل بالذكاء الاصطناعي لإدارة الشؤون المالية الشخصية.

## ✨ الميزات

- 📊 **ملخص مالي شامل** مع الرسوم البيانية
- 🤖 **محلل ذكي** بالذكاء الاصطناعي (Gemini AI)
- 💳 **إدارة البطاقات الائتمانية** والأرصدة
- 🏦 **إدارة الحسابات البنكية**
- 📱 **تحليل تلقائي** لرسائل SMS المالية
- 📈 **تقارير وتحليلات** مفصلة
- 💾 **تصدير البيانات** بصيغ مختلفة
- 📱 **تصميم متجاوب** للهواتف والأجهزة اللوحية

## 🚀 التشغيل المحلي

### المتطلبات
- Node.js 18 أو أحدث
- npm أو yarn

### خطوات التشغيل

1. **استنساخ المشروع:**
   ```bash
   git clone https://github.com/yourusername/financial-dashboard.git
   cd financial-dashboard
   ```

2. **تثبيت المكتبات:**
   ```bash
   npm install
   ```

3. **إعداد متغيرات البيئة:**
   
   انسخ ملف `env.example` إلى `.env.local`:
   ```bash
   cp env.example .env.local
   ```
   
   ثم عدّل الملف `.env.local` بالمفاتيح الصحيحة:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # Gemini API Configuration
   VITE_GEMINI_API_KEY=your_gemini_api_key_here

   # App Configuration
   VITE_APP_ENVIRONMENT=development
   ```

4. **تشغيل المشروع:**
   ```bash
   npm run dev
   ```

5. **فتح التطبيق:**
   افتح المتصفح واذهب إلى `http://localhost:3000`

## 🔑 الحصول على المفاتيح

### مفتاح Gemini API
1. اذهب إلى [Google AI Studio](https://makersuite.google.com/app/apikey)
2. أنشئ مفتاح API جديد
3. ضعه في متغير `VITE_GEMINI_API_KEY`

### إعدادات Firebase
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. أنشئ مشروع جديد أو استخدم مشروع موجود
3. اذهب إلى Project Settings > General
4. انسخ إعدادات Firebase وضعهما في ملف `.env.local`

## 🚀 النشر على GitHub Pages

### إعداد GitHub Secrets

اذهب إلى Settings > Secrets and variables > Actions في مستودع GitHub وأضف:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_GEMINI_API_KEY
```

### تفعيل GitHub Pages

1. اذهب إلى Settings > Pages في مستودع GitHub
2. اختر "GitHub Actions" كمصدر
3. عند الرفع على branch `main`، سيتم النشر تلقائياً

## 🛠️ التقنيات المستخدمة

- **Frontend:** React 19, TypeScript, TailwindCSS
- **Build Tool:** Vite
- **AI Integration:** Google Gemini API
- **Database:** Firebase Firestore
- **Charts:** Chart.js
- **Deployment:** GitHub Pages

## 📱 الاستخدام

1. **إضافة الحركات:** استخدم زر "إضافة حركة" أو لصق رسالة SMS
2. **التحليل الذكي:** اسأل المحلل الذكي عن وضعك المالي
3. **إدارة البطاقات:** أضف بطاقات ائتمانية وحدد الكلمات المفتاحية
4. **التقارير:** تصفح التحليلات والتقارير المفصلة
5. **التصدير:** احفظ بياناتك بصيغ مختلفة

## 🤝 المساهمة

نرحب بالمساهمات! يرجى:

1. عمل Fork للمشروع
2. إنشاء branch جديد (`git checkout -b feature/AmazingFeature`)
3. عمل Commit للتغييرات (`git commit -m 'Add some AmazingFeature'`)
4. عمل Push للـ branch (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 👥 فريق التطوير

تم تطوير هذا المشروع بواسطة فريق K.A Team

## 📞 الدعم

إذا واجهت أي مشاكل، يرجى فتح [issue](https://github.com/yourusername/financial-dashboard/issues) جديد.
