

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppState, Tab, Transaction, FinancialCalculations, Category, CardConfig, BankAccountConfig, InstallmentPlan } from './types';
import { getInitialState } from './constants';
import { initializeAi } from './services/geminiService';
import { initializeFirebase, firebaseService } from './services/firebaseService';
import AuthForm from './components/auth/AuthForm';
import UserProfile from './components/auth/UserProfile';

import Header from './components/layout/Header';
import TabsComponent from './components/layout/Tabs';
import SkeletonDashboard from './components/layout/SkeletonDashboard';
import DashboardTab from './components/tabs/DashboardTab';
import TransactionsTab from './components/tabs/TransactionsTab';
import AIAssistantTab from './components/tabs/AIAssistantTab';
import AnalysisTab from './components/tabs/AnalysisTab';
import BudgetTab from './components/tabs/BudgetTab';
import InvestmentTab from './components/tabs/InvestmentTab';
import CardsTab from './components/tabs/CardsTab';
import BankTab from './components/tabs/BankTab';
import InstallmentsTab from './components/tabs/InstallmentsTab';
import SettingsTab from './components/tabs/SettingsTab';
import TransactionForm from './components/forms/TransactionForm';
import CardForm from './components/forms/CardForm';
import BankAccountForm from './components/forms/BankAccountForm';
import { XMarkIcon } from './components/common/Icons';


