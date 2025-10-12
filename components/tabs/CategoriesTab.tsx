


import React, { useState } from 'react';
import { Category } from '../../types';
import { TrashIcon, MagicIcon } from '../common/Icons';
import { suggestCategoryIcon } from '../../services/geminiService';

// FIX: Added setModal and setLoading to props to fix type error in App.tsx
interface CategoriesTabProps {
    categories: Category[];
    addCategory: (category: Omit<Category, 'id'>) => void;
    deleteCategory: (id: string) => void;
    setModal: (config: any) => void;
    setLoading: (loading: boolean, text?: string) => void;
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ categories, addCategory, deleteCategory, setModal, setLoading }) => {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('🛒');
    const [isSuggesting, setIsSuggesting] = useState(false);

    const handleSuggestIcon = async () => {
        if (!name) {
            // FIX: Replaced alert with modal.
            setModal({ title: "خطأ", body: "<p>الرجاء إدخال اسم الفئة أولاً.</p>", confirmText: 'موافق', hideCancel: true });
            return;
        }
        setIsSuggesting(true);
        try {
            const suggestedIcon = await suggestCategoryIcon(name);
            setIcon(suggestedIcon);
        } catch (error) {
            const message = error instanceof Error ? error.message : "حدث خطأ أثناء اقتراح أيقونة.";
            setModal({ title: "خطأ", body: `<p>${message}</p>`, confirmText: 'موافق', hideCancel: true });
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            // FIX: Replaced alert with modal.
            setModal({ title: 'خطأ', body: '<p>الرجاء إدخال اسم الفئة.</p>', confirmText: 'موافق', hideCancel: true });
            return;
        }
        addCategory({ name, icon });
        setName('');
        setIcon('🛒');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4 text-slate-900">➕ إضافة فئة جديدة</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="category-name" className="block text-sm font-medium text-slate-600 mb-1">اسم الفئة</label>
                        <input type="text" id="category-name" value={name} onChange={e => setName(e.target.value)} className="w-full p-3" required />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="flex-grow">
                            <label htmlFor="category-icon" className="block text-sm font-medium text-slate-600 mb-1">الأيقونة</label>
                            <input type="text" id="category-icon" value={icon} onChange={e => setIcon(e.target.value)} className="w-full p-3" required placeholder="🛒" />
                        </div>
                        <button type="button" onClick={handleSuggestIcon} disabled={isSuggesting} title="اقتراح أيقونة ذكية" className="p-2 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 transition-colors h-[46px] w-[46px] flex-shrink-0 disabled:opacity-50 flex items-center justify-center">
                            {isSuggesting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div> : <MagicIcon />}
                        </button>
                    </div>
                    <button type="submit" className="w-full py-3 magical-button text-white rounded-lg font-semibold">إضافة الفئة</button>
                </form>
            </div>
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4 text-slate-900">📂 الفئات الحالية</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                            <span className="font-semibold text-slate-800">{cat.icon} {cat.name}</span>
                            <button onClick={() => deleteCategory(cat.id)} className="text-slate-400 hover:text-red-500 p-1"><TrashIcon /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoriesTab;