
import React, { useState } from 'react';
import { AppState } from '../../types';
import { generateBudgetPlan } from '../../services/geminiService';

interface BudgetTabProps {
    state: AppState;
    setLoading: (loading: boolean, text?: string) => void;
    setModal: (config: any) => void;
}

const BudgetTab: React.FC<BudgetTabProps> = ({ state, setLoading, setModal }) => {
    const [budgetInput, setBudgetInput] = useState('');
    const [budgetPlan, setBudgetPlan] = useState('');

    const handleGenerateBudget = async () => {
        const totalBudget = parseFloat(budgetInput);
        if (isNaN(totalBudget) || totalBudget <= 0) {
            setModal({ title: "خطأ", body: "<p>الرجاء إدخال مبلغ ميزانية صحيح.</p>", confirmText: 'موافق', hideCancel: true });
            return;
        }

        setLoading(true, "جاري إنشاء خطة الميزانية...");
        setBudgetPlan('');

        try {
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            const recentTransactions = state.transactions.filter(t => new Date(t.date) >= sixtyDaysAgo && t.type === 'expense');
            if (recentTransactions.length < 5) {
                throw new Error("لا توجد بيانات كافية عن إنفاقك لإنشاء خطة دقيقة. يرجى إضافة 5 معاملات على الأقل.");
            }

            const planMarkdown = await generateBudgetPlan(totalBudget, state.categories, recentTransactions);
            setBudgetPlan(planMarkdown);

        } catch (error) {
            const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
            setModal({ title: "خطأ في إنشاء الميزانية", body: `<p>${message}</p>`, confirmText: 'موافق', hideCancel: true });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 animate-fade-in">
            <h3 className="text-xl font-bold mb-4 text-slate-900">✨ الميزانية الشهرية الذكية</h3>
            <div className="flex flex-col sm:flex-row items-end gap-4 mb-6 p-4 bg-slate-100 rounded-lg">
                <div className="flex-grow">
                    <label htmlFor="monthly-budget-input" className="block text-sm font-medium text-slate-600 mb-1">أدخل إجمالي ميزانيتك الشهرية (ريال)</label>
                    <input 
                        type="number" 
                        id="monthly-budget-input" 
                        className="w-full p-2" 
                        placeholder="5000"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                    />
                </div>
                <button onClick={handleGenerateBudget} className="w-full sm:w-auto px-6 py-2 magical-button text-white rounded-lg font-semibold flex-shrink-0">✨ إنشاء خطة الميزانية</button>
            </div>
            <div className="prose max-w-none">
                {budgetPlan ? (
                    <div dangerouslySetInnerHTML={{ __html: budgetPlan.replace(/### (.*)/g, '<h4 class="text-lg font-bold text-slate-900 mt-3 mb-2">$1</h4>').replace(/\n/g, '<br />') }}></div>
                ) : (
                    <p className="text-center text-slate-500">أدخل ميزانيتك أعلاه للحصول على خطة مخصصة بناءً على إنفاقك.</p>
                )}
            </div>
        </div>
    );
};

export default BudgetTab;