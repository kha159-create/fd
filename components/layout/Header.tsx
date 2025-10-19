

import React, { useMemo } from 'react';
import { PlusIcon } from '../common/Icons';
import { t } from '../../translations';

interface HeaderProps {
    selectedYear: number;
    selectedMonth: number | 'all';
    onYearChange: (year: number) => void;
    onMonthChange: (month: number | 'all') => void;
    onAddTransaction: () => void;
    currentUser: any;
    onSignOut: () => void;
    language?: 'ar' | 'en';
}

const Header: React.FC<HeaderProps> = ({ selectedYear, selectedMonth, onYearChange, onMonthChange, onAddTransaction, currentUser, onSignOut, language = 'ar' }) => {
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let y = currentYear + 1; y >= 2020; y--) {
            years.push(y);
        }
        return years;
    }, []);

    const months = useMemo(() => ([
        { value: 'all', label: 'كل الشهور' },
        { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
        { value: 4, label: 'أبريل' }, { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
        { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' }, { value: 9, label: 'سبتمبر' },
        { value: 10, label: 'أكتوبر' }, { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' }
    ]), []);

    return (
        <header className="bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 py-3 shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex flex-col sm:flex-row justify-between items-center text-center sm:text-right gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-xl">💰</div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-wide">لوحة التحكم المالية</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Developed by K.A Team</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 p-1.5 rounded-lg">
                            <select value={selectedYear} onChange={(e) => onYearChange(parseInt(e.target.value))} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold border-0 focus:ring-0 appearance-none p-2 rounded-md">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={selectedMonth} onChange={(e) => onMonthChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold border-0 focus:ring-0 appearance-none p-2 rounded-md">
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                        
                        {/* معلومات المستخدم */}
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{currentUser.displayName || 'المستخدم'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</p>
                            </div>
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-sm">
                                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <button
                                onClick={onSignOut}
                                className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                            >
                                🚪 خروج
                            </button>
                        </div>
                        
                        <button onClick={onAddTransaction} className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-all duration-300">
                            <PlusIcon className="w-5 h-5" />
                            <span>{t('add.transaction', language)}</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;