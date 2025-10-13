import React, { useMemo } from 'react';
import { AppState, CardConfig, Transaction, CardDetails } from '../../types';
import { TrashIcon } from '../common/Icons';

interface CardsTabProps {
    state: AppState;
    openCardFormModal: (cardId?: string) => void;
    deleteCard: (cardId: string) => void;
}

const formatCurrency = (value: number) => (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface CardStatementDetails {
    statementDueAmount: number;
    dueDate: Date;
    totalOutstanding: number;
    upcomingTransactions: Transaction[];
}

const CreditCardDetails: React.FC<{
    card: CardDetails;
    statementDetails: CardStatementDetails;
    openCardFormModal: (cardId: string) => void;
    deleteCard: (cardId: string) => void;
}> = ({ card, statementDetails, openCardFormModal, deleteCard }) => {
    
    const transactionRows = (transactions: Transaction[]) => {
        if (!transactions || transactions.length === 0) {
            return '<tr><td colspan="3" class="text-center text-slate-500 py-3">لا توجد حركات</td></tr>';
        }
        return transactions.map(t => `
            <tr class="hover:bg-slate-50">
                <td class="p-2">${t.postingDate || t.date}</td>
                <td class="p-2 truncate" title="${t.description}">${t.description}</td>
                <td class="p-2 number-display text-red-500">${formatCurrency(t.amount)}</td>
            </tr>
        `).join('');
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xl">💳</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{card.name}</h3>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openCardFormModal(card.id)} className="text-sm bg-white/80 hover:bg-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm" aria-label={`تعديل بطاقة ${card.name}`}>✏️</button>
                    <button onClick={() => deleteCard(card.id)} className="text-sm bg-red-100 hover:bg-red-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors" aria-label={`حذف بطاقة ${card.name}`}><TrashIcon /></button>
                </div>
            </div>
            <div className="space-y-3">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-amber-700 text-sm font-medium">المبلغ المستحق للكشف الحالي</span>
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                            <span className="text-amber-600 text-lg">📅</span>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-amber-200 mb-2">
                        <p className="font-bold text-2xl text-amber-800 number-display text-center">{formatCurrency(statementDetails.statementDueAmount)} ريال</p>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-amber-600 font-medium">تاريخ الاستحقاق:</span>
                        <span className="font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">{statementDetails.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 gap-3">
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                            <p className="text-red-700 text-sm font-medium mb-1">الرصيد الإجمالي المستحق</p>
                            <p className="font-bold text-red-800 number-display">{formatCurrency(card.balance)} ريال</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                            <p className="text-blue-700 text-sm font-medium mb-1">الحد الائتماني</p>
                            <p className="font-bold text-blue-800 number-display">{formatCurrency(card.limit)} ريال</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                            <p className="text-green-700 text-sm font-medium mb-1">الرصيد المتاح</p>
                            <p className="font-bold text-green-800 number-display">{formatCurrency(card.available)} ريال</p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-center">
                            <p className="text-orange-700 text-sm font-medium mb-1">نسبة الاستخدام</p>
                            <p className={`font-bold ${card.usagePercentage > 80 ? 'text-red-800' : card.usagePercentage > 60 ? 'text-yellow-800' : 'text-green-800'}`}>
                                {card.usagePercentage.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex-grow flex flex-col">
                <h4 className="font-semibold text-slate-600 mb-2 border-b border-slate-200 pb-1">المعاملات القادمة ({statementDetails.upcomingTransactions.length})</h4>
                <div className="flex-grow max-h-32 overflow-y-auto">
                    <table className="w-full text-xs" dangerouslySetInnerHTML={{ __html: `<tbody>${transactionRows(statementDetails.upcomingTransactions)}</tbody>` }}></table>
                </div>
            </div>
        </div>
    );
};

const CardsTab: React.FC<CardsTabProps> = ({ state, openCardFormModal, deleteCard }) => {
    
    const statementDetailsMap = useMemo(() => {
        const map: { [key: string]: CardStatementDetails } = {};

        // FIX: Add type `CardConfig` to cardConfig to fix property access errors.
        Object.values(state.cards).forEach((cardConfig: CardConfig) => {
            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            let statementEndDate, statementStartDate, dueDate;

            if (currentDay > cardConfig.statementDay) {
                statementEndDate = new Date(currentYear, currentMonth, cardConfig.statementDay);
            } else {
                statementEndDate = new Date(currentYear, currentMonth - 1, cardConfig.statementDay);
            }
            
            statementStartDate = new Date(statementEndDate.getFullYear(), statementEndDate.getMonth() -1, cardConfig.statementDay + 1);
            
            let dueMonth = statementEndDate.getMonth() + 1;
            let dueYear = statementEndDate.getFullYear();
            if(dueMonth > 11) {
                dueMonth = 0;
                dueYear += 1;
            }
            dueDate = new Date(dueYear, dueMonth, cardConfig.dueDay);

            const transactionsInStatement = state.transactions.filter(t => {
                const postingDate = new Date(t.postingDate || t.date);
                const isCardExpense = t.paymentMethod === cardConfig.id && (t.type === 'expense' || t.type === 'bnpl-payment');
                return isCardExpense && postingDate >= statementStartDate && postingDate <= statementEndDate;
            });

            const upcomingTransactions = state.transactions.filter(t => {
                const postingDate = new Date(t.postingDate || t.date);
                const isCardExpense = t.paymentMethod === cardConfig.id && (t.type === 'expense' || t.type === 'bnpl-payment');
                return isCardExpense && postingDate > statementEndDate;
            });

            const statementDueAmount = transactionsInStatement.reduce((sum, t) => sum + t.amount, 0);

            map[cardConfig.id] = {
                statementDueAmount,
                dueDate,
                totalOutstanding: 0, // This is calculated globally in App.tsx now
                upcomingTransactions
            };
        });
        return map;
    }, [state.transactions, state.cards]);
    
    // FIX: Cast Object.values to CardConfig[] to fix downstream errors.
    const allCards: CardConfig[] = Object.values(state.cards);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">إدارة البطاقات</h2>
                <button onClick={() => openCardFormModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                    + إضافة بطاقة
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {allCards.map(cardConfig => {
                     const cardBalanceDetails = state.transactions
                        .filter(t => t.paymentMethod === cardConfig.id && (t.type === 'expense' || t.type === 'bnpl-payment'))
                        .reduce((sum, t) => sum + t.amount, 0)
                        - state.transactions
                        .filter(t => t.type === `${cardConfig.id}-payment`)
                        .reduce((sum, t) => sum + t.amount, 0);
                     
                     const card: CardDetails = {
                         ...cardConfig,
                         balance: cardBalanceDetails,
                         available: cardConfig.limit - cardBalanceDetails,
                         usagePercentage: cardConfig.limit > 0 ? (cardBalanceDetails / cardConfig.limit) * 100 : 0,
                     };
                     
                     return (
                         <CreditCardDetails 
                             key={card.id}
                             card={card}
                             statementDetails={statementDetailsMap[card.id]} 
                             openCardFormModal={openCardFormModal}
                             deleteCard={deleteCard}
                         />
                     );
                 })}
            </div>
        </div>
    );
};

export default CardsTab;