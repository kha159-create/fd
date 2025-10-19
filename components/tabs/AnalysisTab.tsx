import React, { useEffect, useRef, useMemo } from 'react';
import { FinancialCalculations, Category, Transaction } from '../../types';
import type { Chart } from 'chart.js';
import { t } from '../../translations';

interface AnalysisTabProps {
    calculations: FinancialCalculations;
    categories: Category[];
    allTransactions: Transaction[]; // Pass all transactions for historical analysis
    darkMode?: boolean;
    language?: 'ar' | 'en';
}

const AnalysisTab: React.FC<AnalysisTabProps> = ({ calculations, categories, allTransactions, darkMode = false, language = 'ar' }) => {
    const pieChartRef = useRef<HTMLCanvasElement>(null);
    const barChartRef = useRef<HTMLCanvasElement>(null);
    const chartInstances = useRef<{ pie?: Chart, bar?: Chart }>({});

    const categoryExpenseData = useMemo(() => {
        return Object.entries(calculations.expensesByCategory)
        .map(([categoryId, amount]) => {
            const category = categories.find(c => c.id === categoryId);
            return {
                name: category ? `${category.icon} ${category.name}` : 'غير محدد',
                value: amount as number,
            };
        })
        .sort((a, b) => b.value - a.value);
    }, [calculations.expensesByCategory, categories]);

    const monthlyData = useMemo(() => {
        const result: { [key: string]: { income: number; expenses: number } } = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthString = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            result[monthString] = { income: 0, expenses: 0 };
        }
        
        allTransactions.forEach(t => {
            const date = new Date(t.date);
            const monthString = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            if (result[monthString]) {
                 if (t.type === 'income') result[monthString].income += t.amount;
                 if (t.type === 'expense' || t.type === 'bnpl-payment') result[monthString].expenses += t.amount;
            }
        });

        return {
            labels: Object.keys(result),
            incomeData: Object.values(result).map(r => r.income),
            expensesData: Object.values(result).map(r => r.expenses),
        };
    }, [allTransactions]);

    useEffect(() => {
        const ChartJS = (window as any).Chart;
        if (!ChartJS) return;
        
        // Destroy previous charts to prevent memory leaks
        chartInstances.current.pie?.destroy();
        chartInstances.current.bar?.destroy();
        
        // Pie Chart
        if (pieChartRef.current && categoryExpenseData.length > 0) {
            const ctx = pieChartRef.current.getContext('2d');
            if (ctx) {
                 chartInstances.current.pie = new ChartJS(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: categoryExpenseData.map(d => d.name),
                        datasets: [{
                            data: categoryExpenseData.map(d => d.value),
                            backgroundColor: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#d1d5db', '#9ca3af', '#6b7280'],
                            borderColor: '#ffffff',
                            borderWidth: 2,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: { color: '#475569', font: { family: 'Cairo' } }
                            }
                        }
                    }
                });
            }
        }
        
        // Bar Chart
        if (barChartRef.current && monthlyData.labels.length > 0) {
            const ctx = barChartRef.current.getContext('2d');
            if (ctx) {
                chartInstances.current.bar = new ChartJS(ctx, {
                    type: 'bar',
                    data: {
                        labels: monthlyData.labels,
                        datasets: [
                            {
                                label: 'الدخل',
                                data: monthlyData.incomeData,
                                backgroundColor: '#10b981',
                                borderRadius: 4
                            },
                            {
                                label: 'المصاريف',
                                data: monthlyData.expensesData,
                                backgroundColor: '#ef4444',
                                borderRadius: 4
                            }
                        ]
                    },
                    options: {
                         responsive: true,
                         maintainAspectRatio: false,
                         scales: {
                            y: { ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } },
                            x: { ticks: { color: '#64748b' }, grid: { display: false } }
                         },
                         plugins: {
                             legend: { labels: { color: '#475569', font: { family: 'Cairo' } } }
                         }
                    }
                });
            }
        }
        
        return () => {
            chartInstances.current.pie?.destroy();
            chartInstances.current.bar?.destroy();
        }
    }, [categoryExpenseData, monthlyData]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">📊 توزيع مصاريف الفترة</h3>
                <div className="h-80">
                   {categoryExpenseData.length > 0 ? <canvas ref={pieChartRef}></canvas> : <p className="text-center text-slate-500 dark:text-slate-400 mt-10">لا توجد مصاريف لعرضها.</p>}
                </div>
            </div>
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">📈 الدخل مقابل المصاريف (آخر 6 أشهر)</h3>
                <div className="h-80">
                    <canvas ref={barChartRef}></canvas>
                </div>
            </div>
        </div>
    );
};

export default AnalysisTab;