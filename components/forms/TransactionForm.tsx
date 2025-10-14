

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, Category, CardConfig, BankAccountConfig, TransactionType, PaymentMethod } from '../../types';
import { analyzePastedText } from '../../services/geminiService';
import { MagicIcon, XMarkIcon } from '../common/Icons';

interface TransactionFormProps {
    onClose: () => void;
    onSave: (transaction: Omit<Transaction, 'id'>, id?: string) => void;
    initialData?: Transaction | null;
    categories: Category[];
    cards: { [key: string]: CardConfig };
    bankAccounts: { [key: string]: BankAccountConfig };
    setModalConfig: (config: any) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, onSave, initialData, categories, cards, bankAccounts, setModalConfig }) => {
    const [transaction, setTransaction] = useState<Omit<Transaction, 'id'>>({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: Object.keys(bankAccounts)[0] || 'cash',
        type: 'expense',
        categoryId: categories.find(c => c.name === 'أخرى')?.id || null,
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [clipboardModal, setClipboardModal] = useState<{ isOpen: boolean; text: string }>({ isOpen: false, text: '' });
    
    // BNPL fields
    const [showBnplFields, setShowBnplFields] = useState(false);
    const [installmentsCount, setInstallmentsCount] = useState(4);
    const [initialPaymentSource, setInitialPaymentSource] = useState(Object.keys(bankAccounts)[0] || 'cash');

    useEffect(() => {
        if (initialData) {
            setTransaction(initialData);
        } else {
             // Auto-detect clipboard content for new transactions
            if (navigator.clipboard?.readText) {
                (async () => {
                    try {
                        console.log('🔍 محاولة قراءة الحافظة...');
                        const text = await navigator.clipboard.readText();
                        console.log('📋 نص الحافظة:', text);
                        
                        // Basic validation to check for meaningful text
                        if (text && text.trim().length > 10 && sessionStorage.getItem('ignoredClipboardText') !== text) {
                            console.log('✅ تم العثور على نص مناسب في الحافظة');
                            console.log('🔍 فتح نافذة الحافظة...');
                            setClipboardModal({ isOpen: true, text });
                            console.log('✅ تم فتح نافذة الحافظة');
                        } else {
                            console.log('❌ نص الحافظة غير مناسب أو تم تجاهله');
                            console.log('📊 تفاصيل:', {
                                textLength: text?.trim().length,
                                ignored: sessionStorage.getItem('ignoredClipboardText') === text,
                                text: text?.substring(0, 50) + '...'
                            });
                        }
                    } catch (err) {
                        console.error('❌ خطأ في قراءة الحافظة:', err);
                    }
                })();
            } else {
                console.log('❌ navigator.clipboard غير مدعوم');
            }
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Handle BNPL logic
        if (name === 'paymentMethod') {
            const isBnpl = value.includes('bnpl');
            setShowBnplFields(isBnpl);
            
            // Auto-set transaction type for BNPL
            if (isBnpl) {
                setTransaction(prev => ({ ...prev, type: 'expense' }));
            }
        }
        
        setTransaction(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // For BNPL transactions, we need to create both the installment plan and first payment
        if (showBnplFields && transaction.paymentMethod.includes('bnpl')) {
            // This will be handled by the parent component with additional BNPL data
            onSave({
                ...transaction,
                bnplData: {
                    installmentsCount,
                    initialPaymentSource,
                    installmentAmount: transaction.amount / installmentsCount
                }
            } as any, initialData?.id);
        } else {
            onSave(transaction, initialData?.id);
        }
    };

    const handlePasteFromClipboard = async () => {
        try {
            console.log('🔍 محاولة قراءة الحافظة...');
            const clipboardText = await navigator.clipboard.readText();
            console.log('📋 نص الحافظة:', clipboardText);
            
            if (clipboardText && clipboardText.trim()) {
                console.log('✅ تم العثور على نص مناسب في الحافظة');
                console.log('🔍 فتح نافذة الحافظة...');
                setClipboardModal({ isOpen: true, text: clipboardText });
                console.log('✅ تم فتح نافذة الحافظة');
            } else {
                console.log('❌ لا يوجد نص في الحافظة أو النص فارغ');
                setModalConfig({ 
                    title: 'تحذير', 
                    body: '<p>لا يوجد نص في الحافظة أو النص فارغ.</p>', 
                    hideCancel: true, 
                    confirmText: 'حسنًا' 
                });
            }
        } catch (error) {
            console.error('❌ خطأ في قراءة الحافظة:', error);
            setModalConfig({ 
                title: 'خطأ', 
                body: '<p>فشل في قراءة الحافظة. تأكد من السماح للتطبيق بالوصول إلى الحافظة.</p>', 
                hideCancel: true, 
                confirmText: 'حسنًا' 
            });
        }
    };

    const handlePasteAnalyze = async (textToAnalyze: string) => {
        if (!textToAnalyze.trim()) return;
        console.log('🔍 بدء تحليل النص...', textToAnalyze.substring(0, 100));
        
        // Set loading state
        setStatus('loading');
        setMessage('جاري تحليل البيانات...');
        
        try {
            console.log('📤 إرسال طلب تحليل إلى Gemini...');
            const jsonString = await analyzePastedText(textToAnalyze, categories, cards, bankAccounts);
            console.log('📥 استجابة Gemini:', jsonString);
            
            const result = JSON.parse(jsonString);
            console.log('📊 نتيجة التحليل:', result);
            
            if (result.error) {
                console.log('❌ خطأ في التحليل:', result.error);
                setStatus('error');
                setMessage('❌ حدث خطأ أثناء التحليل. حاول مرة أخرى.');
            } else {
                console.log('✅ تطبيق النتيجة على النموذج...');
                // تحديث النموذج مباشرة مثل الملف القديم
                setTransaction(prev => {
                    const newTransaction = {
                        ...prev,
                        amount: result.amount || prev.amount,
                        date: result.date || prev.date,
                        description: result.merchant || prev.description,
                        paymentMethod: result.paymentMethod || prev.paymentMethod,
                        categoryId: result.categoryId || prev.categoryId,
                    };
                    console.log('🔄 النموذج الجديد:', newTransaction);
                    return newTransaction;
                });
                console.log('✅ تم تحديث النموذج بنجاح');
                
                // Set success state
                setStatus('success');
                setMessage('✅ تم التحليل بنجاح، وتم تعبئة الحقول تلقائيًا');
            }
        } catch (error) {
            console.error('❌ خطأ في تحليل النص:', error);
            setStatus('error');
            setMessage('❌ حدث خطأ أثناء التحليل. حاول مرة أخرى.');
        }
    };
    
    const paymentMethods = useMemo(() => {
        const methods = [{ value: 'cash', label: '💵 نقدي' }];
        // FIX: Explicitly type `acc` as BankAccountConfig to prevent property access errors.
        Object.values(bankAccounts).forEach((acc: BankAccountConfig) => methods.push({ value: acc.id, label: `🏦 ${acc.name}` }));
        // FIX: Explicitly type `card` as CardConfig to prevent property access errors.
        Object.values(cards).forEach((card: CardConfig) => methods.push({ value: card.id, label: `💳 ${card.name}` }));
        methods.push({ value: 'tabby-bnpl', label: '📱 تابي' });
        methods.push({ value: 'tamara-bnpl', label: '📱 تمارا' });
        return methods;
    }, [bankAccounts, cards]);
    
    const transactionTypes = useMemo(() => {
        const types = [
            { value: 'expense', label: '💸 مصاريف' },
            { value: 'income', label: '💰 دخل' },
            { value: 'bnpl-payment', label: '📱 سداد قسط' },
            { value: 'investment-deposit', label: '💹 إيداع استثماري' },
            { value: 'investment-withdrawal', label: '💹 سحب استثماري' },
        ];
        // FIX: Explicitly type `card` as CardConfig to prevent property access errors.
        Object.values(cards).forEach((card: CardConfig) => types.push({ value: `${card.id}-payment`, label: `💳 سداد ${card.name}` }));
        return types;
    }, [cards]);

    return (
        <>
               {clipboardModal.isOpen && (
                   <div 
                       className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                       onClick={() => setClipboardModal({ isOpen: false, text: '' })}
                   >
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">اكتشاف نص في الحافظة</h3>
                        <p className="text-sm text-slate-600 mb-4">وجدنا نصاً في حافظة النصوص. هل تود لصقه وتحليله لتعبئة الحقول تلقائياً؟</p>
                        <pre className="bg-slate-100 p-3 rounded-md text-xs text-slate-500 max-h-24 overflow-y-auto whitespace-pre-wrap font-sans">
                            {clipboardModal.text}
                        </pre>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => {
                                sessionStorage.setItem('ignoredClipboardText', clipboardModal.text);
                                setClipboardModal({ isOpen: false, text: '' });
                            }} className="px-4 py-2 bg-slate-200 rounded-lg">تجاهل</button>
                            <button onClick={() => {
                                setClipboardModal({ isOpen: false, text: '' });
                                handlePasteAnalyze(clipboardModal.text);
                            }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">لصق وتحليل</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
               <div 
                   className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                   onClick={onClose}
               >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">{initialData ? 'تعديل الحركة' : 'إضافة حركة جديدة'}</h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={handlePasteFromClipboard}
                                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                                title="قراءة الحافظة وتحليل النص"
                            >
                                📋 لصق
                            </button>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XMarkIcon /></button>
                        </div>
                    </div>

                    <div className="mt-2 text-center">
                        {status === 'loading' && (
                            <div className="flex justify-center items-center gap-2 text-slate-600 text-sm">
                                <div className="w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                                <span>{message}</span>
                            </div>
                        )}
                        {status === 'success' && (
                            <p className="text-emerald-600 text-sm font-semibold mt-1">{message}</p>
                        )}
                        {status === 'error' && (
                            <p className="text-red-600 text-sm font-semibold mt-1">{message}</p>
                        )}
                    </div>

                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="amount" className="form-label">المبلغ</label>
                                <input type="number" name="amount" value={transaction.amount} onChange={handleChange} className="w-full" required step="0.01" />
                            </div>
                            <div>
                                <label htmlFor="date" className="form-label">التاريخ</label>
                                <input type="date" name="date" value={transaction.date} onChange={handleChange} className="w-full" required />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="description" className="form-label">الوصف <span className="text-red-500">*</span></label>
                            <input type="text" name="description" value={transaction.description} onChange={handleChange} className="w-full" required />
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="type" className="form-label">نوع الحركة</label>
                                <select name="type" value={transaction.type} onChange={handleChange} className="w-full">
                                    {transactionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="paymentMethod" className="form-label">وسيلة الدفع</label>
                                <select name="paymentMethod" value={transaction.paymentMethod} onChange={handleChange} className="w-full">
                                    {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="categoryId" className="form-label">الفئة <span className="text-red-500">*</span></label>
                            <select name="categoryId" value={transaction.categoryId || ''} onChange={handleChange} className="w-full" required>
                                <option value="">-- اختر فئة --</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </select>
                        </div>
                        
                        {/* BNPL Fields */}
                        {showBnplFields && (
                            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                                <h3 className="font-semibold text-blue-800">📱 إعدادات التقسيط</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="installmentsCount" className="form-label">عدد الأقساط</label>
                                        <select 
                                            value={installmentsCount} 
                                            onChange={(e) => setInstallmentsCount(parseInt(e.target.value))}
                                            className="w-full"
                                        >
                                            <option value={2}>قسطين (2)</option>
                                            <option value={3}>3 أقساط</option>
                                            <option value={4}>4 أقساط</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label htmlFor="initialPaymentSource" className="form-label">مصدر الدفعة الأولى</label>
                                        <select 
                                            value={initialPaymentSource} 
                                            onChange={(e) => setInitialPaymentSource(e.target.value)}
                                            className="w-full"
                                        >
                                            {paymentMethods.filter(m => !m.value.includes('bnpl')).map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-100 p-3 rounded-lg">
                                    <p className="text-sm text-blue-700">
                                        <strong>الدفعة الأولى:</strong> {(transaction.amount / installmentsCount).toFixed(2)} ريال
                                        <br />
                                        <strong>المبلغ المتبقي:</strong> {(transaction.amount * (installmentsCount - 1) / installmentsCount).toFixed(2)} ريال
                                    </p>
                                </div>
                            </div>
                        )}
                        <button type="submit" className="w-full py-3 magical-button text-white font-semibold rounded-lg mt-6">{initialData ? 'حفظ التعديلات' : 'إضافة الحركة'}</button>
                    </form>
                </div>
            </div>
        </div>
        </>
    );
};

export default TransactionForm;