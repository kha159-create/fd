import React, { useState, useEffect } from 'react';
import { config, validateConfig } from '../../config';
import { firebaseService } from '../../services/firebaseService';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '../common/Icons';
import { AppState, Category } from '../../types';

interface SettingsTabProps {
    state: AppState;
    setState: (state: AppState) => void;
    setModal: (config: any) => void;
    setLoading: (loading: boolean, text?: string) => void;
    onRestore?: (restoredState: any) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ state, setState, setModal, setLoading, onRestore }) => {
    const [validation, setValidation] = useState(validateConfig());
    const [firebaseStatus, setFirebaseStatus] = useState<{connected: boolean, error?: string}>({connected: false});
    const [isLoading, setIsLoading] = useState(true);
    const [configStatus, setConfigStatus] = useState<{firebase: boolean, gemini: boolean}>({
        firebase: validation.hasFirebase,
        gemini: validation.hasGemini
    });

    useEffect(() => {
        // تحديث حالة التكوين
        const newValidation = validateConfig();
        setValidation(newValidation);
        setConfigStatus({
            firebase: newValidation.hasFirebase,
            gemini: newValidation.hasGemini
        });

        // اختبار الاتصال بـ Firebase فقط إذا كان متوفراً
        if (newValidation.hasFirebase) {
            const testFirebaseConnection = async () => {
                try {
                    setIsLoading(true);
                    // محاولة جلب بيانات اختبارية
                    const result = await firebaseService.getData('test', 'connection');
                    setFirebaseStatus({ connected: true });
                } catch (error) {
                    setFirebaseStatus({ 
                        connected: false, 
                        error: error instanceof Error ? error.message : 'خطأ في الاتصال' 
                    });
                } finally {
                    setIsLoading(false);
                }
            };
            testFirebaseConnection();
        } else {
            setFirebaseStatus({ connected: false, error: 'مفاتيح Firebase غير متوفرة' });
            setIsLoading(false);
        }
    }, []);

    const StatusIcon = ({ isValid }: { isValid: boolean }) => {
        if (isValid) {
            return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
        }
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
    };

    const WarningIcon = () => (
        <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
    );

    // إدارة الفئات
    const [newCategory, setNewCategory] = useState({ name: '', icon: '' });
    const [editingCategory, setEditingCategory] = useState<string | null>(null);

    const handleAddCategory = () => {
        if (!newCategory.name.trim() || !newCategory.icon.trim()) {
            setModal({ title: 'خطأ', body: '<p>يرجى إدخال اسم وأيقونة للفئة.</p>', hideCancel: true, confirmText: 'موافق' });
            return;
        }

        const newId = `cat-${Date.now()}`;
        const category: Category = {
            id: newId,
            name: newCategory.name.trim(),
            icon: newCategory.icon.trim()
        };

        setState(prev => ({
            ...prev,
            categories: [...prev.categories, category]
        }));

        setNewCategory({ name: '', icon: '' });
        setModal({ title: 'نجح', body: '<p>تم إضافة الفئة بنجاح.</p>', hideCancel: true, confirmText: 'موافق' });
    };

    const handleSuggestIcon = async () => {
        const categoryName = newCategory.name.trim();
        if (!categoryName) {
            setModal({ title: 'خطأ', body: '<p>الرجاء إدخال اسم الفئة أولاً.</p>', hideCancel: true, confirmText: 'موافق' });
            return;
        }

        setLoading(true, "جاري البحث عن أيقونة...");
        
        try {
            // استيراد الدوال بشكل مباشر
            const { suggestCategoryIcon, initializeAi } = await import('../../services/geminiService');
            
            // تهيئة Gemini قبل الاستدعاء
            initializeAi();
            
            const iconSuggestion = await suggestCategoryIcon(categoryName);
            
            if (iconSuggestion && iconSuggestion.trim()) {
                setNewCategory(prev => ({ ...prev, icon: iconSuggestion.trim() }));
                setModal({ 
                    title: 'تم اقتراح أيقونة', 
                    body: `<p>تم اقتراح الأيقونة "${iconSuggestion.trim()}" للفئة "${categoryName}".</p>`, 
                    hideCancel: true, 
                    confirmText: 'موافق' 
                });
            } else {
                setModal({ title: 'خطأ', body: '<p>لم أتمكن من العثور على أيقونة مناسبة.</p>', hideCancel: true, confirmText: 'موافق' });
            }
        } catch (error) {
            console.error("Icon suggestion error:", error);
            setModal({ 
                title: 'خطأ', 
                body: `<p>حدث خطأ أثناء اقتراح الأيقونة. تأكد من إعداد مفتاح Gemini API بشكل صحيح.</p><p>تفاصيل الخطأ: ${error.message}</p>`, 
                hideCancel: true, 
                confirmText: 'موافق' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = (id: string) => {
        if (state.transactions.some(t => t.categoryId === id)) {
            setModal({ title: 'لا يمكن الحذف', body: '<p>لا يمكن حذف هذه الفئة لأنها مستخدمة في بعض الحركات. يرجى تغيير فئة الحركات أولاً.</p>', hideCancel: true, confirmText: 'موافق' });
        } else {
            setState(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
            setModal({ title: 'نجح', body: '<p>تم حذف الفئة بنجاح.</p>', hideCancel: true, confirmText: 'موافق' });
        }
    };

    // النسخ الاحتياطي
    const handleBackup = () => {
        try {
            const backupData = JSON.stringify(state, null, 2);
            const blob = new Blob([backupData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `masrof_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setModal({ title: 'نجح', body: '<p>تم إنشاء النسخة الاحتياطية المحلية بنجاح.</p>', hideCancel: true, confirmText: 'موافق' });
        } catch (error) {
            setModal({ title: 'خطأ', body: '<p>فشل إنشاء النسخة الاحتياطية.</p>', hideCancel: true, confirmText: 'موافق' });
        }
    };

    const handleFirebaseBackup = async () => {
        setLoading(true, "جاري حفظ النسخة الاحتياطية في السحابة...");
        try {
            const result = await firebaseService.saveData('backups', `backup_${new Date().toISOString().split('T')[0]}`, {
                ...state,
                backupDate: new Date().toISOString(),
                version: '1.0.0'
            });
            
            if (result.success) {
                setModal({ 
                    title: 'نجح', 
                    body: '<p>تم حفظ النسخة الاحتياطية في السحابة بنجاح.</p>', 
                    hideCancel: true, 
                    confirmText: 'موافق' 
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            setModal({ 
                title: 'خطأ', 
                body: '<p>فشل في حفظ النسخة الاحتياطية في السحابة.</p>', 
                hideCancel: true, 
                confirmText: 'موافق' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const restoredState = JSON.parse(e.target?.result as string);
                if (restoredState?.transactions && restoredState?.categories) {
                    if (onRestore) {
                        onRestore(restoredState);
                    } else {
                        setModal({
                            show: true,
                            title: "استعادة نسخة احتياطية",
                            body: "<p>هل أنت متأكد؟ سيتم الكتابة فوق جميع بياناتك الحالية.</p>",
                            confirmText: 'نعم، استعادة',
                            onConfirm: () => {
                                const validatedState: AppState = {
                                    transactions: restoredState.transactions || [],
                                    categories: restoredState.categories || [],
                                    installments: restoredState.installments || [],
                                    investments: restoredState.investments || { currentValue: 0 },
                                    cards: restoredState.cards || {},
                                    bankAccounts: restoredState.bankAccounts || {}
                                };
                                setState(validatedState);
                                setModal({ title: "تم الاستعادة بنجاح", body: "<p>تم استعادة بياناتك بنجاح.</p>", confirmText: 'موافق', hideCancel: true });
                            }
                        });
                    }
                } else {
                    throw new Error("Invalid backup file format.");
                }
            } catch (error) {
                setModal({ show: true, title: "خطأ", body: "<p>فشل في استعادة النسخة الاحتياطية. الملف غير صالح.</p>", confirmText: 'موافق', hideCancel: true });
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">⚙️ إعدادات النظام</h2>
            </div>

            {/* حالة المفاتيح */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4 text-slate-900">🔑 حالة مفاتيح API</h3>
                
                <div className="space-y-4">
                    {/* Firebase Settings */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">🔥</div>
                            <div>
                                <h4 className="font-semibold text-slate-800">Firebase Configuration</h4>
                                <p className="text-sm text-slate-600">
                                    Project ID: {config.firebase.projectId}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {configStatus.firebase ? (
                                firebaseStatus.connected ? (
                                    <>
                                        <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                        <span className="text-sm text-green-600">متصل</span>
                                    </>
                                ) : (
                                    <>
                                        <WarningIcon />
                                        <span className="text-sm text-yellow-600">مفاتيح موجودة لكن غير متصل</span>
                                    </>
                                )
                            ) : (
                                <>
                                    <XCircleIcon className="w-6 h-6 text-red-500" />
                                    <span className="text-sm text-red-600">مفاتيح غير متوفرة</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Gemini API */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">🤖</div>
                            <div>
                                <h4 className="font-semibold text-slate-800">Gemini AI API</h4>
                                <p className="text-sm text-slate-600">
                                    Model: {config.gemini.model}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {configStatus.gemini ? (
                                <>
                                    <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                    <span className="text-sm text-green-600">مُعد</span>
                                </>
                            ) : (
                                <>
                                    <XCircleIcon className="w-6 h-6 text-red-500" />
                                    <span className="text-sm text-red-600">غير مُعد</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* رسائل التحذير */}
                {!validation.isValid && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h5 className="font-semibold text-red-800 mb-2">⚠️ تحذيرات:</h5>
                        <ul className="space-y-1">
                            {validation.errors.map((error, index) => (
                                <li key={index} className="text-sm text-red-600">• {error}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* معلومات المشروع */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4 text-slate-900">📱 معلومات المشروع</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600">اسم التطبيق</p>
                        <p className="font-semibold text-slate-800">{config.app.name}</p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600">الإصدار</p>
                        <p className="font-semibold text-slate-800">{config.app.version}</p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600">البيئة</p>
                        <p className="font-semibold text-slate-800">{config.app.environment}</p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600">حالة النظام</p>
                        <div className="flex items-center gap-2">
                            <StatusIcon isValid={validation.isValid && firebaseStatus.connected} />
                            <span className={`text-sm font-semibold ${
                                validation.isValid && firebaseStatus.connected 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                            }`}>
                                {validation.isValid && firebaseStatus.connected ? 'جاهز' : 'يحتاج إعداد'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600">تطوير</p>
                        <p className="font-semibold text-slate-800">Khaleel Alsani</p>
                    </div>
                </div>
            </div>

            {/* تعليمات الإعداد */}
            {(!validation.isValid || !firebaseStatus.connected) && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-4 text-slate-900">📝 تعليمات الإعداد</h3>
                    
                    <div className="space-y-4">
                        {!configStatus.gemini && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h4 className="font-semibold text-yellow-800 mb-2">🤖 إعداد Gemini API:</h4>
                                <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                                    <li>اذهب إلى <a href="https://makersuite.google.com/app/apikey" target="_blank" className="underline">Google AI Studio</a></li>
                                    <li>أنشئ مفتاح API جديد</li>
                                    <li>أضف المفتاح كـ GitHub Secret باسم <code className="bg-yellow-100 px-1 rounded">VITE_GEMINI_API_KEY</code></li>
                                    <li>أو ضعه في ملف <code className="bg-yellow-100 px-1 rounded">.env.local</code> للتطوير المحلي</li>
                                </ol>
                            </div>
                        )}

                        {!configStatus.firebase && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2">🔥 إعداد Firebase:</h4>
                                <p className="text-sm text-blue-700">
                                    تأكد من إضافة جميع مفاتيح Firebase كـ GitHub Secrets:
                                    <br />• VITE_FIREBASE_API_KEY
                                    <br />• VITE_FIREBASE_AUTH_DOMAIN
                                    <br />• VITE_FIREBASE_PROJECT_ID
                                    <br />• VITE_FIREBASE_STORAGE_BUCKET
                                    <br />• VITE_FIREBASE_MESSAGING_SENDER_ID
                                    <br />• VITE_FIREBASE_APP_ID
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* إدارة الفئات */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4 text-slate-900">📂 إدارة الفئات</h3>
                
                {/* إضافة فئة جديدة */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-slate-800 mb-3">➕ إضافة فئة جديدة</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="اسم الفئة"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="الأيقونة (مثل: 🍔)"
                                value={newCategory.icon}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleSuggestIcon}
                                disabled={!newCategory.name.trim()}
                                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="اقتراح أيقونة بالذكاء الاصطناعي"
                            >
                                🤖
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleAddCategory}
                        className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        ➕ إضافة الفئة
                    </button>
                </div>

                {/* قائمة الفئات */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {state.categories.map((category) => (
                        <div key={category.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{category.icon}</span>
                                <span className="text-sm font-medium text-slate-800">{category.name}</span>
                            </div>
                            <button
                                onClick={() => handleDeleteCategory(category.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                                title="حذف الفئة"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* النسخ الاحتياطي */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4 text-slate-900">💾 النسخ الاحتياطي والاستعادة</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <h4 className="font-semibold text-slate-800 mb-2">📤 نسخة احتياطية محلية</h4>
                        <p className="text-slate-600 mb-3 text-sm">احفظ جميع بياناتك في ملف آمن.</p>
                        <button
                            onClick={handleBackup}
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            💾 تحميل ملف
                        </button>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 mb-2">☁️ نسخة احتياطية سحابية</h4>
                        <p className="text-slate-600 mb-3 text-sm">احفظ بياناتك في السحابة للوصول من أي مكان.</p>
                        <button
                            onClick={handleFirebaseBackup}
                            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                            ☁️ حفظ في السحابة
                        </button>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 mb-2">📥 استعادة البيانات</h4>
                        <p className="text-slate-600 mb-3 text-sm">استعد بياناتك من ملف نسخة احتياطية.</p>
                        <input
                            type="file"
                            id="backup-file"
                            accept=".json"
                            className="hidden"
                            onChange={handleRestore}
                        />
                        <button
                            onClick={() => document.getElementById('backup-file')?.click()}
                            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                        >
                            📥 استعادة البيانات
                        </button>
                    </div>
                </div>
            </div>

            {/* زر إعادة التحقق */}
            <div className="text-center">
                <button 
                    onClick={() => {
                        setValidation(validateConfig());
                        window.location.reload();
                    }}
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 'جاري التحقق...' : '🔄 إعادة التحقق'}
                </button>
            </div>
        </div>
    );
};

export default SettingsTab;
