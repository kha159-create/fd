import React from 'react';
import { AppState, Transaction, BankAccountConfig, CardConfig } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { t } from '../../translations';

interface InstallmentsTabProps {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    filteredTransactions: Transaction[];
    setModal: (config: any) => void;
    darkMode?: boolean;
    language?: 'ar' | 'en';
}

const getPaymentMethodName = (key: string, state: AppState): string => {
    const standardMethods: { [key: string]: string } = {
        'cash': '💵 نقدي', 'tabby-bnpl': '📱 تابي', 'tamara-bnpl': '📱 تمارا', 'reconciliation': '🔄 تسوية'
    };
    if (standardMethods[key]) return standardMethods[key];
    if (state.cards[key]) return `💳 ${state.cards[key].name}`;
    if (state.bankAccounts[key]) return `🏦 ${state.bankAccounts[key].name}`;
    return key;
};

const InstallmentsTab: React.FC<InstallmentsTabProps> = ({ state, setState, filteredTransactions, setModal }) => {
    const [showCompletedModal, setShowCompletedModal] = React.useState(false);

    // حساب ملخص الأقساط
    const getInstallmentSummary = () => {
        const activeInstallments = state.installments.filter(i => i.paid < i.total);
        
        const tabbyInstallments = activeInstallments.filter(i => i.provider === 'tabby-bnpl');
        const tamaraInstallments = activeInstallments.filter(i => i.provider === 'tamara-bnpl');
        
        // حساب جميع الدفعات القادمة لكل قسط
        const tabbyTotal = tabbyInstallments.reduce((sum, i) => {
            const remainingPayments = i.total - i.paid;
            return sum + (i.installmentAmount * remainingPayments);
        }, 0);
        
        const tamaraTotal = tamaraInstallments.reduce((sum, i) => {
            const remainingPayments = i.total - i.paid;
            return sum + (i.installmentAmount * remainingPayments);
        }, 0);
        
        const grandTotal = tabbyTotal + tamaraTotal;
        
        return {
            tabbyTotal,
            tamaraTotal,
            grandTotal,
            activeCount: activeInstallments.length,
            completedCount: state.installments.filter(i => i.paid >= i.total).length
        };
    };

    // حساب موعد القسط التالي
    const getNextPaymentDate = () => {
        const activeInstallments = state.installments.filter(i => i.paid < i.total);
        if (activeInstallments.length === 0) return null;

        // البحث عن آخر عملية دفع قسط
        const installmentTransactions = state.transactions.filter(t => t.isInstallmentPayment);
        if (installmentTransactions.length === 0) {
            // إذا لم تكن هناك دفعات سابقة، احسب من تاريخ إنشاء الأقساط
            const earliestInstallment = activeInstallments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
            const startDate = new Date(earliestInstallment.createdAt);
            const nextDate = new Date(startDate);
            nextDate.setDate(nextDate.getDate() + 30);
            return nextDate.toISOString().split('T')[0];
        }

        // البحث عن آخر عملية دفع لكل قسط نشط
        let nextPaymentDate = null;
        
        for (const installment of activeInstallments) {
            const installmentPayments = installmentTransactions
                .filter(t => t.installmentId === installment.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            if (installmentPayments.length > 0) {
                const lastPayment = installmentPayments[0];
                const lastPaymentDate = new Date(lastPayment.date);
                const nextDate = new Date(lastPaymentDate);
                nextDate.setDate(nextDate.getDate() + 30);
                
                if (!nextPaymentDate || nextDate < new Date(nextPaymentDate)) {
                    nextPaymentDate = nextDate.toISOString().split('T')[0];
                }
            } else {
                // إذا لم تكن هناك دفعات لهذا القسط، احسب من تاريخ إنشائه
                const startDate = new Date(installment.createdAt);
                const nextDate = new Date(startDate);
                nextDate.setDate(nextDate.getDate() + 30);
                
                if (!nextPaymentDate || nextDate < new Date(nextPaymentDate)) {
                    nextPaymentDate = nextDate.toISOString().split('T')[0];
                }
            }
        }
        
        return nextPaymentDate;
    };

    // حساب مبلغ القسط التالي
    const getNextPaymentAmount = () => {
        const activeInstallments = state.installments.filter(i => i.paid < i.total);
        return activeInstallments.reduce((sum, i) => sum + i.installmentAmount, 0);
    };

    // حساب جميع مواعيد الأقساط التالية
    const getAllNextPaymentDates = () => {
        const activeInstallments = state.installments.filter(i => i.paid < i.total);
        const installmentTransactions = state.transactions.filter(t => t.isInstallmentPayment);
        
        return activeInstallments.map(installment => {
            const installmentPayments = installmentTransactions
                .filter(t => t.installmentId === installment.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            let nextPaymentDate;
            if (installmentPayments.length > 0) {
                const lastPayment = installmentPayments[0];
                const lastPaymentDate = new Date(lastPayment.date);
                const nextDate = new Date(lastPaymentDate);
                nextDate.setDate(nextDate.getDate() + 30);
                nextPaymentDate = nextDate.toISOString().split('T')[0];
            } else {
                const startDate = new Date(installment.createdAt);
                const nextDate = new Date(startDate);
                nextDate.setDate(nextDate.getDate() + 30);
                nextPaymentDate = nextDate.toISOString().split('T')[0];
            }
            
            return {
                installment,
                nextPaymentDate
            };
        }).sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
    };

    const handleEditInstallmentTransaction = (transactionId: string) => {
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (!transaction || !transaction.isInstallmentPayment) return;

        const installment = state.installments.find(i => i.id === transaction.installmentId);
        if (!installment) return;

        // إنشاء نموذج تعديل الحركة
        const body = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-2">المبلغ</label>
                    <input type="number" id="edit-amount" value="${transaction.amount}" step="0.01" class="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-2">التاريخ</label>
                    <input type="date" id="edit-date" value="${transaction.date}" class="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-2">الوصف</label>
                    <input type="text" id="edit-description" value="${transaction.description}" class="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-2">مصدر الدفع</label>
                    <select id="edit-payment-method" class="w-full p-3 border border-slate-300 rounded-lg">
                        ${Object.values(state.bankAccounts).map(acc => `<option value="${acc.id}" ${transaction.paymentMethod === acc.id ? 'selected' : ''}>🏦 ${acc.name}</option>`).join('')}
                        <option value="cash" ${transaction.paymentMethod === 'cash' ? 'selected' : ''}>💵 نقدي</option>
                        ${Object.values(state.cards).map(card => `<option value="${card.id}" ${transaction.paymentMethod === card.id ? 'selected' : ''}>💳 ${card.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;

        setModal({
            show: true,
            title: 'تعديل حركة القسط',
            body,
            confirmText: 'حفظ التعديلات',
            onConfirm: () => {
                const newAmount = parseFloat((document.getElementById('edit-amount') as HTMLInputElement).value);
                const newDate = (document.getElementById('edit-date') as HTMLInputElement).value;
                const newDescription = (document.getElementById('edit-description') as HTMLInputElement).value;
                const newPaymentMethod = (document.getElementById('edit-payment-method') as HTMLSelectElement).value;

                // تحديث الحركة
                setState(prev => ({
                    ...prev,
                    transactions: prev.transactions.map(t => 
                        t.id === transactionId 
                            ? { ...t, amount: newAmount, date: newDate, description: newDescription, paymentMethod: newPaymentMethod }
                            : t
                    )
                }));

                setModal({ show: false });
            }
        });
    };

    const handleDeleteInstallmentTransaction = (transactionId: string) => {
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (!transaction || !transaction.isInstallmentPayment) return;

        const body = `<p>هل أنت متأكد من حذف هذه الحركة؟ سيتم تقليل عدد الأقساط المدفوعة للقسط المرتبط.</p>`;

        setModal({
            show: true,
            title: 'حذف حركة القسط',
            body,
            confirmText: 'حذف',
            onConfirm: () => {
                const installmentId = transaction.installmentId;
                
                // حذف الحركة وتقليل عدد الأقساط المدفوعة
                setState(prev => ({
                    ...prev,
                    transactions: prev.transactions.filter(t => t.id !== transactionId),
                    installments: prev.installments.map(i => 
                        i.id === installmentId 
                            ? { ...i, paid: Math.max(0, i.paid - 1) }
                            : i
                    )
                }));

                setModal({ show: false });
            }
        });
    };

    const handleEditInstallment = (installmentId: string) => {
        const installment = state.installments.find(i => i.id === installmentId);
        if (!installment) return;

        const body = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-2">وصف القسط</label>
                    <input type="text" id="edit-description" value="${installment.description}" class="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-2">قيمة القسط</label>
                    <input type="number" id="edit-amount" value="${installment.installmentAmount}" step="0.01" class="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-2">عدد الأقساط الإجمالي</label>
                    <input type="number" id="edit-total" value="${installment.total}" min="1" class="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-2">عدد الأقساط المدفوعة</label>
                    <input type="number" id="edit-paid" value="${installment.paid}" min="0" max="${installment.total}" class="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
            </div>
        `;

        setModal({
            show: true,
            title: 'تعديل خطة القسط',
            body,
            confirmText: 'حفظ التعديلات',
            onConfirm: () => {
                const newDescription = (document.getElementById('edit-description') as HTMLInputElement).value;
                const newAmount = parseFloat((document.getElementById('edit-amount') as HTMLInputElement).value);
                const newTotal = parseInt((document.getElementById('edit-total') as HTMLInputElement).value);
                const newPaid = parseInt((document.getElementById('edit-paid') as HTMLInputElement).value);

                setState(prev => ({
                    ...prev,
                    installments: prev.installments.map(i => 
                        i.id === installmentId 
                            ? { ...i, description: newDescription, installmentAmount: newAmount, total: newTotal, paid: newPaid }
                            : i
                    )
                }));

                setModal({ show: false });
            }
        });
    };

    const handleDeleteInstallment = (installmentId: string) => {
        const installment = state.installments.find(i => i.id === installmentId);
        if (!installment) return;

        const body = `<p>هل أنت متأكد من حذف خطة القسط "${installment.description}"؟ سيتم حذف جميع الحركات المرتبطة بها.</p>`;

        setModal({
            show: true,
            title: 'حذف خطة القسط',
            body,
            confirmText: 'حذف',
            onConfirm: () => {
                setState(prev => ({
                    ...prev,
                    installments: prev.installments.filter(i => i.id !== installmentId),
                    transactions: prev.transactions.filter(t => t.installmentId !== installmentId)
                }));

                setModal({ show: false });
            }
        });
    };

    const handlePayInstallment = (installmentId: string) => {
        const installment = state.installments.find(i => i.id === installmentId);
        if (!installment || installment.paid >= installment.total) return;

        let paymentOptionsHTML = '';
        // FIX: Explicitly type 'acc' as BankAccountConfig to prevent property access errors on 'unknown'.
        Object.values(state.bankAccounts).forEach((acc: BankAccountConfig) => {
            paymentOptionsHTML += `<option value="${acc.id}">🏦 ${acc.name}</option>`;
        });
        paymentOptionsHTML += '<option value="cash">💵 نقدي</option>';
        // FIX: Explicitly type 'card' as CardConfig to prevent property access errors on 'unknown'.
        Object.values(state.cards).forEach((card: CardConfig) => {
            paymentOptionsHTML += `<option value="${card.id}">💳 ${card.name}</option>`;
        });

        const body = `<p class="mb-4">اختر مصدر الدفع لسداد قسط "${installment.description}" بقيمة ${formatCurrency(installment.installmentAmount)} ريال.</p><div><label for="installment-payment-source" class="block text-sm font-medium text-slate-600 mb-2">مصدر الدفع</label><select id="installment-payment-source" class="w-full p-3">${paymentOptionsHTML}</select></div>`;

        setModal({
            show: true, title: 'سداد قسط', body, confirmText: 'تأكيد الدفع',
            onConfirm: () => {
                const paymentSource = (document.getElementById('installment-payment-source') as HTMLSelectElement).value;
                const billCategory = state.categories.find(c => c.name === 'سداد فواتير' || c.name === '💳 سداد فواتير');
                const categoryId = billCategory?.id || state.categories.find(c => c.name === 'أخرى')?.id || '';

                const transaction: Transaction = {
                    id: 'trans-' + Date.now(),
                    amount: installment.installmentAmount,
                    date: new Date().toISOString().split('T')[0],
                    description: `سداد القسط ${installment.paid + 1} لـ: ${installment.description}`,
                    paymentMethod: paymentSource,
                    type: 'bnpl-payment',
                    categoryId: categoryId,
                    isInstallmentPayment: true,
                    installmentId: installmentId,
                };

                setState(prev => {
                    const updatedInstallments = prev.installments.map(i => {
                        if (i.id === installmentId) {
                            const updatedInstallment = { ...i, paid: i.paid + 1 };
                            console.log('🔄 تحديث قسط:', { id: i.id, paid: i.paid, newPaid: updatedInstallment.paid, total: i.total });
                            return updatedInstallment;
                        }
                        return i;
                    });
                    return {
                        ...prev,
                        transactions: [...prev.transactions, transaction],
                        installments: updatedInstallments
                    };
                });
            }
        });
    };

    const activeInstallments = state.installments.filter(i => i.paid < i.total);
    const installmentTransactions = state.transactions.filter(t => t.isInstallmentPayment);

    const summary = getInstallmentSummary();
    const nextPaymentDate = getNextPaymentDate();
    const nextPaymentAmount = getNextPaymentAmount();

    return (
        <div className="animate-fade-in">
            {/* بطاقة ملخص الأقساط */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-2xl">📊</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">ملخص الأقساط</h3>
                            <p className="text-sm text-slate-600">إجمالي الأقساط النشطة والمستحقة</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* إجمالي الأقساط */}
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🎯</span>
                            <span className="font-semibold text-blue-800">إجمالي الأقساط</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.grandTotal)}</p>
                    </div>

                    {/* تابي */}
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">📱</span>
                            <span className="font-semibold text-blue-800">تابي</span>
                        </div>
                        <p className="text-xl font-bold text-blue-900">{formatCurrency(summary.tabbyTotal)}</p>
                    </div>

                    {/* تمارا */}
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">📱</span>
                            <span className="font-semibold text-blue-800">تمارا</span>
                        </div>
                        <p className="text-xl font-bold text-blue-900">{formatCurrency(summary.tamaraTotal)}</p>
                    </div>
                </div>

                {/* مواعيد الأقساط التالية */}
                {getAllNextPaymentDates().length > 0 && (
                    <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">⏰</span>
                            <div>
                                <p className="font-semibold text-blue-800">مواعيد الأقساط التالية</p>
                                <p className="text-sm text-slate-600">أقرب المواعيد</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {getAllNextPaymentDates().slice(0, 3).map((item, index) => (
                                <div key={item.installment.id} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">{item.installment.description}</p>
                                        <p className="text-xs text-slate-500">{getPaymentMethodName(item.installment.provider, state)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-blue-900">{new Date(item.nextPaymentDate).toLocaleDateString('en-GB')}</p>
                                        <p className="text-xs text-slate-600">{formatCurrency(item.installment.installmentAmount)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* الإحصائيات */}
                <div className="flex justify-between items-center">
                    <div className="flex gap-6">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-900">{summary.activeCount}</p>
                            <p className="text-sm text-slate-600">أقساط نشطة</p>
                        </div>
                        <div className="text-center">
                            <button 
                                onClick={() => setShowCompletedModal(true)}
                                className="text-center hover:bg-green-50 p-2 rounded-lg transition-colors"
                            >
                                <p className="text-2xl font-bold text-green-600">{summary.completedCount}</p>
                                <p className="text-sm text-slate-600">أقساط مكتملة</p>
                            </button>
                        </div>
                    </div>
                    {getAllNextPaymentDates().length > 0 && (
                        <button 
                            onClick={() => {
                                // دفع جميع الأقساط النشطة
                                const activeInstallments = state.installments.filter(i => i.paid < i.total);
                                activeInstallments.forEach(installment => {
                                    handlePayInstallment(installment.id);
                                });
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                            💳 دفع جميع الأقساط
                        </button>
                    )}
                </div>
            </div>

            <h3 className="text-2xl font-bold mb-4 text-slate-900">📱 خطط الأقساط النشطة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {activeInstallments.length > 0 ? activeInstallments.map(i => {
                    const progress = (i.paid / i.total) * 100;
                    console.log('📊 عرض قسط:', { id: i.id, paid: i.paid, total: i.total, progress });
                    return (
                        <div key={i.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-600 text-lg">📱</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{i.description}</h4>
                                        <p className="text-sm text-slate-500">{getPaymentMethodName(i.provider, state)}</p>
                                    </div>
                                </div>
                                <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                                    <span className="font-bold text-blue-800 number-display text-sm">{formatCurrency(i.installmentAmount)}/شهر</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-gray-200 mb-3">
                                <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2 overflow-hidden">
                                     <div className="bg-blue-700 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span className="font-medium">{i.paid} / {i.total} مدفوع</span>
                                    <span className="font-medium">متبقي: {i.total - i.paid}</span>
                                </div>
                                <div className="text-center mt-2">
                                    <span className="text-xs text-slate-500">{progress.toFixed(1)}% مكتمل</span>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => handlePayInstallment(i.id)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 text-sm shadow-md font-semibold">💳 دفع القسط التالي</button>
                                <button onClick={() => handleEditInstallment(i.id)} className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm" title="تعديل القسط">✏️</button>
                                <button onClick={() => handleDeleteInstallment(i.id)} className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm" title="حذف القسط">🗑️</button>
                            </div>
                        </div>
                    );
                }) : <div className="md:col-span-2 text-center p-6 glass-card"><p className="text-slate-500">🎉 لا توجد أقساط نشطة حاليًا!</p></div>}
            </div>
            <div className="glass-card p-6 mt-8">
                <h3 className="text-xl font-bold mb-4 text-slate-900">📋 سجل دفعات الأقساط</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-gray-200">
                            <tr>
                                <th className="text-right p-3 font-semibold">التاريخ</th>
                                <th className="text-right p-3 font-semibold">الوصف</th>
                                <th className="text-right p-3 font-semibold">المصدر</th>
                                <th className="text-right p-3 font-semibold">المبلغ</th>
                                <th className="text-right p-3 font-semibold">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {installmentTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                                <tr key={t.id} className="border-b border-gray-200/50">
                                    <td className="p-3">{new Date(t.date).toLocaleDateString('en-GB')}</td>
                                    <td className="p-3 text-slate-600">{t.description}</td>
                                    <td className="p-3">{getPaymentMethodName(t.paymentMethod, state)}</td>
                                    <td className="p-3 text-red-500 font-semibold number-display">{formatCurrency(t.amount)}</td>
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditInstallmentTransaction(t.id)}
                                                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs transition-colors"
                                                title="تعديل"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDeleteInstallmentTransaction(t.id)}
                                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs transition-colors"
                                                title="حذف"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* نافذة الأقساط المكتملة */}
            {showCompletedModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800">✅ الأقساط المكتملة</h3>
                                <button onClick={() => setShowCompletedModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>

                            <div className="space-y-4">
                                {Object.values(state.installments)
                                    .filter(i => i.paid >= i.total)
                                    .map(installment => (
                                        <div key={installment.id} className="bg-green-50 p-4 rounded-lg border border-green-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-green-800">{installment.description}</h4>
                                                    <p className="text-sm text-green-600">{getPaymentMethodName(installment.provider, state)}</p>
                                                </div>
                                                <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                                    مكتمل
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div className="bg-white p-3 rounded-lg">
                                                    <p className="text-green-700 font-bold text-lg">{installment.total}</p>
                                                    <p className="text-green-600 text-sm">إجمالي الأقساط</p>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg">
                                                    <p className="text-green-700 font-bold text-lg">{formatCurrency(installment.installmentAmount)}</p>
                                                    <p className="text-green-600 text-sm">قيمة القسط</p>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg">
                                                    <p className="text-green-700 font-bold text-lg">{formatCurrency(installment.total * installment.installmentAmount)}</p>
                                                    <p className="text-green-600 text-sm">المجموع الكلي</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                
                                {Object.values(state.installments).filter(i => i.paid >= i.total).length === 0 && (
                                    <div className="text-center py-12 text-slate-500">
                                        <div className="text-6xl mb-4">🎉</div>
                                        <p className="text-lg">لا توجد أقساط مكتملة حالياً</p>
                                        <p className="text-sm">ستظهر الأقساط المكتملة هنا عند إنهائها</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end mt-6">
                                <button 
                                    onClick={() => setShowCompletedModal(false)}
                                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                    إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstallmentsTab;