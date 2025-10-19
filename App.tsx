

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppState, Tab, Transaction, FinancialCalculations, Category, CardConfig, BankAccountConfig, InstallmentPlan, Loan } from './types';
import DarkModeToggle from './components/common/DarkModeToggle';
import NotificationManager from './components/common/NotificationManager';
import { t } from './translations';
import { getInitialState } from './constants';
import { initializeAi, getExchangeRate } from './services/geminiService';
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
import DebtsLoansTab from './components/tabs/DebtsLoansTab';
import SettingsTab from './components/tabs/SettingsTab';
import TransactionForm from './components/forms/TransactionForm';
import CardForm from './components/forms/CardForm';
import BankAccountForm from './components/forms/BankAccountForm';
import LoanForm from './components/forms/LoanForm';
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
    const [loanForm, setLoanForm] = useState<{ isOpen: boolean; initialData?: Loan | null }>({ isOpen: false });
    const [transferModal, setTransferModal] = useState<{ isOpen: boolean }>({ isOpen: false });
    const [transferData, setTransferData] = useState({
        fromAccount: '',
        toAccount: '',
        amount: 0,
        description: '',
        exchangeRate: 1
    });
    const [isLoadingExchangeRate, setIsLoadingExchangeRate] = useState(false);
    const [exchangeRateError, setExchangeRateError] = useState('');
    
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
            
            // الاستماع لتغييرات حالة المصادقة
            const unsubscribe = await firebaseService.onAuthStateChanged(async (user) => {
                try {
                    if (user) {
                        console.log('✅ تم تسجيل دخول المستخدم:', user.email);
                        setCurrentUser(user);
                        await loadUserData(user.uid);
                    } else {
                        console.log('❌ لا يوجد مستخدم مسجل دخول');
                        setCurrentUser(null);
                        await loadLocalData();
                    }
                } catch (error) {
                    console.error('خطأ في تحميل بيانات المستخدم:', error);
                    await loadLocalData();
                } finally {
                    setIsCheckingAuth(false);
                    setIsInitialized(true);
                }
            });
            
            // تنظيف الاشتراك عند إلغاء التحميل
            return () => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            };
        };
        
        initializeApp();
    }, []);

    // إدارة scroll الخلفية عند فتح النوافذ
    useEffect(() => {
        const isAnyModalOpen = transactionForm.isOpen || cardForm.isOpen || bankAccountForm.isOpen || loanForm.isOpen || transferModal.isOpen || modalConfig || loadingState.isLoading;
        
        if (isAnyModalOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }

        // تنظيف عند إلغاء المكون
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [transactionForm.isOpen, cardForm.isOpen, bankAccountForm.isOpen, loanForm.isOpen, transferModal.isOpen, modalConfig, loadingState.isLoading]);

    // إدارة الوضع المظلم واللغة
    useEffect(() => {
        // إدارة الوضع المظلم
        if (state.settings.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // إدارة اللغة والاتجاه
        const htmlElement = document.documentElement;
        if (state.settings.language === 'ar') {
            htmlElement.setAttribute('lang', 'ar');
            htmlElement.setAttribute('dir', 'rtl');
        } else {
            htmlElement.setAttribute('lang', 'en');
            htmlElement.setAttribute('dir', 'ltr');
        }
    }, [state.settings.darkMode, state.settings.language]);

    // تسجيل Service Worker للـ PWA
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered successfully:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }, []);

    // Auto-update exchange rate when accounts change
    useEffect(() => {
        if (transferModal.isOpen && transferData.fromAccount && transferData.toAccount && 
            state.bankAccounts[transferData.fromAccount]?.currency !== state.bankAccounts[transferData.toAccount]?.currency) {
            updateExchangeRate();
        }
    }, [transferData.fromAccount, transferData.toAccount, transferModal.isOpen]);

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
            } else if (!result.success) {
                console.warn('⚠️ فشل في تحميل بيانات المستخدم من Firebase:', result.error);
                
                // إذا كان الخطأ متعلق بالأذونات، اعرض رسالة تحذير
                if (result.error?.includes('الأذونات')) {
                    setModalConfig({
                        title: "تحذير - إعداد Firebase",
                        body: `<p>فشل في تحميل البيانات من السحابة. يرجى:</p>
                               <ul>
                                 <li>تأكد من تسجيل الدخول</li>
                                 <li>تحقق من إعداد قواعد Firestore</li>
                                 <li>راجع ملف FIREBASE_SETUP.md للإرشادات</li>
                               </ul>
                               <p>سيتم استخدام البيانات المحلية مؤقتاً.</p>`,
                        confirmText: 'موافق',
                        hideCancel: true
                    });
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل بيانات المستخدم:', error);
        }
    };

    const loadLocalData = async () => {
        try {
            // البحث عن جميع النسخ المحفوظة
            const possibleKeys = [
                'financial_dashboard_state',
                'financial_dashboard_backup_1',
                'financial_dashboard_backup_2'
            ];
            
            // إضافة النسخ اليومية (آخر 7 أيام)
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                possibleKeys.push(`financial_dashboard_${dateStr}`);
            }
            
            let savedState = null;
            let sourceKey = '';
            
            // البحث عن أحدث نسخة صالحة
            for (const key of possibleKeys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        JSON.parse(data); // التحقق من صحة البيانات
                        savedState = data;
                        sourceKey = key;
                        break;
                    } catch (e) {
                        console.warn(`⚠️ بيانات تالفة في ${key}`);
                    }
                }
            }
            
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
                console.log(`✅ تم تحميل البيانات بنجاح من: ${sourceKey}`);
            } else {
                console.log('ℹ️ لم توجد بيانات محفوظة، سيتم استخدام البيانات الافتراضية');
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات المحلية:', error);
        }
    };

    useEffect(() => {
        if (isInitialized && !isCheckingAuth) {
            // حفظ في localStorage دائماً مع نسخ احتياطية متعددة
            try {
                const stateData = JSON.stringify(state);
                localStorage.setItem('financial_dashboard_state', stateData);
                localStorage.setItem('financial_dashboard_backup_1', stateData);
                localStorage.setItem('financial_dashboard_backup_2', stateData);
                
                // حفظ إضافي مع timestamp
                const timestamp = new Date().toISOString();
                localStorage.setItem(`financial_dashboard_${timestamp.split('T')[0]}`, stateData);
                
                console.log('✅ تم حفظ البيانات في localStorage مع نسخ احتياطية متعددة');
            } catch (error) {
                console.error('❌ خطأ في حفظ البيانات:', error);
            }
            
            // حفظ في Firebase إذا كان المستخدم مسجل (اختياري)
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
        const filtered = state.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const yearMatch = transactionDate.getFullYear() === selectedYear;
            const monthMatch = selectedMonth === 'all' || (transactionDate.getMonth() + 1) === selectedMonth;
            return yearMatch && monthMatch;
        });
        
        // Sort ALL transactions by date first, then by entry time (ID timestamp)
        return filtered.sort((a, b) => {
            // First sort by transaction date (newest date first)
            const aDate = new Date(a.date);
            const bDate = new Date(b.date);
            const dateComparison = bDate.getTime() - aDate.getTime();
            
            // If dates are the same, sort by entry time (ID contains timestamp) - newest first
            if (dateComparison === 0) {
                const aTime = parseInt(a.id.replace('trans-', '').split('-')[0]);
                const bTime = parseInt(b.id.replace('trans-', '').split('-')[0]);
                return bTime - aTime;
            }
            
            return dateComparison;
        });
    }, [state.transactions, selectedYear, selectedMonth]);

    // ترتيب جميع الحركات في النظام
    const allTransactionsSorted = useMemo(() => {
        if (!state.transactions) return [];
        
        // Sort ALL transactions by date first, then by entry time (ID timestamp)
        return [...state.transactions].sort((a, b) => {
            // First sort by transaction date (newest date first)
            const aDate = new Date(a.date);
            const bDate = new Date(b.date);
            const dateComparison = bDate.getTime() - aDate.getTime();
            
            // If dates are the same, sort by entry time (ID contains timestamp) - newest first
            if (dateComparison === 0) {
                const aTime = parseInt(a.id.replace('trans-', '').split('-')[0]);
                const bTime = parseInt(b.id.replace('trans-', '').split('-')[0]);
                return bTime - aTime;
            }
            
            return dateComparison;
        });
    }, [state.transactions]);
    
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
                // BNPL payments are always expenses (installment payments)
                totalExpenses += t.amount;
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
             const card = state.cards[cardId];
             
             // Calculate cumulative balance: start with configured balance + all transactions
             let currentBalance = 0; // Start from zero (cards don't have initial balance like banks)
             
             // Add all expenses made with this card
             state.transactions.forEach(t => {
                 if (t.paymentMethod === cardId && t.type === 'expense') {
                     currentBalance += t.amount;
                 }
                 // Subtract all payments made TO this card
                 if (t.type === `${cardId}-payment`) {
                     currentBalance -= t.amount;
                 }
                 // Handle card payment transactions (like "سداد ENBD الإمارات")
                 // If this is a payment TO this card from another card, subtract the amount
                 if ((t.type === 'expense' || t.type?.includes('سداد')) && (t.description?.includes(`سداد ${card.name}`) || t.type === `سداد ${card.name}`)) {
                     currentBalance -= t.amount;
                 }
                 // Handle payments made FROM this card to other cards
                 // If this card made a payment to another card, add the amount to this card's balance
                 if ((t.type === 'expense' || t.type?.includes('سداد')) && t.paymentMethod === cardId && (t.description?.includes('سداد') || t.type?.includes('سداد')) && !t.description?.includes(card.name) && t.type !== `سداد ${card.name}`) {
                     currentBalance += t.amount;
                 }
             });
             
             cardDetails[cardId].balance = currentBalance;
             cardDetails[cardId].available = card.limit - currentBalance;
             cardDetails[cardId].usagePercentage = card.limit > 0 ? (currentBalance / card.limit) * 100 : 0;
        });

        // Calculate bank balances and period deposits/withdrawals
        Object.keys(state.bankAccounts).forEach(accountId => {
            const account = state.bankAccounts[accountId];
            let deposits = 0;
            let withdrawals = 0;
            
            // Calculate current balance based on ALL transactions (not just filtered ones)
            let currentBalance = account.balance; // Start with configured balance
            
            state.transactions.forEach(t => {
                // Only count transactions that actually involve this bank account
                if (t.paymentMethod === accountId) {
                    if (['income', 'investment-withdrawal'].includes(t.type)) {
                        currentBalance += t.amount; // Add to balance
                    } else if (['expense', 'investment-deposit'].includes(t.type)) {
                        currentBalance -= t.amount; // Subtract from balance
                    }
                }
                // Card payments also affect bank balance (they are withdrawals from bank)
                if (t.type.endsWith('-payment') && t.paymentMethod === accountId) {
                    currentBalance -= t.amount; // Subtract from balance
                }
                // BNPL first payments also affect bank balance if paid from bank
                if (t.type === 'expense' && t.isInstallmentPayment && t.paymentMethod === accountId) {
                    currentBalance -= t.amount; // Subtract from balance
                }
            });
            
            // Calculate period deposits/withdrawals for display
            filteredTransactions.forEach(t => {
                // Only count transactions that actually involve this bank account
                if (t.paymentMethod === accountId) {
                    if (['income', 'investment-withdrawal'].includes(t.type)) {
                        deposits += t.amount;
                    } else if (['expense', 'investment-deposit'].includes(t.type)) {
                        withdrawals += t.amount;
                    }
                }
                // Card payments also affect bank balance (they are withdrawals from bank)
                if (t.type.endsWith('-payment') && t.paymentMethod === accountId) {
                    withdrawals += t.amount;
                }
                // BNPL first payments also affect bank balance if paid from bank
                if (t.type === 'expense' && t.isInstallmentPayment && t.paymentMethod === accountId) {
                    withdrawals += t.amount;
                }
            });
            
            bankAccountDetails[accountId].balance = currentBalance; // Use calculated balance
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

                    // Create first payment transaction (this is what shows in transactions list)
                    const firstPaymentTransaction: Transaction = {
                        id: `trans-${Date.now()}-1`,
                        amount: transaction.bnplData.installmentAmount,
                        date: transaction.date,
                        description: `الدفعة الأولى لـ: ${transaction.description}`,
                        paymentMethod: transaction.bnplData.initialPaymentSource as PaymentMethod,
                        type: 'expense', // This should be expense (negative) not bnpl-payment
                        categoryId: transaction.categoryId,
                        isInstallmentPayment: true,
                        installmentId: installmentPlan.id
                    };

                    // DON'T create the main BNPL transaction - it should only exist as installment plan
                    // The installment plan will handle the remaining amount

                    return {
                        ...prev,
                        transactions: [...prev.transactions, firstPaymentTransaction],
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
                setState(prev => {
                    const transactionToDelete = prev.transactions.find(t => t.id === id);
                    if (!transactionToDelete) return prev;

                    // 1. فلترة الحركة المحذوفة
                    const updatedTransactions = prev.transactions.filter(t => t.id !== id);
                    let updatedInstallments = prev.installments;

                    // 2. **منطق تحديث الأقساط (هذا هو الجزء الأهم)**
                    // إذا كانت الحركة المحذوفة دفعة قسط، قم بتحديث خطة القسط
                    if (transactionToDelete.isInstallmentPayment && transactionToDelete.installmentId) {
                        updatedInstallments = prev.installments.map(inst => {
                            if (inst.id === transactionToDelete.installmentId) {
                                // إنقاص عداد الدفعات، مع التأكد من أنه لا يقل عن صفر
                                return { ...inst, paid: Math.max(0, inst.paid - 1) };
                            }
                            return inst;
                        });
                    }

                    return {
                        ...prev,
                        transactions: updatedTransactions,
                        installments: updatedInstallments, // تطبيق تحديث الأقساط على الحالة
                    };
                });
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

    const handleSignOut = async () => {
        try {
            const result = await firebaseService.signOut();
            if (result.success) {
                console.log('✅ تم تسجيل الخروج بنجاح');
                setCurrentUser(null);
                // تحميل البيانات المحلية بعد تسجيل الخروج
                await loadLocalData();
        } else {
                console.error('❌ خطأ في تسجيل الخروج:', result.error);
            }
        } catch (error) {
            console.error('❌ خطأ في تسجيل الخروج:', error);
        }
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
    const openLoanFormModal = (loanId?: string) => setLoanForm({ isOpen: true, initialData: loanId ? state.loans[loanId] : null });

    const toggleDarkMode = () => {
        setState(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                darkMode: !prev.settings.darkMode
            }
        }));
    };

    const toggleNotifications = () => {
        setState(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                notifications: !prev.settings.notifications
            }
        }));
    };

    const toggleLanguage = () => {
        setState(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                language: prev.settings.language === 'ar' ? 'en' : 'ar'
            }
        }));
    };

    const handleTransfer = () => {
        if (!transferData.fromAccount || !transferData.toAccount || transferData.amount <= 0) {
            setModalConfig({ title: 'خطأ', body: '<p>يرجى ملء جميع البيانات بشكل صحيح.</p>', hideCancel: true, confirmText: 'موافق' });
            return;
        }

        if (transferData.fromAccount === transferData.toAccount) {
            setModalConfig({ title: 'خطأ', body: '<p>لا يمكن التحويل لنفس الحساب.</p>', hideCancel: true, confirmText: 'موافق' });
            return;
        }

        // تحديد نوع الحسابين (بنكي أو بطاقة)
        const fromBankAccount = state.bankAccounts[transferData.fromAccount];
        const toBankAccount = state.bankAccounts[transferData.toAccount];
        const fromCard = state.cards[transferData.fromAccount];
        const toCard = state.cards[transferData.toAccount];
        
        const fromAccount = fromBankAccount || fromCard;
        const toAccount = toBankAccount || toCard;
        
        // حساب المبلغ المحول مع معدل التحويل
        const convertedAmount = transferData.amount * transferData.exchangeRate;
        
        // تحديد نوع الحركة حسب نوع الحساب
        const fromTransactionType = fromCard ? `${transferData.fromAccount}-payment` : 'expense';
        const toTransactionType = toCard ? `${transferData.toAccount}-payment` : 'income';
        
        // إنشاء حركتين: سحب من الحساب المصدر وإيداع في الحساب الهدف
        const withdrawalTransaction = {
            id: `trans-${Date.now()}-withdrawal`,
            amount: transferData.amount,
            date: new Date().toISOString().split('T')[0],
            description: `تحويل إلى ${toAccount?.name || 'حساب آخر'}: ${transferData.description}${transferData.exchangeRate !== 1 ? ` (معدل: ${transferData.exchangeRate})` : ''}`,
            paymentMethod: transferData.fromAccount,
            type: fromTransactionType as any,
            categoryId: null
        };

        const depositTransaction = {
            id: `trans-${Date.now()}-deposit`,
            amount: convertedAmount,
            date: new Date().toISOString().split('T')[0],
            description: `تحويل من ${fromAccount?.name || 'حساب آخر'}: ${transferData.description}${transferData.exchangeRate !== 1 ? ` (معدل: ${transferData.exchangeRate})` : ''}`,
            paymentMethod: transferData.toAccount,
            type: toTransactionType as any,
            categoryId: null
        };

        // إضافة الحركتين للدولة
        setState(prev => ({
            ...prev,
            transactions: [...prev.transactions, withdrawalTransaction, depositTransaction]
        }));

        // إغلاق النافذة وإعادة تعيين البيانات
        setTransferModal({ isOpen: false });
        setTransferData({
            fromAccount: '',
            toAccount: '',
            amount: 0,
            description: '',
            exchangeRate: 1
        });
        setExchangeRateError('');

        setModalConfig({ title: 'نجح التحويل', body: '<p>تم التحويل بنجاح!</p>', hideCancel: true, confirmText: 'موافق' });
    };

    const handleSaveLoan = (loanData: Loan) => {
        setState(prev => ({
            ...prev,
            loans: {
                ...prev.loans,
                [loanData.id]: loanData
            }
        }));

        // إنشاء الحركات التلقائية للقرض
        if (!loanData.id.includes('edit')) { // فقط للقروض الجديدة
            const transactions = [];

            // 1. حركة الدفعة الأولى (مصروف)
            if (loanData.downPayment > 0) {
                transactions.push({
                    id: `trans-${Date.now()}-down-payment`,
                    amount: loanData.downPayment,
                    date: loanData.startDate,
                    description: `دفعة أولى - ${loanData.name}`,
                    paymentMethod: loanData.linkedAccount || 'cash',
                    type: 'expense' as const,
                    categoryId: null
                });
            }

            // 2. حركة إيداع القرض (دخل) - المبلغ الإجمالي
            transactions.push({
                id: `trans-${Date.now()}-loan-deposit`,
                amount: loanData.totalAmount,
                date: loanData.startDate,
                description: `إيداع قرض - ${loanData.name} من ${loanData.lender}`,
                paymentMethod: loanData.linkedAccount || 'cash',
                type: 'income' as const,
                categoryId: null
            });

            // 3. حركة الدفعة الأخيرة (مصروف) - بتاريخ انتهاء القرض
            if (loanData.finalPayment > 0 && loanData.endDate) {
                transactions.push({
                    id: `trans-${Date.now()}-final-payment`,
                    amount: loanData.finalPayment,
                    date: loanData.endDate,
                    description: `دفعة أخيرة - ${loanData.name}`,
                    paymentMethod: loanData.linkedAccount || 'cash',
                    type: 'expense' as const,
                    categoryId: null
                });
            }

            // إضافة الحركات للدولة
            setState(prev => ({
                ...prev,
                transactions: [...prev.transactions, ...transactions]
            }));
        }

        setLoanForm({ isOpen: false });
        setModalConfig({ 
            title: 'تم إضافة القرض بنجاح', 
            body: '<p>تم إضافة القرض والحركات المرتبطة به بنجاح!</p>', 
            hideCancel: true, 
            confirmText: 'موافق' 
        });
    };

    const updateExchangeRate = async () => {
        if (!transferData.fromAccount || !transferData.toAccount) return;
        
        const fromAccount = state.bankAccounts[transferData.fromAccount];
        const toAccount = state.bankAccounts[transferData.toAccount];
        
        if (!fromAccount || !toAccount) return;
        
        const fromCurrency = fromAccount.currency || 'SAR';
        const toCurrency = toAccount.currency || 'SAR';
        
        if (fromCurrency === toCurrency) {
            setTransferData(prev => ({ ...prev, exchangeRate: 1 }));
            setExchangeRateError('');
            return;
        }
        
        setIsLoadingExchangeRate(true);
        setExchangeRateError('');
        
        try {
            const rateData = await getExchangeRate(fromCurrency, toCurrency);
            setTransferData(prev => ({ ...prev, exchangeRate: rateData.rate }));
        } catch (error) {
            setExchangeRateError(error instanceof Error ? error.message : 'فشل في الحصول على معدل التحويل');
            console.error('Exchange rate error:', error);
        } finally {
            setIsLoadingExchangeRate(false);
        }
    };


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
            case 'summary': return <DashboardTab calculations={calculations} categories={state.categories} state={state} darkMode={state.settings.darkMode} language={state.settings.language} />;
            case 'transactions': return <TransactionsTab transactions={filteredTransactions} allTransactions={allTransactionsSorted} categories={state.categories} deleteTransaction={handleDeleteTransaction} editTransaction={handleEditTransaction} state={state} darkMode={state.settings.darkMode} language={state.settings.language} />;
            case 'ai-assistant': return <AIAssistantTab calculations={calculations} filteredTransactions={filteredTransactions} darkMode={state.settings.darkMode} language={state.settings.language} />;
            case 'analysis': return <AnalysisTab calculations={calculations} categories={state.categories} allTransactions={state.transactions} darkMode={state.settings.darkMode} language={state.settings.language} />;
            case 'budget': return <BudgetTab state={state} setLoading={setLoading} setModal={setModalConfig} darkMode={state.settings.darkMode} language={state.settings.language} />;
            case 'investment': return <InvestmentTab state={state} setState={setState} calculations={calculations} setModal={setModalConfig} darkMode={state.settings.darkMode} language={state.settings.language} />;
            case 'cards': return <CardsTab state={state} openCardFormModal={openCardFormModal} deleteCard={handleDeleteCard} darkMode={state.settings.darkMode} language={state.settings.language} />;
            case 'bank': return <BankTab state={state} setState={setState} calculations={calculations} filteredTransactions={filteredTransactions} categories={state.categories} setModal={setModalConfig} openBankAccountFormModal={openBankAccountFormModal} deleteBankAccount={handleDeleteBankAccount} openTransferModal={() => setTransferModal({ isOpen: true })} darkMode={state.settings.darkMode} language={state.settings.language} />;
            case 'installments': return <InstallmentsTab state={state} setState={setState} filteredTransactions={filteredTransactions} setModal={setModalConfig} darkMode={state.settings.darkMode} language={state.settings.language} />;
            case 'debts-loans': return <DebtsLoansTab state={state} setState={setState} setModal={setModalConfig} openLoanFormModal={openLoanFormModal} darkMode={state.settings.darkMode} language={state.settings.language} />;
            case 'settings': return <SettingsTab state={state} setState={setState} setModal={setModalConfig} setLoading={setLoading} onRestore={handleRestore} darkMode={state.settings.darkMode} language={state.settings.language} />;
            default: return <div>Tab not found</div>;
        }
    };

    return (
        <div className={`min-h-screen font-sans ${state.settings.darkMode ? 'dark' : ''}`}>
            <Header
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onYearChange={setSelectedYear}
                onMonthChange={val => setSelectedMonth(val)}
                onAddTransaction={() => setTransactionForm({ isOpen: true })}
                currentUser={currentUser}
                onSignOut={handleSignOut}
                language={state.settings.language}
            />
            
            {/* شريط الإعدادات */}
            <div className={`backdrop-blur-sm border-b p-4 ${state.settings.darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${state.settings.darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                {t('dark.mode', state.settings.language)}
                            </span>
                            <DarkModeToggle 
                                darkMode={state.settings.darkMode} 
                                onToggle={toggleDarkMode} 
                            />
                        </div>
                        <NotificationManager 
                            notifications={state.settings.notifications} 
                            onToggle={toggleNotifications}
                            language={state.settings.language}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleLanguage}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                state.settings.darkMode 
                                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
                                    : 'bg-blue-100 hover:bg-blue-200 text-slate-700'
                            }`}
                        >
                            <span className="text-sm font-medium">
                                {t('language', state.settings.language)}
                            </span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                state.settings.darkMode ? 'bg-blue-500' : 'bg-blue-600'
                            }`}>
                                <span className="text-white font-bold text-xs">
                                    {state.settings.language === 'ar' ? 'A' : 'E'}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
            
            <main className="container mx-auto px-2 sm:px-4 max-w-7xl mt-8 mb-20">
                <TabsComponent activeTab={activeTab} setActiveTab={setActiveTab} language={state.settings.language} />
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
                    loans={state.loans}
                    setModalConfig={setModalConfig}
                    darkMode={state.settings.darkMode}
                    language={state.settings.language}
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

            {/* Loan Form Modal */}
            {loanForm.isOpen && (
                <LoanForm
                    onClose={() => setLoanForm({ isOpen: false })}
                    onSave={handleSaveLoan}
                    initialData={loanForm.initialData}
                    bankAccounts={state.bankAccounts}
                />
            )}

            {/* Transfer Modal */}
            {transferModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => {
                    setTransferModal({ isOpen: false });
                    setTransferData({ fromAccount: '', toAccount: '', amount: 0, description: '', exchangeRate: 1 });
                    setExchangeRateError('');
                }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-800">💸 تحويل بين الحسابات</h2>
                                <button onClick={() => {
                                    setTransferModal({ isOpen: false });
                                    setTransferData({ fromAccount: '', toAccount: '', amount: 0, description: '', exchangeRate: 1 });
                                    setExchangeRateError('');
                                }} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                        
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="fromAccount" className="block text-sm font-medium text-slate-600 mb-1">من الحساب</label>
                                    <select 
                                        id="fromAccount"
                                        name="fromAccount"
                                        value={transferData.fromAccount} 
                                        onChange={(e) => setTransferData(prev => ({ ...prev, fromAccount: e.target.value }))}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">اختر الحساب المصدر</option>
                                        {Object.entries(state.bankAccounts).map(([id, account]) => (
                                            <option key={id} value={id}>🏦 {account.name}</option>
                                        ))}
                                        {Object.entries(state.cards).map(([id, card]) => (
                                            <option key={id} value={id}>💳 {card.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label htmlFor="toAccount" className="block text-sm font-medium text-slate-600 mb-1">إلى الحساب</label>
                                    <select 
                                        id="toAccount"
                                        name="toAccount"
                                        value={transferData.toAccount} 
                                        onChange={(e) => setTransferData(prev => ({ ...prev, toAccount: e.target.value }))}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">اختر الحساب الهدف</option>
                                        {Object.entries(state.bankAccounts)
                                            .filter(([id]) => id !== transferData.fromAccount)
                                            .map(([id, account]) => (
                                            <option key={id} value={id}>🏦 {account.name}</option>
                                        ))}
                                        {Object.entries(state.cards)
                                            .filter(([id]) => id !== transferData.fromAccount)
                                            .map(([id, card]) => (
                                            <option key={id} value={id}>💳 {card.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label htmlFor="amount" className="block text-sm font-medium text-slate-600 mb-1">المبلغ</label>
                                    <input 
                                        type="number" 
                                        id="amount"
                                        name="amount"
                                        step="0.01"
                                        value={transferData.amount} 
                                        onChange={(e) => setTransferData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                
                                {transferData.fromAccount && transferData.toAccount && 
                                 state.bankAccounts[transferData.fromAccount]?.currency !== state.bankAccounts[transferData.toAccount]?.currency && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            💱 معدل التحويل ({state.bankAccounts[transferData.fromAccount]?.currency} → {state.bankAccounts[transferData.toAccount]?.currency})
                                        </label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                step="0.0001"
                                                value={transferData.exchangeRate} 
                                                onChange={(e) => setTransferData(prev => ({ ...prev, exchangeRate: parseFloat(e.target.value) || 1 }))}
                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="1.0000"
                                            />
                                            <button 
                                                type="button"
                                                onClick={updateExchangeRate}
                                                disabled={isLoadingExchangeRate}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                                                title="تحديث معدل التحويل تلقائياً"
                                            >
                                                {isLoadingExchangeRate ? (
                                                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                                ) : (
                                                    '🔄'
                                                )}
                                                <span className="hidden sm:inline">تحديث</span>
                                            </button>
                                        </div>
                                        {exchangeRateError && (
                                            <p className="text-red-500 text-xs mt-1">{exchangeRateError}</p>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">
                                            المبلغ المحول: {(transferData.amount * transferData.exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {state.bankAccounts[transferData.toAccount]?.currency}
                                        </p>
                                    </div>
                                )}
                                
                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-slate-600 mb-1">الوصف (اختياري)</label>
                                    <input 
                                        type="text" 
                                        id="description"
                                        name="description"
                                        value={transferData.description} 
                                        onChange={(e) => setTransferData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="مثل: تحويل للطوارئ"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setTransferModal({ isOpen: false });
                                        setTransferData({ fromAccount: '', toAccount: '', amount: 0, description: '', exchangeRate: 1 });
                                        setExchangeRateError('');
                                    }} 
                                    className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleTransfer}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    تحويل
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Generic Modal */}
            {modalConfig && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4"
                    onClick={() => setModalConfig(null)}
                >
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex flex-col items-center justify-center">
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