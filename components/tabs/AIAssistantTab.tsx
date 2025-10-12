
import React, { useState, useRef, useEffect } from 'react';
import { Message, FinancialCalculations } from '../../types';
import { analyzeFinancialData } from '../../services/geminiService';
import { SendIcon } from '../common/Icons';

interface AIAssistantTabProps {
    calculations: FinancialCalculations,
    filteredTransactions: any,
}

const TypingIndicator: React.FC = () => (
  <div className="ai-bubble chat-bubble typing-indicator flex items-center space-x-1 p-3 self-start">
    <span className="block w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
    <span className="block w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
    <span className="block w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
  </div>
);

const AIAssistantTab: React.FC<AIAssistantTabProps> = ({ calculations, filteredTransactions }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: 'أهلاً بك! أنا مساعدك المالي الشامل. يمكنك أن تسألني أسئلة تفصيلية عن وضعك المالي، مثل "ما هو إجمالي ديوني؟" أو "هل إنفاقي هذا الشهر يتوافق مع أهدافي؟"', sender: 'ai' }
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
            const fullContext = {
                periodSummary: calculations,
                transactions: filteredTransactions
            };
            const aiResponseText = await analyzeFinancialData(query, fullContext);
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
            <div className="p-4 bg-gray-100 text-center flex-shrink-0"><h3 className="text-xl font-bold text-slate-900">🤖 المحلل المالي الذكي</h3><p className="text-sm text-slate-500">اسأل أي شيء عن بياناتك المالية للشهر المحدد</p></div>
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