export type PaymentMethod = 'cash' | 'tabby-bnpl' | 'tamara-bnpl' | 'reconciliation' | string; // Dynamic for cards and banks
export type TransactionType = 'income' | 'expense' | 'bnpl-payment' | 'investment-deposit' | 'investment-withdrawal' | 'transfer' | string; // Dynamic for card payments

export interface Transaction {
    id: string;
    amount: number;
    date: string;
    postingDate?: string; // Date the transaction is officially posted, important for credit card statements
    description: string;
    paymentMethod: PaymentMethod; 
    type: TransactionType;
    categoryId: string | null;
    isInstallmentPayment?: boolean;
    installmentId?: string;
    bnplData?: {
        installmentsCount: number;
        initialPaymentSource: string;
        installmentAmount: number;
    };
    transferData?: {
        fromAccount: string;
        toAccount: string;
        exchangeRate: number;
        fromCurrency: string;
        toCurrency: string;
    };
}

export interface InstallmentPlan {
    id: string;
    provider: 'tabby-bnpl' | 'tamara-bnpl';
    description: string;
    totalAmount: number;
    installmentAmount: number;
    total: number;
    paid: number;
    createdAt: string;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
}

export interface CardConfig {
    id: string;
    name: string;
    limit: number;
    dueDay: number;
    statementDay: number; // Day of the month the statement is generated
    smsSamples?: string[];
    currency?: string; // Default: 'SAR'
}

export interface BankAccountConfig {
    id: string;
    name: string;
    balance: number;
    currency?: string;
    smsSamples?: string[];
}

export interface CardDetails extends CardConfig {
    balance: number;
    available: number;
    usagePercentage: number;
}

export interface BankAccountDetails extends BankAccountConfig {
    deposits: number;
    withdrawals: number;
}


export interface AppState {
    transactions: Transaction[];
    categories: Category[];
    installments: InstallmentPlan[];
    investments: {
        currentValue: number;
    };
    cards: {
        [key: string]: CardConfig;
    };
    bankAccounts: {
        [key: string]: BankAccountConfig;
    };
    customTransactionTypes?: Array<{
        id: string;
        name: string;
        icon: string;
        isCustom: boolean;
    }>;
    customPaymentMethods?: Array<{
        id: string;
        name: string;
        icon: string;
        isCustom: boolean;
    }>;
}

export interface FinancialCalculations {
    totalIncome: number;
    totalExpenses: number;
    cardDetails: { [key: string]: CardDetails };
    cardPayments: { [key: string]: number };
    bankAccountDetails: { [key: string]: BankAccountDetails };
    totalDebt: number;
    totalAvailable: number;
    totalLimits: number;
    totalBankBalance: number;
    totalInvestmentDeposits: number;
    totalInvestmentWithdrawals: number;
    expensesByCategory: { [key: string]: number };
}

export type Tab = 'summary' | 'budget' | 'investment' | 'ai-assistant' | 'transactions' | 'cards' | 'bank' | 'installments' | 'analysis' | 'settings';

export interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}