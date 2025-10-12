

import React, { useMemo } from 'react';
import { PlusIcon } from '../common/Icons';

interface HeaderProps {
    selectedYear: number;
    selectedMonth: number | 'all';
    onYearChange: (year: number) => void;
    onMonthChange: (month: number | 'all') => void;
    onAddTransaction: () => void;
}

const Header: React.FC<HeaderProps> = ({ selectedYear, selectedMonth, onYearChange, onMonthChange, onAddTransaction }) => {
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
        <header className="bg-slate-50/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-200 py-3">
            <div className="container mx-auto px-4">
                <div className="flex flex-col sm:flex-row justify-between items-center text-center sm:text-right gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-xl">💰</div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-wide">لوحة التحكم المالية</h1>
                            <p className="text-xs text-slate-500">Developed by K.A Team</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-200 p-1.5 rounded-lg">
                            <select value={selectedYear} onChange={(e) => onYearChange(parseInt(e.target.value))} className="bg-slate-200 text-slate-800 font-semibold border-0 focus:ring-0 appearance-none p-2 rounded-md">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={selectedMonth} onChange={(e) => onMonthChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="bg-slate-200 text-slate-800 font-semibold border-0 focus:ring-0 appearance-none p-2 rounded-md">
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                        <button onClick={onAddTransaction} className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-all duration-300">
                            <PlusIcon className="w-5 h-5" />
                            <span>إضافة حركة</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;