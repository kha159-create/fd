import React, { useState } from 'react';
import { FinancialCalculations, Transaction, Category, AppState, BankAccountDetails } from '../../types';
import { TrashIcon } from '../common/Icons';
import { formatCurrency } from '../../utils/formatting';

interface BankTabProps {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    calculations: FinancialCalculations;
    filteredTransactions: Transaction[];
    categories: Category[];
    setModal: (config: any) => void;
    openBankAccountFormModal: (accountId?: string) => void;
    deleteBankAccount: (accountId: string) => void;
    openTransferModal: () => void;
}

const getTransactionTypeName = (type: string, state: AppState) => {
    const standardTypes: { [key: string]: string } = {
        'income': '💰 دخل', 'expense': '💸 مصاريف',
        'bnpl-payment': '📱 سداد قسط', 'investment-deposit': '💹 إيداع استثماري',
        'investment-withdrawal': '💹 سحب استثماري'
    };
    if (standardTypes[type]) return standardTypes[type];
    if (type.endsWith('-payment')) {
        const cardId = type.replace('-payment', '');
        if (state.cards[cardId]) return `💳 سداد ${state.cards[cardId].name}`;
    }
    return type;
};

const AccountCard: React.FC<{
    account: BankAccountDetails, 
    openBankAccountFormModal: (id: string) => void, 
    deleteBankAccount: (id: string) => void 
}> = ({ account, openBankAccountFormModal, deleteBankAccount }) => (
     <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl">🏦</span>
                </div>
                <h4 className="text-xl font-bold text-slate-900">{account.name}</h4>
            </div>
             <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openBankAccountFormModal(account.id)} className="text-sm bg-white/80 hover:bg-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm" aria-label={`تعديل حساب ${account.name}`}>✏️</button>
                <button onClick={() => deleteBankAccount(account.id)} className="text-sm bg-red-100 hover:bg-red-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors" aria-label={`حذف حساب ${account.name}`}><TrashIcon /></button>
            </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">
            <p className="text-blue-700 font-semibold text-center mb-2">الرصيد الحالي</p>
            <p className="text-3xl font-bold text-blue-900 number-display text-center">{formatCurrency(account.balance)}</p>
        </div>
        <div className="space-y-3">
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                <p className="text-emerald-700 font-semibold text-sm mb-1">إيداعات الفترة</p>
                <p className="text-lg font-bold text-emerald-800 number-display">{formatCurrency(account.deposits)}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                <p className="text-red-700 font-semibold text-sm mb-1">سحوبات الفترة</p>
                <p className="text-lg font-bold text-red-800 number-display">{formatCurrency(account.withdrawals)}</p>
            </div>
        </div>
    </div>
);

const BankTab: React.FC<BankTabProps> = ({ state, setState, calculations, filteredTransactions, categories, setModal, openBankAccountFormModal, deleteBankAccount, openTransferModal }) => {

    
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">إدارة الحسابات البنكية</h2>
                <div className="flex gap-3">
                    {Object.keys(state.bankAccounts).length > 1 && (
                        <button onClick={openTransferModal} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold">
                            💸 تحويل بين الحسابات
                        </button>
                    )}
                    <button onClick={() => openBankAccountFormModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                        + إضافة حساب
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FIX: Explicitly type 'account' as BankAccountDetails to prevent property access errors on 'unknown'. */}
               {Object.values(calculations.bankAccountDetails).map((account: BankAccountDetails) => (
                   <AccountCard 
                    key={account.id} 
                    account={account}
                    openBankAccountFormModal={openBankAccountFormModal}
                    deleteBankAccount={deleteBankAccount}
                   />
               ))}
            </div>
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4 text-slate-900">📋 معاملات الحسابات البنكية (الفترة المحددة)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-gray-200">
                            <tr>
                                <th className="text-right p-3 font-semibold">التاريخ</th>
                                <th className="text-right p-3 font-semibold">الحساب</th>
                                <th className="text-right p-3 font-semibold">النوع</th>
                                <th className="text-right p-3 font-semibold">المبلغ</th>
                                <th className="text-right p-3 font-semibold">الفئة</th>
                                <th className="text-right p-3 font-semibold">الوصف</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions
                                .filter(t => state.bankAccounts[t.paymentMethod])
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(t => {
                                const isIncome = ['income', 'investment-withdrawal'].includes(t.type);
                                const amountClass = isIncome ? 'text-emerald-500' : 'text-red-500';
                                const category = categories.find(c => c.id === t.categoryId);
                                return (
                                    <tr key={t.id} className="border-b border-gray-200/50">
                                        <td className="p-3">{t.date}</td>
                                        <td className="p-3">{state.bankAccounts[t.paymentMethod]?.name}</td>
                                        <td className="p-3">{getTransactionTypeName(t.type, state)}</td>
                                        <td className={`p-3 font-semibold ${amountClass} number-display`}>{isIncome ? '+' : '-'}{formatCurrency(t.amount)}</td>
                                        <td className="p-3">{category ? `${category.icon} ${category.name}` : '-'}</td>
                                        <td className="p-3 text-slate-500">{t.description || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default BankTab;