const App: React.FC = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [state, setState] = useState<AppState>(getInitialState);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<'all' | number>(new Date().getMonth() + 1);
    const [activeTab, setActiveTab] = useState<Tab>('summary');
    const [loadingState, setLoadingState] = useState({ isLoading: false, text: '' });
    const [modalConfig, setModalConfig] = useState<any>(null);
    const [transactionForm, setTransactionForm] = useState<{ isOpen: boolean; initialData?: Transaction | null }>({ isOpen: false });
    const [cardForm, setCardForm] = useState<{ isOpen: boolean; initialData?: CardConfig | null }>({ isOpen: false });
    const [bankAccountForm, setBankAccountForm] = useState<{ isOpen: boolean; initialData?: BankAccountConfig | null }>({ isOpen: false });
    
    // نظام المصادقة
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showAuthForm, setShowAuthForm] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // تهيئة الخدمات والتحقق من المصادقة
    useEffect(() => {
        const initializeApp = async () => {
            // تهيئة الخدمات
            initializeAi();
            initializeFirebase();
            
            // التحقق من المستخدم المسجل
            try {
                const user = await firebaseService.getCurrentUser();
                if (user) {
                    setCurrentUser(user);
                    await loadUserData(user.uid);
                } else {
                    // إذا لم يكن هناك مستخدم، استخدم البيانات المحلية
                    await loadLocalData();
                }
            } catch (error) {
                console.error('خطأ في التحقق من المصادقة:', error);
                await loadLocalData();
            } finally {
                setIsCheckingAuth(false);
                setIsInitialized(true);
            }
        };
        
        initializeApp();
    }, []);

    const loadUserData = async (userId: string) => {
        try {
            const result = await firebaseService.getData('users', userId);
            if (result.success && result.data) {
                const initialState = getInitialState();
                const mergedState = {
                    ...initialState,
                    ...result.data,
                    cards: { ...initialState.cards, ...(result.data.cards || {}) },
                    bankAccounts: { ...initialState.bankAccounts, ...(result.data.bankAccounts || {}) },
                    investments: { ...initialState.investments, ...(result.data.investments || {}) },
                };
                setState(mergedState);
                console.log('✅ تم تحميل بيانات المستخدم من Firebase');
            }
        } catch (error) {
            console.error('خطأ في تحميل بيانات المستخدم:', error);
        }
    };

    const loadLocalData = async () => {
        try {
            const savedState = localStorage.getItem('financial_dashboard_state');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                const initialState = getInitialState();
                const mergedState = {
                    ...initialState,
                    ...parsedState,
                    cards: { ...initialState.cards, ...(parsedState.cards || {}) },
                    bankAccounts: { ...initialState.bankAccounts, ...(parsedState.bankAccounts || {}) },
                    investments: { ...initialState.investments, ...(parsedState.investments || {}) },
                };
                setState(mergedState);
                console.log('✅ تم تحميل البيانات من localStorage');
            }
        } catch (error) {
            console.error('خطأ في تحميل البيانات المحلية:', error);
        }
    };

    useEffect(() => {
        if (isInitialized && !isCheckingAuth) {
            // حفظ في localStorage دائماً
            localStorage.setItem('financial_dashboard_state', JSON.stringify(state));
            
            // حفظ في Firebase إذا كان المستخدم مسجل
            if (currentUser) {
                const saveToFirebase = async () => {
                    try {
                        const result = await firebaseService.saveData('users', currentUser.uid, state);
                        if (result.success) {
                            console.log('✅ تم حفظ البيانات في Firebase');
                        } else {
                            console.warn('⚠️ فشل في حفظ البيانات في Firebase:', result.error);
                        }
                    } catch (error) {
                        console.error('❌ خطأ في حفظ البيانات في Firebase:', error);
                    }
                };
                
                // تأخير 2 ثانية قبل الحفظ لتجنب الحفظ المتكرر
                const timeoutId = setTimeout(saveToFirebase, 2000);
                return () => clearTimeout(timeoutId);
            }
        }
    }, [state, isInitialized, currentUser, isCheckingAuth]);
    
    const setLoading = (isLoading: boolean, text: string = '') => setLoadingState({ isLoading, text });

    const getFilteredTransactions = useCallback(() => {
        if (!state.transactions) return [];
        return state.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const yearMatch = transactionDate.getFullYear() === selectedYear;
            const monthMatch = selectedMonth === 'all' || (transactionDate.getMonth() + 1) === selectedMonth;
            return yearMatch && monthMatch;
        });
    }, [state.transactions, selectedYear, selectedMonth]);
    
    const filteredTransactions = useMemo(() => getFilteredTransactions(), [getFilteredTransactions]);

    const calculations = useMemo<FinancialCalculations>(() => {
        const expensesByCategory: { [key: string]: number } = {};
        const cardPayments: { [key: string]: number } = {};
        const cardDetails: { [key: string]: any } = {};
        const bankAccountDetails: { [key: string]: any } = {};

        // Initialize details objects
        if (state.cards && typeof state.cards === 'object') {
            Object.values(state.cards).forEach((card: any) => {
                if (card && card.id) {
                    cardDetails[card.id] = { ...card, balance: 0, available: card.limit, usagePercentage: 0 };
                }
            });
        }
        if (state.bankAccounts && typeof state.bankAccounts === 'object') {
            Object.values(state.bankAccounts).forEach((account: any) => {
                if (account && account.id) {
                    bankAccountDetails[account.id] = { ...account, deposits: 0, withdrawals: 0 };
                }
            });
        }

        let totalIncome = 0;
        let totalExpenses = 0;
        let totalInvestmentDeposits = 0;
        let totalInvestmentWithdrawals = 0;

        filteredTransactions.forEach(t => {
            if (t.type === 'income') {
                totalIncome += t.amount;
            } else if (t.type === 'expense') {
                totalExpenses += t.amount;
                if (t.categoryId) {
                    expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + t.amount;
                }
            } else if (t.type === 'bnpl-payment') {
                // BNPL payments are expenses but don't count toward main expense total if they're installment payments
                if (!t.isInstallmentPayment) {
                    totalExpenses += t.amount;
                }
                if (t.categoryId) {
                    expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + t.amount;
                }
            } else if (t.type === 'investment-deposit') {
                totalInvestmentDeposits += t.amount;
                totalExpenses += t.amount;
            } else if (t.type === 'investment-withdrawal') {
                totalInvestmentWithdrawals += t.amount;
                totalIncome += t.amount;
            } else if (t.type.endsWith('-payment')) {
                 const cardId = t.type.replace('-payment', '');
                 if (cardPayments[cardId]) {
                    cardPayments[cardId] += t.amount;
                 } else {
                    cardPayments[cardId] = t.amount;
                 }
            }
        });
        
        // Calculate card balances based on ALL transactions, not just filtered ones
        Object.keys(state.cards).forEach(cardId => {
             const cardExpenses = state.transactions.filter(t => t.paymentMethod === cardId && (t.type === 'expense' || (t.type === 'bnpl-payment' && !t.isInstallmentPayment))).reduce((sum, t) => sum + t.amount, 0);
             const cardPaymentsTotal = state.transactions.filter(t => t.type === `${cardId}-payment`).reduce((sum, t) => sum + t.amount, 0);
             const balance = cardExpenses - cardPaymentsTotal;
             cardDetails[cardId].balance = balance;
             cardDetails[cardId].available = cardDetails[cardId].limit - balance;
             cardDetails[cardId].usagePercentage = cardDetails[cardId].limit > 0 ? (balance / cardDetails[cardId].limit) * 100 : 0;
        });

        // Calculate bank balances and period deposits/withdrawals
        Object.keys(state.bankAccounts).forEach(accountId => {
            const account = state.bankAccounts[accountId];
            let currentBalance = account.balance;
            let deposits = 0;
            let withdrawals = 0;
            
            // This is a simplified balance calculation; a real app would use all transactions to calculate the final balance.
            // For this app, we will rely on the configured starting balance + period transactions.
            
            filteredTransactions.forEach(t => {
                if (t.paymentMethod === accountId) {
                    if (['income', 'investment-withdrawal'].includes(t.type)) {
                        deposits += t.amount;
                    } else {
                        withdrawals += t.amount;
                    }
                }
                // Card payments also affect bank balance (they are withdrawals from bank)
                if (t.type.endsWith('-payment') && t.paymentMethod === accountId) {
                    withdrawals += t.amount;
                }
                // BNPL first payments also affect bank balance if paid from bank
                if (t.type === 'bnpl-payment' && t.isInstallmentPayment && t.paymentMethod === accountId) {
                    withdrawals += t.amount;
                }
            });
            bankAccountDetails[accountId].balance = currentBalance; // Use the configured balance
            bankAccountDetails[accountId].deposits = deposits;
            bankAccountDetails[accountId].withdrawals = withdrawals;
        });

        const totalDebt = Object.values(cardDetails).reduce((sum, card) => sum + card.balance, 0);
        const totalAvailable = Object.values(cardDetails).reduce((sum, card) => sum + card.available, 0);
        const totalLimits = Object.values(cardDetails).reduce((sum, card) => sum + card.limit, 0);
        const totalBankBalance = Object.values(bankAccountDetails).reduce((sum, acc) => sum + acc.balance, 0);
        
        return { totalIncome, totalExpenses, cardDetails, cardPayments, bankAccountDetails, totalDebt, totalAvailable, totalLimits, totalBankBalance, totalInvestmentDeposits, totalInvestmentWithdrawals, expensesByCategory };
    }, [filteredTransactions, state.transactions, state.cards, state.bankAccounts]);

    const handleSaveTransaction = (transaction: Omit<Transaction, 'id'>, id?: string) => {
        setState(prev => {
            if (id) {
                // Update existing transaction
                const newTransactions = prev.transactions.map(t => 
                    t.id === id ? { ...t, ...transaction } : t
                );
                return { ...prev, transactions: newTransactions };
            } else {
                // Handle BNPL transactions
                if (transaction.bnplData && transaction.paymentMethod.includes('bnpl')) {
                    // Create installment plan
                    const installmentPlan: InstallmentPlan = {
                        id: `installment-${Date.now()}`,
                        provider: transaction.paymentMethod as 'tabby-bnpl' | 'tamara-bnpl',
                        description: transaction.description,
                        totalAmount: transaction.amount,
                        installmentAmount: transaction.bnplData.installmentAmount,
                        total: transaction.bnplData.installmentsCount,
                        paid: 1, // First payment is paid immediately
                        createdAt: transaction.date
                    };

                    // Create first payment transaction
                    const firstPaymentTransaction: Transaction = {
                        id: `trans-${Date.now()}-1`,
                        amount: transaction.bnplData.installmentAmount,
                        date: transaction.date,
                        description: `الدفعة الأولى لـ: ${transaction.description}`,
                        paymentMethod: transaction.bnplData.initialPaymentSource as PaymentMethod,
                        type: 'bnpl-payment',
                        categoryId: transaction.categoryId,
                        isInstallmentPayment: true,
                        installmentId: installmentPlan.id
                    };

                    // Create main BNPL transaction
                    const bnplTransaction: Transaction = {
                        id: `trans-${Date.now()}`,
                        ...transaction,
                        type: 'expense' // Main transaction is always expense
                    };

                    return {
                        ...prev,
                        transactions: [...prev.transactions, firstPaymentTransaction, bnplTransaction],
                        installments: [...prev.installments, installmentPlan]
                    };
                } else {
                    // Add regular transaction
                    const newTransaction: Transaction = {
                        id: `trans-${Date.now()}`,
                        ...transaction
                    };
                    return { ...prev, transactions: [...prev.transactions, newTransaction] };
                }
            }
        });
        setTransactionForm({ isOpen: false });
    };

    const handleDeleteTransaction = (id: string) => {
        setModalConfig({
            title: 'تأكيد الحذف',
            body: '<p>هل أنت متأكد من رغبتك في حذف هذه الحركة؟ لا يمكن التراجع عن هذا الإجراء.</p>',
            confirmText: 'نعم, حذف',
            onConfirm: () => {
                setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
                setModalConfig(null);
            }
        });
    };

    const handleEditTransaction = (id: string) => {
        const transaction = state.transactions.find(t => t.id === id);
        if (transaction) {
            setTransactionForm({ isOpen: true, initialData: transaction });
        }
    };

    // دوال المصادقة
    const handleAuthSuccess = async (user: any) => {
        setCurrentUser(user);
        setShowAuthForm(false);
        await loadUserData(user.uid);
    };

    const handleSignOut = () => {
        setCurrentUser(null);
        // تحميل البيانات المحلية بعد تسجيل الخروج
        loadLocalData();
    };

    
    
    const handleSaveCard = (card: Omit<CardConfig, 'id'>, id?: string) => {
        setState(prev => {
            const newCards = { ...prev.cards };
            if (id) {
                newCards[id] = { ...newCards[id], ...card, id };
            } else {
                const newId = `card-${Date.now()}`;
                newCards[newId] = { ...card, id: newId };
            }
            return { ...prev, cards: newCards };
        });
        setCardForm({ isOpen: false });
    };

    const handleDeleteCard = (id: string) => {
        if (state.transactions.some(t => t.paymentMethod === id || t.type === `${id}-payment`)) {
            setModalConfig({
                title: 'لا يمكن الحذف',
                body: '<p>لا يمكن حذف هذه البطاقة لأنها مستخدمة في بعض الحركات. يرجى تعديل الحركات أولاً.</p>',
                hideCancel: true,
                confirmText: 'موافق'
            });
        } else {
             setModalConfig({
                title: 'تأكيد الحذف',
                body: `<p>هل أنت متأكد من رغبتك في حذف بطاقة "${state.cards[id]?.name}"؟</p>`,
                confirmText: 'نعم, حذف',
                onConfirm: () => {
                    setState(prev => {
                        const newCards = { ...prev.cards };
                        delete newCards[id];
                        return { ...prev, cards: newCards };
                    });
                    setModalConfig(null);
                }
            });
        }
    };

    const handleSaveBankAccount = (account: Omit<BankAccountConfig, 'id'>, id?: string) => {
        setState(prev => {
            const newBankAccounts = { ...prev.bankAccounts };
            if (id) {
                newBankAccounts[id] = { ...newBankAccounts[id], ...account, id };
            } else {
                const newId = `bank-${Date.now()}`;
                newBankAccounts[newId] = { ...account, id: newId };
            }
            return { ...prev, bankAccounts: newBankAccounts };
        });
        setBankAccountForm({ isOpen: false });
    };

    const handleDeleteBankAccount = (id: string) => {
        if (state.transactions.some(t => t.paymentMethod === id)) {
            setModalConfig({
                title: 'لا يمكن الحذف',
                body: '<p>لا يمكن حذف هذا الحساب لأنه مستخدم في بعض الحركات. يرجى تعديل الحركات أولاً.</p>',
                hideCancel: true,
                confirmText: 'موافق'
            });
        } else {
            setModalConfig({
                title: 'تأكيد الحذف',
                body: `<p>هل أنت متأكد من رغبتك في حذف حساب "${state.bankAccounts[id]?.name}"؟</p>`,
                confirmText: 'نعم, حذف',
                onConfirm: () => {
                    setState(prev => {
                        const newBankAccounts = { ...prev.bankAccounts };
                        delete newBankAccounts[id];
                        return { ...prev, bankAccounts: newBankAccounts };
                    });
                    setModalConfig(null);
                }
            });
        }
    };

    const handleRestore = (restoredState: any) => {
        setModalConfig({
            title: "استعادة نسخة احتياطية",
            body: "<p>هل أنت متأكد من استعادة هذه البيانات؟ سيتم استبدال جميع البيانات الحالية.</p>",
            confirmText: "استعادة",
            cancelText: "إلغاء",
            onConfirm: () => {
                try {
                    // Use the exact same logic as the old system
                    const initialState = getInitialState();

                    // Handle old backup format - convert creditCards to cards format
                    if (restoredState.creditCards && !restoredState.cards) {
                        // Convert old creditCards format to new cards format
                        const convertedCards: { [key: string]: any } = {};
                        Object.entries(restoredState.creditCards).forEach(([key, card]: [string, any]) => {
                            convertedCards[key] = {
                                id: key,
                                name: key.toUpperCase(),
                                limit: card.creditLimit || 0,
                                balance: card.currentBalance || 0,
                                dueDay: card.dueDay || 1,
                                smsSamples: [],
                                keywords: []
                            };
                        });
                        restoredState.cards = convertedCards;
                    }

                    // Handle old backup format - convert old cards format to new format
                    if (restoredState.cards && typeof restoredState.cards === 'object' && (restoredState.cards.snb || restoredState.cards.enbd)) {
                        // Convert old cards format to new format
                        const newFormatCards: { [key: string]: any } = {};
                        if (restoredState.cards.snb) {
                            newFormatCards['snb-card'] = {
                                id: 'snb-card',
                                name: 'SNB الأهلي',
                                limit: restoredState.cards.snb.limit || 0,
                                dueDay: restoredState.cards.snb.dueDay || 1,
                                statementDay: 25,
                                smsSamples: ['SNB', 'الأهلي', 'إئتمانية']
                            };
                        }
                        if (restoredState.cards.enbd) {
                            newFormatCards['enbd-card'] = {
                                id: 'enbd-card',
                                name: 'ENBD الإمارات',
                                limit: restoredState.cards.enbd.limit || 0,
                                dueDay: restoredState.cards.enbd.dueDay || 1,
                                statementDay: 28,
                                smsSamples: ['ENBD', 'الإمارات', 'Visa card']
                            };
                        }
                        restoredState.cards = newFormatCards;
                    }

                    // Handle old backup format - convert bank to bankAccounts format
                    if (restoredState.bank && !restoredState.bankAccounts) {
                        // Convert old bank format to new bankAccounts format
                        restoredState.bankAccounts = {
                            'bank-default': {
                                id: 'bank-default',
                                name: 'حساب البنك',
                                balance: restoredState.bank.balance || 0,
                                smsSamples: ['مدى', 'mada', 'Alrajhi', 'الراجحي', 'Inma', 'الإنماء', 'بنك']
                            }
                        };
                    }

                    // Convert old mada-bank references to bank-default in transactions
                    if (restoredState.transactions && Array.isArray(restoredState.transactions)) {
                        restoredState.transactions = restoredState.transactions.map((transaction: any) => {
                            if (transaction.paymentMethod === 'mada-bank') {
                                return { ...transaction, paymentMethod: 'bank-default' };
                            }
                            return transaction;
                        });
                    }

                    // Use exact same merge logic as old system: state = { ...getInitialState(), ...restoredState }
                    const validatedState = {
                        ...initialState,
                        ...restoredState
                    };
                    
                    setState(validatedState);
                    
                    // حفظ البيانات في Firebase بعد الاستعادة (إذا كان المستخدم مسجل)
                    if (currentUser) {
                        const saveToFirebase = async () => {
                            try {
                                const result = await firebaseService.saveData('users', currentUser.uid, validatedState);
                                if (result.success) {
                                    console.log('✅ تم حفظ البيانات المستعادة في Firebase');
                                } else {
                                    console.warn('⚠️ فشل في حفظ البيانات في Firebase:', result.error);
                                }
                            } catch (error) {
                                console.error('❌ خطأ في حفظ البيانات في Firebase:', error);
                            }
                        };
                        
                        saveToFirebase();
                    }
                    
                    setModalConfig({ 
                        title: "تم الاستعادة بنجاح", 
                        body: "<p>تم استعادة بياناتك بنجاح وحفظها في السحابة.</p>",
                        confirmText: 'موافق',
                        hideCancel: true
                    });
                } catch (error) {
                    setModalConfig({
                        title: "خطأ في الاستعادة",
                        body: "<p>حدث خطأ أثناء استعادة البيانات. يرجى المحاولة مرة أخرى.</p>",
                        confirmText: 'موافق',
                        hideCancel: true
                    });
                }
            }
        });
    };
    
    const openCardFormModal = (cardId?: string) => setCardForm({ isOpen: true, initialData: cardId ? state.cards[cardId] : null });
    const openBankAccountFormModal = (accountId?: string) => setBankAccountForm({ isOpen: true, initialData: accountId ? state.bankAccounts[accountId] : null });


    if (!isInitialized || isCheckingAuth) {
        return <SkeletonDashboard />;
    }

    // إذا لم يكن المستخدم مسجل دخول، اعرض نموذج المصادقة فقط
    if (!currentUser) {
        return (
            <div className="bg-slate-100 min-h-screen font-sans flex items-center justify-center">
                <div className="w-full max-w-md px-4">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">💰</div>
                        <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم المالية</h1>
                        <p className="text-slate-600 mt-2">قم بتسجيل الدخول للوصول لنظام إدارة المصاريف</p>
                    </div>
                    
                    <AuthForm 
                        onSuccess={handleAuthSuccess}
                        onClose={() => {}}
                        hideCloseButton={true}
                    />
                </div>
            </div>
        );
    }

    const selectedPeriodText = `${selectedYear} - ${selectedMonth === 'all' ? 'كل الشهور' : new Date(selectedYear, selectedMonth - 1).toLocaleString('ar-SA', { month: 'long' })}`;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'summary': return <DashboardTab calculations={calculations} categories={state.categories} />;
            case 'transactions': return <TransactionsTab transactions={filteredTransactions} allTransactions={state.transactions} categories={state.categories} deleteTransaction={handleDeleteTransaction} editTransaction={handleEditTransaction} state={state} />;
            case 'ai-assistant': return <AIAssistantTab calculations={calculations} filteredTransactions={filteredTransactions} />;
            case 'analysis': return <AnalysisTab calculations={calculations} categories={state.categories} allTransactions={state.transactions} />;
            case 'budget': return <BudgetTab state={state} setLoading={setLoading} setModal={setModalConfig} />;
            case 'investment': return <InvestmentTab state={state} setState={setState} calculations={calculations} setModal={setModalConfig} />;
            case 'cards': return <CardsTab state={state} openCardFormModal={openCardFormModal} deleteCard={handleDeleteCard} />;
            case 'bank': return <BankTab state={state} setState={setState} calculations={calculations} filteredTransactions={filteredTransactions} categories={state.categories} setModal={setModalConfig} openBankAccountFormModal={openBankAccountFormModal} deleteBankAccount={handleDeleteBankAccount} />;
            case 'installments': return <InstallmentsTab state={state} setState={setState} filteredTransactions={filteredTransactions} setModal={setModalConfig} />;
            case 'settings': return <SettingsTab state={state} setState={setState} setModal={setModalConfig} setLoading={setLoading} onRestore={handleRestore} />;
            default: return <div>Tab not found</div>;
        }
    };

    return (
        <div className="bg-slate-100 min-h-screen font-sans">
            <Header
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onYearChange={setSelectedYear}
                onMonthChange={val => setSelectedMonth(val)}
                onAddTransaction={() => setTransactionForm({ isOpen: true })}
                currentUser={currentUser}
                onSignOut={handleSignOut}
            />
            <main className="container mx-auto px-2 sm:px-4 max-w-7xl mt-8 mb-20">
                <TabsComponent activeTab={activeTab} setActiveTab={setActiveTab} />
                {renderTabContent()}
            </main>

            {/* Floating Add Button for Mobile */}
            <button onClick={() => setTransactionForm({ isOpen: true })} className="md:hidden fixed bottom-24 right-4 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-40 text-2xl">+</button>

            {/* Transaction Form Modal */}
            {transactionForm.isOpen && (
                <TransactionForm
                    onClose={() => setTransactionForm({ isOpen: false })}
                    onSave={handleSaveTransaction}
                    initialData={transactionForm.initialData}
                    categories={state.categories}
                    cards={state.cards}
                    bankAccounts={state.bankAccounts}
                />
            )}

            {/* Card Form Modal */}
            {cardForm.isOpen && (
                <CardForm
                    onClose={() => setCardForm({ isOpen: false })}
                    onSave={handleSaveCard}
                    initialData={cardForm.initialData}
                />
            )}

            {/* Bank Account Form Modal */}
            {bankAccountForm.isOpen && (
                <BankAccountForm
                    onClose={() => setBankAccountForm({ isOpen: false })}
                    onSave={handleSaveBankAccount}
                    initialData={bankAccountForm.initialData}
                />
            )}


            {/* Generic Modal */}
            {modalConfig && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setModalConfig(null)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">{modalConfig.title}</h3>
                        <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: modalConfig.body }}></div>
                        <div className="flex justify-end gap-3 mt-6">
                            {!modalConfig.hideCancel && <button onClick={() => setModalConfig(null)} className="px-4 py-2 bg-slate-200 rounded-lg">إلغاء</button>}
                            <button onClick={() => { if (!modalConfig.onConfirm || modalConfig.onConfirm() !== false) setModalConfig(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{modalConfig.confirmText || 'موافق'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {loadingState.isLoading && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <p className="text-white mt-4">{loadingState.text || 'جاري التحميل...'}</p>
                </div>
            )}

            {/* Auth Form Modal (only for logged-in users) */}
            {showAuthForm && currentUser && (
                <AuthForm 
                    onSuccess={handleAuthSuccess}
                    onClose={() => setShowAuthForm(false)}
                />
            )}
        </div>
    );
};

export default App;