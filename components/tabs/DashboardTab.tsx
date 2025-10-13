import React from 'react';
import { FinancialCalculations, Category, CardDetails, BankAccountDetails } from '../../types';

interface DashboardTabProps {
    calculations: FinancialCalculations;
    categories: Category[];
}

const formatCurrency = (value: number) => (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CardDebtWidget: React.FC<{ title: string, details: CardDetails, barColor: string }> = ({ title, details, barColor }) => (
    <div className="bg-slate-100 p-4 rounded-lg">
        <h4 className="font-bold text-md text-slate-800">{title}</h4>
        <div className="flex justify-between text-sm mt-2"><span className="text-slate-500">المستحق:</span><span className="font-bold number-display text-slate-800">{formatCurrency(details.balance)} ريال</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-500">المتبقي:</span><span className="font-bold number-display text-emerald-500">{formatCurrency(details.available)} ريال</span></div>
        <div className="mt-3 bg-slate-200 rounded-full h-2"><div className={`${barColor} rounded-full h-2`} style={{ width: `${Math.min(100, details.usagePercentage)}%` }}></div></div>
    </div>
);


const CategorySummary: React.FC<{ calculations: FinancialCalculations, categories: Category[] }> = ({ calculations, categories }) => {
    // FIX: Operator '+' cannot be applied to types 'unknown' and 'number'.
    // Explicitly cast `amount` to `Number` as Object.values() may return `unknown`.
    const totalExpenses = Object.values(calculations.expensesByCategory).reduce((sum, amount) => sum + Number(amount), 0);

    if (totalExpenses === 0) {
        return <p className="text-slate-500 text-center p-4 text-sm">لا توجد مصاريف في هذه الفترة.</p>;
    }

    // Cast values to `number` for sorting to prevent type errors.
    const sortedCategories = Object.entries(calculations.expensesByCategory)
        .sort(([, a], [, b]) => (b as number) - (a as number));

    return (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {sortedCategories.map(([categoryId, total]) => {
                const category = categories.find(c => c.id === categoryId);
                const name = category ? `${category.icon} ${category.name}` : 'غير مصنف';
                // FIX: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
                // Explicitly cast `total` to `Number` as Object.entries() may return `unknown`.
                const percentage = (Number(total) / totalExpenses) * 100;
                return (
                    <div key={categoryId} className="flex items-center justify-between text-sm py-1">
                        <span className="w-28 truncate text-slate-600" title={category?.name}>{name}</span>
                        <div className="flex-1 bg-slate-200 rounded-full h-2.5 mx-2">
                            <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percentage.toFixed(1)}%` }}></div>
                        </div>
                        <span className="font-bold text-slate-800 number-display w-24 text-left">{formatCurrency(total as number)} ريال</span>
                    </div>
                );
            })}
        </div>
    );
};


const DashboardTab: React.FC<DashboardTabProps> = ({ calculations, categories }) => {
    const { totalIncome, totalExpenses, cardDetails, cardPayments, bankAccountDetails, totalDebt, totalAvailable, totalLimits, totalBankBalance } = calculations;
    const net = totalIncome - totalExpenses;
    const cardColors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            <div className="glass-card p-6 xl:col-span-1">
                <h3 className="text-lg font-bold mb-4 text-slate-900">💳 ملخص ديون البطاقات</h3>
                <div className="space-y-4">
                    {Object.values(cardDetails).map((card: CardDetails, index) => (
                        <CardDebtWidget key={card.id} title={card.name} details={card} barColor={cardColors[index % cardColors.length]} />
                    ))}
                </div>
                <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-slate-500 text-xs">إجمالي الديون</p><p className="text-lg font-bold text-red-500 number-display">{formatCurrency(totalDebt)}</p></div>
                        <div><p className="text-slate-500 text-xs">إجمالي المتاح</p><p className="text-lg font-bold text-emerald-500 number-display">{formatCurrency(totalAvailable)}</p></div>
                        <div><p className="text-slate-500 text-xs whitespace-nowrap">إجمالي الحدود</p><p className="text-lg font-bold text-sky-500 number-display">{formatCurrency(totalLimits)}</p></div>
                    </div>
                </div>
            </div>
            <div className="glass-card p-6 xl:col-span-1">
                <h3 className="text-lg font-bold mb-4 text-slate-900">🏦 ملخص الحسابات البنكية</h3>
                <div className="space-y-3">
                    {Object.values(bankAccountDetails).map((account: BankAccountDetails) => (
                        <div key={account.id} className="bg-gradient-to-br from-blue-50 to-slate-100 p-4 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <p className="font-bold text-slate-800">{account.name}</p>
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 text-lg">🏛️</span>
                                </div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-white/50 shadow-inner">
                                <p className="font-bold text-2xl text-blue-700 number-display text-center">{formatCurrency(account.balance)}</p>
                            </div>
                            <div className="flex justify-between text-xs mt-3 px-1">
                                <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                    <span className="text-emerald-600 font-semibold">+{formatCurrency(account.deposits)}</span>
                                </div>
                                <div className="bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                                    <span className="text-red-600 font-semibold">-{formatCurrency(account.withdrawals)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-center">
                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                        <p className="text-white/90 text-sm font-medium mb-2">إجمالي الأرصدة البنكية</p>
                        <p className="text-3xl font-bold text-white number-display">{formatCurrency(totalBankBalance)}</p>
                    </div>
                </div>
            </div>
            <div className="glass-card p-6 xl:col-span-1">
                <h3 className="text-lg font-bold mb-4 text-slate-900">📈 تقرير مالي شامل</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>إجمالي الدخل:</span><span className="font-bold text-emerald-500 number-display">{formatCurrency(totalIncome)}</span></div>
                    <div className="flex justify-between"><span>إجمالي المصاريف:</span><span className="font-bold text-red-500 number-display">{formatCurrency(totalExpenses)}</span></div>
                    <hr className="my-2 border-slate-200" />
                    {Object.values(cardDetails).map((card: CardDetails, index) => (
                         <div key={card.id} className="flex justify-between text-xs"><span className="text-slate-500">مصاريف {card.name}:</span><span className={`font-semibold ${cardColors[index % cardColors.length].replace('bg-','text-')} number-display`}>{formatCurrency(card.balance + (cardPayments[card.id] || 0))}</span></div>
                    ))}
                    <hr className="my-2 border-slate-200 border-dashed" />
                    {Object.entries(cardPayments).map(([cardId, amount]) => (
                         <div key={cardId} className="flex justify-between text-xs"><span className="text-slate-500">إجمالي سداد {cardDetails[cardId]?.name}:</span><span className="font-semibold text-emerald-500 number-display">{formatCurrency(amount as number)}</span></div>
                    ))}
                    <hr className="my-2 border-slate-200" />
                    <div className="flex justify-between font-bold text-lg"><span>الصافي:</span><span className={`number-display ${net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(net)}</span></div>
                </div>
            </div>
            <div className="glass-card p-6 xl:col-span-1">
                <h3 className="text-lg font-bold mb-4 text-slate-900">📊 ملخص الفئات</h3>
                <CategorySummary calculations={calculations} categories={categories} />
            </div>
        </div>
    );
};

export default DashboardTab;
