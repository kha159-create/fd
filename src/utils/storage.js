// نظام التخزين الهجين: IndexedDB + Firebase Cloud Backup
import localforage from 'localforage';
// استخدم خدمة Firebase المشتركة لتجنب تهيئة تطبيق مختلف بمفاتيح ثابتة
import { firebaseService } from '../../services/firebaseService';
import { config, validateConfig } from '../../config';

// إعداد IndexedDB
localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'MASROF',
  version: 1.0,
  storeName: 'financial_data',
  description: 'تخزين البيانات المالية'
});

// حفظ البيانات محلياً فقط (لم يعد يُستخدم للسحابة هنا)
export const saveData = async (key, value) => {
  try {
    await localforage.setItem(key, value);
    console.log('✅ تم حفظ البيانات محلياً:', key);
    return true;
  } catch (error) {
    console.error('❌ خطأ في حفظ البيانات:', error);
    return false;
  }
};

// تحميل البيانات من التخزين المحلي فقط (التطبيق لا يعتمد هذه الدالة حالياً)
export const loadData = async (key) => {
  try {
    const localData = await localforage.getItem(key);
    if (localData) {
      console.log('📱 تم تحميل البيانات من التخزين المحلي:', key);
      return localData;
    }
    console.log('⚠️ لم يتم العثور على البيانات محلياً:', key);
    return null;
  } catch (error) {
    console.error('❌ خطأ في تحميل البيانات:', error);
    return null;
  }
};

// حفظ جميع البيانات في السحابة
export const saveToCloud = async (data) => {
  try {
    const validation = validateConfig();
    if (!validation.hasFirebase) {
      throw new Error('مفاتيح Firebase غير متوفرة');
    }

    const user = await firebaseService.getCurrentUser();
    if (!user) {
      throw new Error('يجب تسجيل الدخول قبل الحفظ في السحابة');
    }

    const timestamp = new Date().toISOString();
    const backupData = {
      ...data,
      userId: user.uid,
      backupTimestamp: timestamp,
      appVersion: config.app.version,
      version: '1.0.0'
    };

    const backupId = `${user.uid}_${Date.now()}`;
    const result = await firebaseService.saveData('backups', backupId, backupData);
    if (!result.success) {
      throw new Error(result.error || 'فشل حفظ النسخة الاحتياطية');
    }

    console.log('☁️ تم حفظ النسخة الاحتياطية في السحابة');
    return true;
  } catch (error) {
    console.error('❌ خطأ في حفظ النسخة الاحتياطية في السحابة:', error);
    return false;
  }
};

// استعادة البيانات من السحابة
export const restoreFromCloud = async () => {
  try {
    console.log('🔄 بدء استعادة البيانات من السحابة...');

    const validation = validateConfig();
    if (!validation.hasFirebase) {
      throw new Error('مفاتيح Firebase غير متوفرة');
    }

    const user = await firebaseService.getCurrentUser();
    if (!user) {
      throw new Error('يجب تسجيل الدخول لاستعادة النسخ السحابية');
    }

    // جلب جميع النسخ ثم ترشيحها حسب المستخدم الحالي
    const all = await firebaseService.getAllDocuments('backups');
    if (!all.success || !Array.isArray(all.data) || all.data.length === 0) {
      throw new Error('لا توجد نسخ احتياطية في السحابة');
    }

    const userBackups = all.data.filter((b) => !b.userId || b.userId === user.uid);
    if (userBackups.length === 0) {
      throw new Error('لا توجد نسخ احتياطية لهذا المستخدم');
    }

    // اختيار الأحدث اعتماداً على backupTimestamp أو backupDate
    const parseTs = (b) => {
      const ts = b.backupTimestamp || b.backupDate || b.lastUpdated;
      const n = Date.parse(ts || '');
      return Number.isFinite(n) ? n : 0;
    };
    const latestBackup = userBackups.reduce((a, b) => (parseTs(b) > parseTs(a) ? b : a));

    // بناء الحالة المستعادة
    const keys = ['transactions', 'categories', 'cards', 'bankAccounts', 'installments', 'loans', 'investments', 'settings'];
    const restoredState = {};
    for (const key of keys) {
      if (latestBackup[key] != null) {
        restoredState[key] = latestBackup[key];
      }
    }

    // ضمان وجود مفاتيح أساسية
    restoredState.transactions = restoredState.transactions || [];
    restoredState.categories = restoredState.categories || [];
    restoredState.cards = restoredState.cards || {};
    restoredState.bankAccounts = restoredState.bankAccounts || {};
    restoredState.installments = restoredState.installments || [];
    restoredState.loans = restoredState.loans || {};
    restoredState.investments = restoredState.investments || { currentValue: 0 };
    restoredState.settings = restoredState.settings || { darkMode: false, language: 'ar', notifications: true };

    // احفظ نسخة كاملة في localStorage بحيث يقرأها التطبيق فور إعادة التحميل
    try {
      const stateData = JSON.stringify(restoredState);
      localStorage.setItem('financial_dashboard_state', stateData);
      localStorage.setItem('financial_dashboard_backup_1', stateData);
      localStorage.setItem('financial_dashboard_backup_2', stateData);
      const dateKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`financial_dashboard_${dateKey}`, stateData);
    } catch (e) {
      console.warn('⚠️ لم نتمكن من الحفظ في localStorage:', e);
    }

    // احفظ كذلك في مستند المستخدم حتى يحمّل التطبيق من Firebase بعد الدخول
    const saveRes = await firebaseService.saveData('users', user.uid, restoredState);
    if (!saveRes.success) {
      console.warn('⚠️ فشل حفظ الحالة المستعادة في مستند المستخدم:', saveRes.error);
    }

    console.log('✅ تم استعادة البيانات من السحابة وحفظها محلياً وللمستخدم');
    return {
      success: true,
      message: 'تم استعادة البيانات من آخر نسخة احتياطية وحفظها بنجاح',
      timestamp: latestBackup.backupTimestamp || latestBackup.backupDate || latestBackup.lastUpdated || null
    };
  } catch (error) {
    console.error('❌ خطأ أثناء الاستعادة من السحابة:', error);
    return {
      success: false,
      message: error.message || 'حدث خطأ أثناء استعادة البيانات من السحابة'
    };
  }
};

