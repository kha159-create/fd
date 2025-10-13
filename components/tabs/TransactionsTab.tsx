import React, { useState, useMemo } from 'react';
import { Transaction, Category, AppState, CardConfig, BankAccountConfig } from '../../types';
import { TrashIcon } from '../common/Icons';

interface TransactionsTabProps {
    transactions: Transaction[];
    allTransactions: Transaction[];
    categories: Category[];
    deleteTransaction: (id: string) => void;
    editTransaction: (id: string) => void;
    state: AppState;
}

const formatCurrency = (value: number) => (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TransactionsTab: React.FC<TransactionsTabProps> = ({ transactions, allTransactions, categories, deleteTransaction, editTransaction, state }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMethod, setFilterMethod] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const getPaymentMethodName = (key: string): string => {
        const standardMethods: { [key: string]: string } = {
            'cash': '💵 نقدي',
            'tabby-bnpl': '📱 تابي (BNPL)', 'tamara-bnpl': '📱 تمارا (BNPL)'
        };
        if (standardMethods[key]) return standardMethods[key];
        if (state.cards[key]) return `💳 ${state.cards[key].name}`;
        if (state.bankAccounts[key]) return `🏦 ${state.bankAccounts[key].name}`;
        return key;
    };
    
    const getTransactionTypeName = (key: string): string => {
        const standardTypes: { [key: string]: string } = {
            'income': '💰 دخل', 'expense': '💸 مصاريف',
            'bnpl-payment': '📱 سداد قسط', 'investment-deposit': '💹 إيداع استثماري',
            'investment-withdrawal': '💹 سحب استثماري'
        };
        if (standardTypes[key]) return standardTypes[key];
        if (key.endsWith('-payment')) {
            const cardId = key.replace('-payment', '');
            if (state.cards[cardId]) return `💳 سداد ${state.cards[cardId].name}`;
        }
        return key;
    };

    const filteredTransactions = useMemo(() => {
        // First, apply all filters based on transaction date (not entry time)
        let filteredData = transactions;

        // Apply date range filter based on transaction date
        if (dateFrom && dateTo) {
            const startDate = new Date(dateFrom);
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            filteredData = allTransactions.filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate >= startDate && transactionDate <= endDate;
            });
        }

        // Apply other filters (search, method, category)
        filteredData = filteredData.filter(t => {
            const term = searchTerm.toLowerCase();
            const category = categories.find(c => c.id === t.categoryId);
            const searchMatch = t.description.toLowerCase().includes(term) || category?.name.toLowerCase().includes(term);
            const methodMatch = !filterMethod || t.paymentMethod === filterMethod;
            const categoryMatch = !filterCategory || t.categoryId === filterCategory;
            return searchMatch && methodMatch && categoryMatch;
        });

        // Finally, sort by entry time (ID timestamp) - newest entries first
        return filteredData.sort((a, b) => {
            // Sort by entry time (ID contains timestamp) - newest first
            const aTime = parseInt(a.id.replace('trans-', '').split('-')[0]);
            const bTime = parseInt(b.id.replace('trans-', '').split('-')[0]);
            return bTime - aTime;
        });
    }, [transactions, allTransactions, searchTerm, filterMethod, filterCategory, dateFrom, dateTo, categories]);

    const totals = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            const isPositive = t.type === 'income' || t.type.toString().includes('payment') || t.type === 'investment-withdrawal';
            if (isPositive) {
                acc.positive += t.amount;
            } else {
                acc.negative += t.amount;
            }
            return acc;
        }, { positive: 0, negative: 0 });
    }, [filteredTransactions]);


    return (
        <div className="space-y-6 animate-fade-in">
            <div className="glass-card p-6">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">📋 سجل المعاملات والتقارير</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 bg-slate-100 rounded-lg mb-6">
                    <div>
                        <label htmlFor="dateFrom" className="block text-sm font-medium text-slate-600 mb-1">من تاريخ</label>
                        <input type="date" id="dateFrom" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full p-2" />
                    </div>
                    <div>
                        <label htmlFor="dateTo" className="block text-sm font-medium text-slate-600 mb-1">إلى تاريخ</label>
                        <input type="date" id="dateTo" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full p-2" />
                    </div>
                    <div>
                        <label htmlFor="filterMethod" className="block text-sm font-medium text-slate-600 mb-1">وسيلة الدفع</label>
                        <select id="filterMethod" value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="p-2 w-full">
                           <option value="">كل الوسائل</option>
                            {Object.values(state.bankAccounts).map((account: BankAccountConfig) => <option key={account.id} value={account.id}>🏦 {account.name}</option>)}
                            <option value="cash">💵 نقدي</option>
                            {Object.values(state.cards).map((card: CardConfig) => <option key={card.id} value={card.id}>💳 {card.name}</option>)}
                            <option value="tabby-bnpl">📱 تابي</option>
                            <option value="tamara-bnpl">📱 تمارا</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filterCategory" className="block text-sm font-medium text-slate-600 mb-1">الفئة</label>
                         <select id="filterCategory" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 w-full">
                            <option value="">كل الفئات</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                     <div className="sm:col-span-2 lg:col-span-4">
                        <label htmlFor="searchTerm" className="block text-sm font-medium text-slate-600 mb-1">بحث بالوصف</label>
                        <input type="text" id="searchTerm" placeholder="🔍..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 w-full" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-emerald-700 text-sm font-medium">إجمالي الإيجابي</p>
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                <span className="text-emerald-600 text-lg">💰</span>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-white/50 shadow-inner">
                            <p className="font-bold text-xl text-emerald-600 number-display">{formatCurrency(totals.positive)}</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-red-700 text-sm font-medium">إجمالي السلبي</p>
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-red-600 text-lg">💸</span>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-white/50 shadow-inner">
                            <p className="font-bold text-xl text-red-600 number-display">{formatCurrency(totals.negative)}</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-sky-50 to-sky-100 p-4 rounded-xl border border-sky-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-sky-700 text-sm font-medium">الصافي</p>
                            <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                                <span className="text-sky-600 text-lg">📊</span>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-white/50 shadow-inner">
                            <p className="font-bold text-xl text-sky-600 number-display">{formatCurrency(totals.positive - totals.negative)}</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-gray-200"><tr><th className="text-right py-3 px-4 font-semibold">التاريخ</th><th className="text-right py-3 px-4 font-semibold">الوسيلة</th><th className="text-right py-3 px-4 font-semibold">النوع</th><th className="text-right py-3 px-4 font-semibold">المبلغ</th><th className="text-right py-3 px-4 font-semibold">الفئة</th><th className="text-right py-3 px-4 font-semibold hidden sm:table-cell">الوصف</th><th className="text-center py-3 px-4 font-semibold"></th></tr></thead>
                        <tbody>
                            {filteredTransactions.map(t => {
                                const category = categories.find(c => c.id === t.categoryId);
                                const isPositive = t.type === 'income' || t.type.toString().includes('payment') || t.type === 'investment-withdrawal';
                                return (
                                <tr key={t.id} className="border-b border-gray-200/50 hover:bg-gray-50">
                                    <td className="p-3">{t.date}</td>
                                    <td className="p-3">{getPaymentMethodName(t.paymentMethod)}</td>
                                    <td className="p-3">{getTransactionTypeName(t.type)}</td>
                                    <td className={`p-3 font-semibold number-display ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>{isPositive ? '+' : '-'} {formatCurrency(t.amount)}</td>
                                    <td className="p-3">{category ? `${category.icon} ${category.name}` : 'غير محدد'}</td>
                                    <td className="p-3 text-slate-500 hidden sm:table-cell">{t.description || '-'}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <button 
                                                onClick={() => editTransaction(t.id)} 
                                                className="text-slate-400 hover:text-blue-500 p-1 transition-colors" 
                                                title="تعديل الحركة"
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                onClick={() => deleteTransaction(t.id)} 
                                                className="text-slate-400 hover:text-red-500 p-1 transition-colors" 
                                                title="حذف الحركة"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                     {filteredTransactions.length === 0 && (
                        <div className="text-center p-8 text-slate-500">
                            <p>لا توجد معاملات تطابق الفلاتر المحددة.</p>
                            <p className="text-xs mt-1">جرب توسيع النطاق الزمني أو تعديل الفلاتر الأخرى.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionsTab;