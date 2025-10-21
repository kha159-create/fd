import React, { useMemo } from 'react';
import { FinancialCalculations, Category, CardDetails, BankAccountDetails, AppState, CardConfig } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { t } from '../../translations';

interface DashboardTabProps {
    calculations: FinancialCalculations;
    categories: Category[];
    state: AppState;
    darkMode?: boolean;
    language?: 'ar' | 'en';
    onNavigateToTransactions?: (categoryId?: string) => void;
}


const CardDebtWidget: React.FC<{ title: string, details: CardDetails, barColor: string, darkMode?: boolean, language?: 'ar' | 'en' }> = ({ title, details, barColor, darkMode = false, language = 'ar' }) => (
    <div className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow h-32 flex flex-col justify-between ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-start">
            <h4 className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h4>
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">💳</span>
            </div>
        </div>
        <div className={`p-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-gray-200'}`}>
            <div className="flex justify-between text-xs mb-1">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{t('due', language)}:</span>
                <span className={`font-semibold number-display text-xs ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{formatCurrency(details.balance)}</span>
            </div>
            <div className="flex justify-between text-xs">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{t('remaining', language)}:</span>
                <span className={`font-semibold number-display text-xs ${darkMode ? 'text-slate-200' : 'text-emerald-700'}`}>{formatCurrency(details.available)}</span>
            </div>
        </div>
        <div className={`rounded-full h-1.5 overflow-hidden ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
            <div className={`${barColor} rounded-full h-1.5 transition-all duration-300`} style={{ width: `${Math.min(100, details.usagePercentage)}%` }}></div>
        </div>
    </div>
);


const CategorySummary: React.FC<{ calculations: FinancialCalculations, categories: Category[], darkMode?: boolean, language?: 'ar' | 'en', onNavigateToTransactions?: (categoryId?: string) => void }> = ({ calculations, categories, darkMode = false, language = 'ar', onNavigateToTransactions }) => {
    // FIX: Operator '+' cannot be applied to types 'unknown' and 'number'.
    // Explicitly cast `amount` to `Number` as Object.values() may return `unknown`.
    const totalExpenses = Object.values(calculations.expensesByCategory).reduce((sum, amount) => sum + Number(amount), 0);

    if (totalExpenses === 0) {
        return <p className={`text-center p-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('no.data', language)}</p>;
    }

    // Cast values to `number` for sorting to prevent type errors.
    const sortedCategories = Object.entries(calculations.expensesByCategory)
        .sort(([, a], [, b]) => (b as number) - (a as number));

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
            {sortedCategories.map(([categoryId, total]) => {
                const category = categories.find(c => c.id === categoryId);
                const name = category ? `${category.icon} ${category.name}` : t('other', language);
                // FIX: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
                // Explicitly cast `total` to `Number` as Object.entries() may return `unknown`.
                const percentage = (Number(total) / totalExpenses) * 100;
                return (
                    <button key={categoryId} className={`group relative w-full p-4 rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] ${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:from-slate-700 hover:to-slate-800 hover:border-slate-600' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:from-gray-50 hover:to-gray-100 hover:border-gray-300'}`} onClick={() => onNavigateToTransactions?.(categoryId)}>
                        {/* Header with icon and name */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-12 h-12 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg shadow-md ${darkMode ? 'bg-slate-700 group-hover:bg-slate-600' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                                    {category?.icon || '📊'}
                                </div>
                                <div className="flex flex-col items-start flex-1 min-w-0">
                                    <span className={`font-semibold text-sm sm:text-xs truncate w-full ${darkMode ? 'text-slate-200' : 'text-slate-800'}`} title={category?.name}>
                                        {category?.name || t('other', language)}
                                    </span>
                                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {percentage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className={`px-3 py-2 rounded-xl shadow-sm flex-shrink-0 ${darkMode ? 'bg-slate-700 group-hover:bg-slate-600' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                                <span className={`font-bold text-sm sm:text-xs number-display ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                    {formatCurrency(total as number)}
                                </span>
                            </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className={`rounded-full h-2.5 overflow-hidden shadow-inner ${darkMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                            <div 
                                className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-700 ease-out shadow-sm relative overflow-hidden" 
                                style={{ width: `${percentage.toFixed(1)}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                            </div>
                        </div>
                        
                        {/* Hover effect indicator */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                    </div>
                    </button>
                );
            })}
        </div>
    );
};


const DashboardTab: React.FC<DashboardTabProps> = ({ calculations, categories, state, darkMode = false, language = 'ar', onNavigateToTransactions }) => {
    const { totalIncome, totalExpenses, cardPayments, bankAccountDetails, totalBankBalance } = calculations;
    const net = totalIncome - totalExpenses;
    const cardColors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'];

    // استخدام الحسابات المركزية الدقيقة من App.tsx
    const cardDetails = calculations.cardDetails;

    // حساب المجاميع من بيانات البطاقات المحسوبة
    const totalDebt = Object.values(cardDetails).reduce((sum, card) => sum + card.balance, 0);
    const totalAvailable = Object.values(cardDetails).reduce((sum, card) => sum + card.available, 0);
    const totalLimits = Object.values(cardDetails).reduce((sum, card) => sum + card.limit, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            <div className="card-consistent xl:col-span-1">
                <h3 className={`font-semibold text-lg mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>💳 {t('card.debts.summary', language)}</h3>
                <div className="space-y-4">
                    {Object.values(cardDetails).map((card: CardDetails, index) => (
                        <CardDebtWidget key={card.id} title={card.name} details={card} barColor={cardColors[index % cardColors.length]} darkMode={darkMode} language={language} />
                    ))}
                </div>
                <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div className="space-y-3">
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                            <p className={`font-semibold text-xs mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{t('total.debts', language)}</p>
                            <p className={`font-bold text-sm number-display ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{formatCurrency(totalDebt)}</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                            <p className={`font-semibold text-xs mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('total.available', language)}</p>
                            <p className={`font-bold text-sm number-display ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(totalAvailable)}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                            <p className="text-blue-600 font-semibold text-xs mb-2 whitespace-nowrap">إجمالي الحدود</p>
                            <p className="font-bold text-sm text-blue-600 number-display">{formatCurrency(totalLimits)}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-consistent xl:col-span-1">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">🏦 ملخص الحسابات البنكية</h3>
                <div className="space-y-3">
                    {Object.values(bankAccountDetails).map((account: BankAccountDetails) => {
                        const balanceClass = account.balance > 0 ? 'bank-card-positive' : 
                                           account.balance < 0 ? 'bank-card-negative' : 'bank-card-neutral';
                        
                        return (
                            <div key={account.id} className={`card-consistent ${balanceClass} h-32 flex flex-col justify-between`}>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold text-lg text-slate-800">{account.name}</h3>
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-600 text-sm">🏛️</span>
                                    </div>
                                </div>
                                
                                {/* Balance Number - Centered */}
                                <div className="text-center">
                                    <p className="font-bold text-2xl text-blue-900 number-display">{formatCurrency(account.balance)}</p>
                                </div>
                                
                                {/* Deposits and Withdrawals - Tight spacing below balance */}
                                <div className="flex justify-center gap-6 mt-1">
                                    <div className="text-center">
                                        <p className="text-emerald-600 font-semibold text-xs mb-0.5">الإيداعات</p>
                                        <p className="text-emerald-700 font-bold text-sm">+{formatCurrency(account.deposits)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-red-600 font-semibold text-xs mb-0.5">السحوبات</p>
                                        <p className="text-red-700 font-bold text-sm">-{formatCurrency(account.withdrawals)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="card-consistent xl:col-span-1">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">📈 تقرير مالي شامل</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>إجمالي الدخل:</span><span className="font-bold text-sm text-emerald-500 number-display">{formatCurrency(totalIncome)}</span></div>
                    <div className="flex justify-between"><span>إجمالي المصاريف:</span><span className="font-bold text-sm text-red-500 number-display">{formatCurrency(totalExpenses)}</span></div>
                    <hr className="my-2 border-slate-200" />
                    {Object.values(cardDetails).map((card: CardDetails, index) => (
                         <div key={card.id} className="flex justify-between text-xs"><span className="text-slate-500">مصاريف {card.name}:</span><span className={`font-semibold ${cardColors[index % cardColors.length].replace('bg-','text-')} number-display`}>{formatCurrency(card.balance + (cardPayments[card.id] || 0))}</span></div>
                    ))}
                    <hr className="my-2 border-slate-200 border-dashed" />
                    {Object.entries(cardPayments).map(([cardId, amount]) => (
                         <div key={cardId} className="flex justify-between text-xs"><span className="text-slate-500">إجمالي سداد {cardDetails[cardId]?.name}:</span><span className="font-semibold text-emerald-500 number-display">{formatCurrency(amount as number)}</span></div>
                    ))}
                    <hr className="my-2 border-slate-200" />
                    <div className="flex justify-between font-bold text-sm"><span>الصافي:</span><span className={`number-display ${net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(net)}</span></div>
                </div>
            </div>
            <div className="card-consistent xl:col-span-1">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">📊 ملخص الفئات</h3>
                <CategorySummary calculations={calculations} categories={categories} onNavigateToTransactions={onNavigateToTransactions} />
            </div>
        </div>
    );
};

export default DashboardTab;