// تحميل ملف النسخة الاحتياطية
export const downloadBackup = async () => {
  try {
    // حاول أولاً أخذ الحالة من localStorage (هي المصدر الحقيقي للتطبيق)
    let allData = null;
    try {
      const stateStr = localStorage.getItem('financial_dashboard_state');
      if (stateStr) {
        allData = JSON.parse(stateStr);
      }
    } catch {}

    // إن لم تتوفر، اجمع من localforage كمحاولة ثانية
    if (!allData) {
      allData = {};
      const keys = ['transactions', 'categories', 'cards', 'bankAccounts', 'installments', 'loans', 'investments', 'settings'];
      for (const key of keys) {
        const data = await localforage.getItem(key);
        if (data) allData[key] = data;
      }
    }

    const backupData = {
      ...(allData || {}),
      backupTimestamp: new Date().toISOString(),
      version: '1.0.0',
      appVersion: config.app.version
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `masrof-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    console.log('💾 تم تحميل ملف النسخة الاحتياطية');
    return true;
  } catch (error) {
    console.error('❌ خطأ في تحميل النسخة الاحتياطية:', error);
    return false;
  }
};

// استعادة من ملف
export const restoreFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);

        // التحقق من صحة البيانات الأساسية
        if (!(backupData && (backupData.version || backupData.backupTimestamp))) {
          throw new Error('ملف النسخة الاحتياطية غير صالح');
        }

        const keys = ['transactions', 'categories', 'cards', 'bankAccounts', 'installments', 'loans', 'investments', 'settings'];
        const restoredState = {};
        for (const key of keys) {
          if (backupData[key] != null) restoredState[key] = backupData[key];
        }

        // ضمان المفاتيح الأساسية
        restoredState.transactions = restoredState.transactions || [];
        restoredState.categories = restoredState.categories || [];
        restoredState.cards = restoredState.cards || {};
        restoredState.bankAccounts = restoredState.bankAccounts || {};
        restoredState.installments = restoredState.installments || [];
        restoredState.loans = restoredState.loans || {};
        restoredState.investments = restoredState.investments || { currentValue: 0 };
        restoredState.settings = restoredState.settings || { darkMode: false, language: 'ar', notifications: true };

        // احفظ في localStorage ليستعملها التطبيق بعد إعادة التحميل
        try {
          const stateData = JSON.stringify(restoredState);
          localStorage.setItem('financial_dashboard_state', stateData);
          localStorage.setItem('financial_dashboard_backup_1', stateData);
          localStorage.setItem('financial_dashboard_backup_2', stateData);
          const dateKey = new Date().toISOString().split('T')[0];
          localStorage.setItem(`financial_dashboard_${dateKey}`, stateData);
        } catch (e) {
          console.warn('⚠️ لم نتمكن من الحفظ في localStorage:', e);
        }

        // إذا كان المستخدم مسجلاً، احفظ في مستند المستخدم كذلك
        try {
          const user = await firebaseService.getCurrentUser();
          if (user) {
            const res = await firebaseService.saveData('users', user.uid, restoredState);
            if (!res.success) console.warn('⚠️ فشل حفظ الحالة المستعادة في مستند المستخدم من الملف:', res.error);
          }
        } catch (e) {
          console.warn('⚠️ تعذر حفظ الحالة في مستند المستخدم:', e);
        }

        console.log('✅ تم استعادة البيانات من الملف وحفظها محلياً وللمستخدم');
        resolve({
          success: true,
          message: 'تم استعادة البيانات من الملف بنجاح',
          timestamp: backupData.backupTimestamp || null
        });
      } catch (error) {
        console.error('❌ خطأ في استعادة الملف:', error);
        reject({
          success: false,
          message: error.message || 'حدث خطأ أثناء استعادة البيانات من الملف'
        });
      }
    };

    reader.onerror = () => {
      reject({ success: false, message: 'خطأ في قراءة الملف' });
    };

    reader.readAsText(file);
  });
};

// مسح جميع البيانات
export const clearAllData = async () => {
  try {
    await localforage.clear();
    console.log('🗑️ تم مسح جميع البيانات المحلية');
    return true;
  } catch (error) {
    console.error('❌ خطأ في مسح البيانات:', error);
    return false;
  }
};

// الحصول على معلومات التخزين
export const getStorageInfo = async () => {
  try {
    const keys = await localforage.keys();
    const info = {
      totalKeys: keys.length,
      keys: keys,
      estimatedSize: await localforage.length()
    };
    
    return info;
  } catch (error) {
    console.error('❌ خطأ في الحصول على معلومات التخزين:', error);
    return null;
  }
};
