import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { config } from '../config';

// تهيئة Firebase
const app = initializeApp(config.firebase);

// تهيئة الخدمات
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// إعداد وضع التطوير (اختياري)
if (config.app.environment === 'development' && typeof window !== 'undefined') {
  // يمكن تفعيل المحاكاة المحلية هنا إذا لزم الأمر
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}

// دوال مساعدة لإدارة البيانات
export const firebaseService = {
  // حفظ البيانات في Firestore
  async saveData(collection: string, docId: string, data: any) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const docRef = doc(db, collection, docId);
      await setDoc(docRef, {
        ...data,
        lastUpdated: new Date().toISOString()
      });
      return { success: true, id: docId };
    } catch (error) {
      console.error('خطأ في حفظ البيانات:', error);
      return { success: false, error: error instanceof Error ? error.message : 'خطأ غير معروف' };
    }
  },

  // جلب البيانات من Firestore
  async getData(collection: string, docId: string) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(db, collection, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      } else {
        return { success: false, error: 'المستند غير موجود' };
      }
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      return { success: false, error: error instanceof Error ? error.message : 'خطأ غير معروف' };
    }
  },

  // جلب جميع المستندات من مجموعة
  async getAllDocuments(collection: string) {
    try {
      const { collection: col, getDocs } = await import('firebase/firestore');
      const querySnapshot = await getDocs(col(db, collection));
      const documents: any[] = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, data: documents };
    } catch (error) {
      console.error('خطأ في جلب المستندات:', error);
      return { success: false, error: error instanceof Error ? error.message : 'خطأ غير معروف' };
    }
  },

  // حذف مستند
  async deleteDocument(collection: string, docId: string) {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const docRef = doc(db, collection, docId);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      console.error('خطأ في حذف المستند:', error);
      return { success: false, error: error instanceof Error ? error.message : 'خطأ غير معروف' };
    }
  },

  // مزامنة البيانات المحلية مع Firebase
  async syncLocalDataToFirebase(userId: string, data: any) {
    try {
      return await this.saveData('users', userId, {
        financialData: data,
        syncTimestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('خطأ في مزامنة البيانات:', error);
      return { success: false, error: error instanceof Error ? error.message : 'خطأ غير معروف' };
    }
  },

  // جلب البيانات من Firebase
  async getDataFromFirebase(userId: string) {
    try {
      const result = await this.getData('users', userId);
      if (result.success && result.data?.financialData) {
        return { success: true, data: result.data.financialData };
      }
      return { success: false, error: 'لا توجد بيانات محفوظة' };
    } catch (error) {
      console.error('خطأ في جلب البيانات من Firebase:', error);
      return { success: false, error: error instanceof Error ? error.message : 'خطأ غير معروف' };
    }
  }
};

// تهيئة خدمة Firebase
export const initializeFirebase = () => {
  try {
    console.log('🔥 تهيئة Firebase...');
    console.log('📊 Firestore:', db);
    console.log('🔐 Authentication:', auth);
    console.log('✅ Firebase جاهز للاستخدام');
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في تهيئة Firebase:', error);
    return { success: false, error: error instanceof Error ? error.message : 'خطأ غير معروف' };
  }
};

// تصدير التطبيق للاستخدام الخارجي إذا لزم الأمر
export default app;
