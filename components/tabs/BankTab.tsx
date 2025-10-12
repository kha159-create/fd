import React from 'react';
import { FinancialCalculations, Transaction, Category, AppState, BankAccountDetails } from '../../types';
import { TrashIcon } from '../common/Icons';

interface BankTabProps {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    calculations: FinancialCalculations;
    filteredTransactions: Transaction[];
    categories: Category[];
    setModal: (config: any) => void;
    openBankAccountFormModal: (accountId?: string) => void;
    deleteBankAccount: (accountId: string) => void;
}

const formatCurrency = (value: number) => (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
     <div className="glass-card p-6">
        <div className="flex justify-between items-start mb-4">
            <h4 className="text-xl font-bold text-slate-900">🏦 {account.name}</h4>
             <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openBankAccountFormModal(account.id)} className="text-sm bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors" aria-label={`تعديل حساب ${account.name}`}>✏️</button>
                <button onClick={() => deleteBankAccount(account.id)} className="text-sm bg-red-100 hover:bg-red-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors" aria-label={`حذف حساب ${account.name}`}><TrashIcon /></button>
            </div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-600 font-semibold">الرصيد الحالي</p>
            <p className="text-3xl font-bold text-blue-800 number-display">{formatCurrency(account.balance)}</p>
        </div>
        <div className="flex justify-between mt-4">
            <div className="text-center">
                <p className="text-emerald-600 font-semibold">إيداعات الفترة</p>
                <p className="text-lg font-bold text-emerald-800 number-display">{formatCurrency(account.deposits)}</p>
            </div>
             <div className="text-center">
                <p className="text-red-600 font-semibold">سحوبات الفترة</p>
                <p className="text-lg font-bold text-red-800 number-display">{formatCurrency(account.withdrawals)}</p>
            </div>
        </div>
    </div>
);


const BankTab: React.FC<BankTabProps> = ({ state, setState, calculations, filteredTransactions, categories, setModal, openBankAccountFormModal, deleteBankAccount }) => {
    
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">إدارة الحسابات البنكية</h2>
                <button onClick={() => openBankAccountFormModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                    + إضافة حساب
                </button>
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