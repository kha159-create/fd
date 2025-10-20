
import React, { useState, useRef, useEffect } from 'react';
import { Message, FinancialCalculations, Transaction } from '../../types';
import { analyzeCompleteFinancialData, smartSearchAssistant, analyzeFinancialPatterns } from '../../services/geminiService';
import { SendIcon } from '../common/Icons';
import { t } from '../../translations';

interface AIAssistantTabProps {
    calculations: FinancialCalculations,
    filteredTransactions: any,
    allTransactions: Transaction[],
    state: any,
    darkMode?: boolean;
    language?: 'ar' | 'en';
}

const TypingIndicator: React.FC = () => (
  <div className="ai-bubble chat-bubble typing-indicator flex items-center space-x-1 p-3 self-start">
    <span className="block w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
    <span className="block w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
    <span className="block w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
  </div>
);

const AIAssistantTab: React.FC<AIAssistantTabProps> = ({ calculations, filteredTransactions, allTransactions, state, darkMode = false, language = 'ar' }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: `مرحباً! أنا مساعدك الذكي 🤖✨

🔍 **يمكنني مساعدتك في:**
• تحليل بياناتك المالية عبر جميع الأشهر
• البحث عن أفضل العروض والأسعار في السعودية
• مقارنة الأسعار والمطاعم

💬 **اسألني مثلاً:**
• "كم صرفت هذا الشهر؟"
• "أين أفضل عروض في الرياض؟"
• "كم سعر الهاتف في سوق اليوم؟"

ماذا تريد أن تعرف؟ 😊`, sender: 'ai' }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatBoxRef.current?.scrollTo(0, chatBoxRef.current.scrollHeight);
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = userInput.trim();
        if (!query || isLoading) return;

        const newUserMessage: Message = { id: Date.now().toString(), text: query, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            let aiResponseText = '';
            
            // تحديد نوع الاستعلام والاستجابة المناسبة بطريقة ذكية
            const searchKeywords = ['أين', 'كم سعر', 'عروض', 'محل', 'مطعم', 'بنده', 'تميمي', 'كارفور', 'عروض', 'سعر', 'أفضل', 'تقييم', 'مطاعم', 'متاجر', 'عرض', 'أرخص', 'غالي', 'السوق', 'متجر', 'مطعم', 'مقهى', 'كوفي', 'برجر', 'بيتزا', 'شاورما', 'دجاج', 'لحم', 'سمك', 'أكل', 'طعام', 'شراب', 'مشروب', 'قهوة', 'شاي'];
            const financialKeywords = ['مصروف', 'دخل', 'ديون', 'بطاقة', 'شهر', 'تحليل', 'نمط', 'إنفاق', 'رصيد', 'قرض', 'قسط', 'استثمار', 'مالي', 'حساب', 'صرفت', 'وصل', 'تحويل', 'دفع', 'قسط', 'باقي', 'متوسط', 'إجمالي', 'شهر', 'أسبوع', 'سنة', 'مقارنة', 'تغير', 'زيادة', 'نقص', 'أعلى', 'أقل'];
            
            const isSearchQuery = searchKeywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()));
            const isFinancialQuery = financialKeywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()));
            
            if (isSearchQuery) {
                // استخدام البحث الذكي للمنتجات والعروض
                aiResponseText = await smartSearchAssistant(query);
            } else if (isFinancialQuery) {
                // استخدام التحليل الشامل للبيانات المالية
                const completeData = {
                    currentPeriod: {
                        calculations: calculations,
                        transactions: filteredTransactions
                    },
                    allHistoricalData: {
                        allTransactions: allTransactions,
                        categories: state.categories,
                        cards: state.cards,
                        bankAccounts: state.bankAccounts,
                        loans: state.loans,
                        installments: state.installments,
                        investments: state.investments
                    },
                    state: state
                };
                aiResponseText = await analyzeCompleteFinancialData(query, completeData);
            } else {
                // استخدام التحليل المتقدم للأنماط
                aiResponseText = await analyzeFinancialPatterns(query, allTransactions, calculations);
            }
            
            const newAiMessage: Message = { id: (Date.now() + 1).toString(), text: aiResponseText, sender: 'ai' };
            setMessages(prev => [...prev, newAiMessage]);
        } catch (error) {
            const errorMessage: Message = { id: (Date.now() + 1).toString(), text: error instanceof Error ? error.message : 'عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.', sender: 'ai' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="glass-card overflow-hidden flex flex-col" style={{ height: '70vh' }}>
            <div className={`p-4 ${darkMode ? 'bg-slate-800' : 'bg-gray-100'} text-center flex-shrink-0`}>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>🤖 المحلل الذكي</h3>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>تحليل بياناتك المالية + البحث عن أفضل العروض في السعودية</p>
            </div>
            <div ref={chatBoxRef} className="p-4 flex-grow overflow-y-auto flex flex-col gap-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                       <p dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
                    </div>
                ))}
                {isLoading && <TypingIndicator />}
            </div>
            <div className="p-4 border-t border-gray-200 flex-shrink-0">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} className="w-full p-3" placeholder="اكتب سؤالك هنا..." required autoComplete="off" disabled={isLoading} />
                    <button type="submit" disabled={isLoading} className="p-3 magical-button text-white rounded-lg flex-shrink-0 disabled:opacity-50">
                       <SendIcon />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIAssistantTab;