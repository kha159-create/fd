
import React, { useState, useEffect } from 'react';
import { BankAccountConfig } from '../../types';
import { XMarkIcon } from '../common/Icons';

interface BankAccountFormProps {
    onClose: () => void;
    onSave: (account: Omit<BankAccountConfig, 'id'>, id?: string) => void;
    initialData?: BankAccountConfig | null;
}

const BankAccountForm: React.FC<BankAccountFormProps> = ({ onClose, onSave, initialData }) => {
    const [account, setAccount] = useState<Omit<BankAccountConfig, 'id'>>({
        name: '',
        balance: 0,
        smsSamples: [],
    });

    useEffect(() => {
        if (initialData) {
            setAccount(initialData);
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        if (name === 'smsSamples') {
            setAccount(prev => ({ ...prev, smsSamples: value.split(',').map(k => k.trim()).filter(Boolean) }));
        } else {
            setAccount(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(account, initialData?.id);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">{initialData ? 'تعديل الحساب' : 'إضافة حساب بنكي'}</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XMarkIcon /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                         <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-600 mb-1">اسم الحساب</label>
                            <input type="text" name="name" value={account.name} onChange={handleChange} className="w-full p-2" required />
                        </div>
                        <div>
                            <label htmlFor="balance" className="block text-sm font-medium text-slate-600 mb-1">الرصيد الافتتاحي</label>
                            <input type="number" name="balance" value={account.balance} onChange={handleChange} className="w-full p-2" required step="10" />
                        </div>
                        <div>
                            <label htmlFor="smsSamples" className="block text-sm font-medium text-slate-600 mb-1">الكلمات المفتاحية للرسائل (افصل بفواصل)</label>
                            <input 
                                type="text" 
                                name="smsSamples" 
                                value={account.smsSamples?.join(', ') || ''} 
                                onChange={handleChange} 
                                className="w-full p-2" 
                                placeholder="مثال: Alrajhi, الراجحي, مدى"
                            />
                            <p className="text-xs text-slate-500 mt-1">كلمات فريدة من رسائل البنك للمساعدة في التعرف التلقائي عند لصق نص رسالة.</p>
                        </div>
                        <button type="submit" className="w-full py-3 magical-button text-white font-semibold rounded-lg mt-6">{initialData ? 'حفظ التعديلات' : 'إضافة الحساب'}</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BankAccountForm;
