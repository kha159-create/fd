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


const CategorySummary: React.FC<{ calculations: FinancialCalculations, categories: Category[], darkMode?: boolean, language?: 'ar' | 'en' }> = ({ calculations, categories, darkMode = false, language = 'ar' }) => {
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
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {sortedCategories.map(([categoryId, total]) => {
                const category = categories.find(c => c.id === categoryId);
                const name = category ? `${category.icon} ${category.name}` : t('other', language);
                // FIX: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
                // Explicitly cast `total` to `Number` as Object.entries() may return `unknown`.
                const percentage = (Number(total) / totalExpenses) * 100;
                return (
                    <div key={categoryId} className={`p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow h-20 flex flex-col justify-between ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-base">{category?.icon || '📊'}</span>
                                <span className={`font-medium truncate text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`} title={category?.name}>{category?.name || t('other', language)}</span>
                            </div>
                            <span className={`font-semibold number-display text-sm px-2 py-1 rounded border ${darkMode ? 'text-slate-200 bg-slate-700 border-slate-600' : 'text-slate-900 bg-slate-50 border-gray-200'}`}>
                                {formatCurrency(total as number)}
                            </span>
                        </div>
                        <div className={`mt-2 rounded-full h-1.5 overflow-hidden ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage.toFixed(1)}%` }}></div>
                        </div>
                        <div className={`text-xs mt-1 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{percentage.toFixed(1)}%</div>
                    </div>
                );
            })}
        </div>
    );
};


const DashboardTab: React.FC<DashboardTabProps> = ({ calculations, categories, state, darkMode = false, language = 'ar' }) => {
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
                 <div className="mt-4 card-consistent text-center">
                    <h3 className="font-semibold text-lg text-slate-800 mb-2">🏦 إجمالي الأرصدة البنكية</h3>
                    <p className="font-bold text-xl text-blue-900 number-display">{formatCurrency(totalBankBalance)}</p>
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
                <CategorySummary calculations={calculations} categories={categories} />
            </div>
        </div>
    );
};

export default DashboardTab;
