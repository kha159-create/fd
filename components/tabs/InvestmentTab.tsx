import React, { useState, useRef, useEffect } from 'react';
import { AppState, FinancialCalculations, Message, Transaction, TransactionType, BankAccountConfig } from '../../types';
import { advancedInvestmentAdvice, analyzeMarketAndPortfolio } from '../../services/geminiService';
import { SendIcon } from '../common/Icons';
import { formatCurrency } from '../../utils/formatting';
import { t } from '../../translations';

interface InvestmentTabProps {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    calculations: FinancialCalculations;
    setModal: (config: any) => void;
    darkMode?: boolean;
    language?: 'ar' | 'en';
}

const InvestmentTab: React.FC<InvestmentTabProps> = ({ state, setState, calculations, setModal, darkMode = false, language = 'ar' }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: `مرحباً! أنا مستشارك الاستثماري الذكي 🎯📈

💼 **خبرتي تشمل:**
• تحليل شامل لسوق تداول السعودي
• استراتيجيات استثمارية متقدمة
• إدارة المخاطر وتحسين المحافظ
• توصيات أسهم محددة مع تحليل عميق

📊 **يمكنني مساعدتك في:**
• تحليل محفظتك الحالية وتحسينها
• توصيات أسهم مع أهداف سعرية واضحة
• قراءة السوق وتوقعات الاتجاهات
• استراتيجيات دخول وخروج محددة

💡 **اسألني مثلاً:**
• "ما رأيك في أسهم أرامكو الآن؟"
• "كيف أحسن محفظتي الاستثمارية؟"
• "ما هي أفضل القطاعات للاستثمار؟"
• "أريد تحليل شامل لسوق اليوم"

أخبرني عن محفظتك وأهدافك الاستثمارية! 🚀`, sender: 'ai' }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBoxRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        chatBoxRef.current?.scrollTo(0, chatBoxRef.current.scrollHeight);
    }, [messages, isLoading]);

    const handleInvestmentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const amount = parseFloat((form.elements.namedItem('investment-amount') as HTMLInputElement).value);
        const type = (form.elements.namedItem('investment-type') as HTMLSelectElement).value;
        const paymentMethod = (form.elements.namedItem('payment-method') as HTMLSelectElement).value;

        if (isNaN(amount) || amount <= 0) {
            setModal({ title: "خطأ", body: "<p>الرجاء إدخال مبلغ صحيح.</p>" });
            return;
        }
        
        const newTransaction: Omit<Transaction, 'id'> = {
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            description: type === 'deposit' ? 'إيداع في المحفظة الاستثمارية' : 'سحب من المحفظة الاستثمارية',
            paymentMethod: paymentMethod,
            type: (type === 'deposit' ? 'investment-deposit' : 'investment-withdrawal'),
            categoryId: null
        };

        setState(prev => ({ ...prev, transactions: [...prev.transactions, { ...newTransaction, id: `trans-${Date.now()}` }] }));
        form.reset();
    };
    
    const handleAIChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = userInput.trim();
        if (!query || isLoading) return;

        setMessages(prev => [...prev, { id: Date.now().toString(), text: query, sender: 'user' }]);
        setUserInput('');
        setIsLoading(true);

        try {
            // تحضير بيانات المحفظة الحالية للتحليل
            const currentPortfolio = {
                currentValue: state.investments.currentValue,
                totalDeposited: state.investments.totalDeposited,
                totalWithdrawn: state.investments.totalWithdrawn,
                transactions: state.transactions.filter(t => t.type === 'investment-deposit' || t.type === 'investment-withdrawal'),
                recentPerformance: calculations.investments
            };

            // استخدام المستشار الاستثماري المتقدم
            const aiResponseText = await advancedInvestmentAdvice(query, currentPortfolio, {
                marketDate: new Date().toLocaleDateString('en-CA'),
                saudiMarketContext: 'Tadawul analysis requested',
                userInvestmentHistory: currentPortfolio
            });
            
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: aiResponseText, sender: 'ai' }]);
        } catch (error) {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: error instanceof Error ? error.message : 'عذراً، حدث خطأ في الاستشارة الاستثمارية.', sender: 'ai' }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const openUpdateValueModal = () => {
        const body = `<div><label class="block text-sm font-medium text-slate-600 mb-1">القيمة الحالية للمحفظة (ريال)</label><input type="number" id="edit-investment-value" class="w-full p-2" value="${state.investments.currentValue}"><p class="text-xs text-slate-500 mt-2">أدخل القيمة السوقية الحالية لجميع استثماراتك.</p></div>`;
        setModal({
            show: true, title: 'تحديث قيمة المحفظة', body, confirmText: 'حفظ',
            onConfirm: () => {
                const newValue = parseFloat((document.getElementById('edit-investment-value') as HTMLInputElement).value);
                if (isNaN(newValue) || newValue < 0) {
                    alert("الرجاء إدخال قيمة صحيحة.");
                    return false;
                }
                setState(prev => ({ ...prev, investments: { ...prev.investments, currentValue: newValue } }));
            }
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-1 space-y-6">
                <div className="glass-card p-6 text-center">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">💰 القيمة الحالية للمحفظة</h3>
                    <p className="text-4xl font-bold text-emerald-500 number-display">{formatCurrency(state.investments.currentValue)}</p>
                    <p className="text-sm text-slate-500 mt-2">إجمالي المستثمر: <span className="font-semibold number-display text-slate-600">{formatCurrency(calculations.totalInvestmentDeposits)}</span></p>
                    <button onClick={openUpdateValueModal} className="mt-4 w-full px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors text-sm">✏️ تحديث القيمة الحالية</button>
                </div>
                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">💸 إضافة حركة استثمارية</h3>
                    <form onSubmit={handleInvestmentSubmit} className="space-y-4">
                        <div><label htmlFor="investment-amount" className="block text-sm font-medium text-slate-600">المبلغ</label><input type="number" id="investment-amount" name="investment-amount" className="mt-1 w-full p-2" required /></div>
                        <div><label htmlFor="investment-type" className="block text-sm font-medium text-slate-600">نوع الحركة</label><select id="investment-type" name="investment-type" className="mt-1 w-full p-2"><option value="deposit">إيداع للمحفظة</option><option value="withdrawal">سحب من المحفظة</option></select></div>
                        {/* FIX: Explicitly type 'acc' as BankAccountConfig to prevent property access errors on 'unknown'. */}
                        <div><label htmlFor="payment-method" className="block text-sm font-medium text-slate-600">الحساب البنكي</label><select id="payment-method" name="payment-method" className="mt-1 w-full p-2">{Object.values(state.bankAccounts).map((acc: BankAccountConfig) => <option key={acc.id} value={acc.id}>🏦 {acc.name}</option>)}</select></div>
                        <button type="submit" className="w-full magical-button text-white font-semibold py-2 rounded-lg">تنفيذ الحركة</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 glass-card overflow-hidden flex flex-col" style={{ height: '75vh' }}>
                <div className={`p-4 ${darkMode ? 'bg-slate-800' : 'bg-gray-100'} text-center flex-shrink-0`}>
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>🎯 مستشارك الاستثماري المتقدم</h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>تحليل السوق + توصيات أسهم + إدارة المحافظ</p>
                </div>
                <div ref={chatBoxRef} className="p-4 flex-grow overflow-y-auto flex flex-col gap-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`} dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}></div>
                    ))}
                    {isLoading && <div className="ai-bubble chat-bubble typing-indicator flex items-center space-x-1 p-3 self-start"><span className="block w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span><span className="block w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span><span className="block w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span></div>}
                </div>
                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                    <form onSubmit={handleAIChatSubmit} className="flex gap-2">
                        <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} className="w-full p-3" placeholder="اسأل عن الاستثمار..." required autoComplete="off" disabled={isLoading} />
                        <button type="submit" className="p-3 magical-button text-white rounded-lg flex-shrink-0" disabled={isLoading}><SendIcon /></button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Helper to format currency, assuming it might not be available globally


export default InvestmentTab;