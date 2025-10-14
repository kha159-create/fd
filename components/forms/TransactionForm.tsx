import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, Category, CardConfig, BankAccountConfig } from '../../types';
import { analyzePastedText } from '../../services/geminiService';
import { XMarkIcon } from '../common/Icons';

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
    
    const [showBnplFields, setShowBnplFields] = useState(false);
    const [installmentsCount, setInstallmentsCount] = useState(4);
    const [initialPaymentSource, setInitialPaymentSource] = useState(Object.keys(bankAccounts)[0] || 'cash');

    const tryReadingClipboard = useCallback(async () => {
        if (clipboardModal.isOpen) return;

        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim().length > 10 && sessionStorage.getItem('ignoredClipboardText') !== text) {
                setClipboardModal({ isOpen: true, text });
            }
        } catch (err) {
            console.info('لم يتم منح إذن الوصول إلى الحافظة بعد، أو أنها غير مدعومة.');
        }
    }, [clipboardModal.isOpen]);

    useEffect(() => {
        if (initialData) {
            setTransaction(initialData);
        } else {
            tryReadingClipboard();
            window.addEventListener('focus', tryReadingClipboard);
            return () => {
                window.removeEventListener('focus', tryReadingClipboard);
            };
        }
    }, [initialData, tryReadingClipboard]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'paymentMethod') {
            const isBnpl = value.includes('bnpl');
            setShowBnplFields(isBnpl);
            if (isBnpl) setTransaction(prev => ({ ...prev, type: 'expense' }));
        }
        setTransaction(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (showBnplFields && transaction.paymentMethod.includes('bnpl')) {
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
            const clipboardText = await navigator.clipboard.readText();
            if (clipboardText && clipboardText.trim()) {
                setClipboardModal({ isOpen: true, text: clipboardText });
            } else {
                setModalConfig({ title: 'الحافظة فارغة', body: '<p>لا يوجد نص في الحافظة لنسخه.</p>', hideCancel: true });
            }
        } catch (error) {
            setModalConfig({ title: 'خطأ في الوصول للحافظة', body: '<p>فشل في قراءة الحافظة. يرجى التأكد من منح الإذن للموقع.</p>', hideCancel: true });
        }
    };

    const handlePasteAnalyze = async (textToAnalyze: string) => {
        if (!textToAnalyze.trim()) return;
        setStatus('loading');
        setMessage('جاري تحليل البيانات...');
        try {
            const jsonString = await analyzePastedText(textToAnalyze, categories, cards, bankAccounts);
            const result = JSON.parse(jsonString);
            if (result.error) {
                setStatus('error');
                setMessage(result.error);
            } else {
                setTransaction(prev => ({
                    ...prev,
                    amount: result.amount || prev.amount,
                    date: result.date || prev.date,
                    description: result.merchant || prev.description,
                    paymentMethod: result.paymentMethod || prev.paymentMethod,
                    categoryId: result.categoryId || prev.categoryId,
                }));
                setStatus('success');
                setMessage('✅ تم التحليل بنجاح');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'فشل تحليل النص.';
            setStatus('error');
            setMessage(`❌ ${errorMessage}`);
        }
    };

    const paymentMethods = useMemo(() => { /* Omitted for brevity */ return []; }, [bankAccounts, cards]);
    const transactionTypes = useMemo(() => { /* Omitted for brevity */ return []; }, [cards]);

    return (
        <>
            {clipboardModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setClipboardModal({ isOpen: false, text: '' })}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">اكتشاف نص في الحافظة</h3>
                            <p className="text-sm text-slate-600 mb-4">وجدنا نصاً في حافظة النصوص. هل تود لصقه وتحليله؟</p>
                            <pre className="bg-slate-100 p-3 rounded-md text-xs text-slate-500 max-h-24 overflow-y-auto">{clipboardModal.text}</pre>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => { sessionStorage.setItem('ignoredClipboardText', clipboardModal.text); setClipboardModal({ isOpen: false, text: '' }); }} className="px-4 py-2 bg-slate-200 rounded-lg">تجاهل</button>
                                <button onClick={() => { setClipboardModal({ isOpen: false, text: '' }); handlePasteAnalyze(clipboardModal.text); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">لصق وتحليل</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">{initialData ? 'تعديل الحركة' : 'إضافة حركة جديدة'}</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePasteFromClipboard} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm" title="لصق من الحافظة">📋 لصق</button>
                                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XMarkIcon /></button>
                            </div>
                        </div>
                        <div className="min-h-[24px] text-center mb-4">
                            {status === 'loading' && <p className="text-blue-600 text-sm flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>{message}</p>}
                            {status === 'success' && <p className="text-emerald-600 text-sm font-semibold">{message}</p>}
                            {status === 'error' && <p className="text-red-600 text-sm font-semibold">{message}</p>}
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Form fields are unchanged and omitted here for brevity */}
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TransactionForm;