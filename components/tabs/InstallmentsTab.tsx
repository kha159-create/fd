import React from 'react';
import { AppState, Transaction, BankAccountConfig, CardConfig } from '../../types';
import { formatCurrency } from '../../utils/formatting';

interface InstallmentsTabProps {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    filteredTransactions: Transaction[];
    setModal: (config: any) => void;
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

    // حساب ملخص الأقساط
    const getInstallmentSummary = () => {
        const activeInstallments = state.installments.filter(i => i.paid < i.total);
        
        const tabbyInstallments = activeInstallments.filter(i => i.provider === 'tabby-bnpl');
        const tamaraInstallments = activeInstallments.filter(i => i.provider === 'tamara-bnpl');
        
        const tabbyTotal = tabbyInstallments.reduce((sum, i) => sum + i.installmentAmount, 0);
        const tamaraTotal = tamaraInstallments.reduce((sum, i) => sum + i.installmentAmount, 0);
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
        if (installmentTransactions.length === 0) return null;

        const lastPayment = installmentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const lastPaymentDate = new Date(lastPayment.date);
        
        // إضافة 30 يوم
        const nextDate = new Date(lastPaymentDate);
        nextDate.setDate(nextDate.getDate() + 30);
        
        return nextDate.toISOString().split('T')[0];
    };

    // حساب مبلغ القسط التالي
    const getNextPaymentAmount = () => {
        const activeInstallments = state.installments.filter(i => i.paid < i.total);
        return activeInstallments.reduce((sum, i) => sum + i.installmentAmount, 0);
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

                {/* موعد القسط التالي */}
                {nextPaymentDate && (
                    <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⏰</span>
                                <div>
                                    <p className="font-semibold text-blue-800">القسط التالي</p>
                                    <p className="text-sm text-slate-600">موعد الاستحقاق</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-blue-900">{new Date(nextPaymentDate).toLocaleDateString('ar-SA')}</p>
                                <p className="text-sm text-slate-600">{formatCurrency(nextPaymentAmount)}</p>
                            </div>
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
                            <p className="text-2xl font-bold text-green-600">{summary.completedCount}</p>
                            <p className="text-sm text-slate-600">أقساط مكتملة</p>
                        </div>
                    </div>
                    {nextPaymentDate && (
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
                            <div className="text-center mt-3">
                                <button onClick={() => handlePayInstallment(i.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 text-sm w-full shadow-md font-semibold">💳 دفع القسط التالي</button>
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
                            </tr>
                        </thead>
                        <tbody>
                            {installmentTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                                <tr key={t.id} className="border-b border-gray-200/50">
                                    <td className="p-3">{t.date}</td>
                                    <td className="p-3 text-slate-600">{t.description}</td>
                                    <td className="p-3">{getPaymentMethodName(t.paymentMethod, state)}</td>
                                    <td className="p-3 text-red-500 font-semibold number-display">{formatCurrency(t.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InstallmentsTab;