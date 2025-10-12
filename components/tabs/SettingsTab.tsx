import React, { useState, useEffect } from 'react';
import { config, validateConfig } from '../../config';
import { firebaseService } from '../../services/firebaseService';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '../common/Icons';

interface SettingsTabProps {
    // يمكن إضافة props أخرى هنا إذا لزم الأمر
}

const SettingsTab: React.FC<SettingsTabProps> = () => {
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
