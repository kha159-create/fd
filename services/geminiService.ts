import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Transaction, Category, FinancialCalculations, CardConfig, BankAccountConfig } from '../types';
import { config, validateConfig } from '../config';

let ai: GoogleGenAI;
const GEMINI_MODEL = config.gemini.model;

// تهيئة خدمة Gemini باستخدام المفتاح من ملف الإعدادات
export const initializeAi = () => {
    if (ai) {
        return;
    }
    
    // التحقق من صحة المفتاح
    const validation = validateConfig();
    if (!validation.isValid) {
        console.warn("⚠️ تحذير: مفتاح Gemini API غير صحيح:", validation.errors);
        return;
    }
    
    try {
        ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
        console.log('🤖 تم تهيئة خدمة Gemini بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تهيئة خدمة Gemini:', error);
    }
};


const GEMINI_PROMPTS = {
    FINANCIAL_ANALYST: `You are an expert financial analyst assistant, "المحلل الذكي". You have full access to the user's financial data for a specific period. Your purpose is to provide detailed, insightful analysis and answer complex questions in Arabic based ONLY on the data provided for that period.
- Today's date is ${new Date().toLocaleDateString('en-CA')}.
- Analyze the user's provided financial state (transactions, card details, bank balance, investments, installments) for the specified period to answer their query.
- Be thorough. Connect different parts of their financial data to give holistic answers.
- DO NOT just state data, INTERPRET it. Provide insights, identify trends, and offer observations.
- Be friendly, professional, and act as a true financial advisor.`,
    INVESTMENT_COACH: `You are an educational investment coach named "المستشار الذكي". Your primary role is to educate the user about investment concepts and strategies, particularly within the context of the Saudi stock market (Tadawul).
- You MUST NOT give direct financial advice. Do not recommend buying or selling specific stocks (e.g., "Buy Aramco").
- When asked for a recommendation, you MUST politely decline and instead explain HOW the user can research and make their own informed decisions.
- Your tone should be encouraging, educational, and responsible.
- Keep your answers clear, concise, and in Arabic.`,
    PASTE_ANALYZER: `You are an intelligent data extraction tool for Arabic and English financial transaction SMS messages from Saudi Arabia. Your task is to analyze the provided text and respond ONLY with a valid JSON object containing the keys: "merchant", "amount", "date", "paymentMethod", and "categoryId".
- **CRITICAL RULE**: Extract data ONLY from the user's text. Do not invent or infer information. If a piece of information is not present in the text, its corresponding JSON value should be null.
- **ERROR HANDLING**: If the provided text does not seem to be a financial transaction SMS at all, you MUST respond with a JSON object containing a single key "error" with the value "النص المقدم لا يبدو كرسالة معاملة مالية.".

- **Amount Extraction**:
  - The 'amount' is the primary transaction value.
  - Look for a number after keywords like "بـ" or "Amount:".
  - You MUST ignore any numbers associated with "Remaining limit", "الصرف المتبقي", or card numbers.

- **Date Extraction**:
  - The 'date' MUST be in "YYYY-MM-DD" format.
  - If the text provides a full timestamp like "2025-09-06 15:11:57", extract only the date part "2025-09-06".
  - If the text uses "DD/MM/YY", you must convert it. Example: '01/09/25' becomes '2025-09-01'.

- **Merchant Extraction**:
  - The 'merchant' is the store or service name.
  - Look for text after keywords like "من" or "Merchant:".

{{PAYMENT_METHOD_MAPPING}}

- **Category ID**:
  - Analyze the merchant name and suggest the most relevant ID from the provided list of available categories. If unsure, use the ID for the category named 'أخرى'.

---
**EXAMPLES**

1.  **Input**: "شراء-POS\\nبـ182 SAR\\nمن Adel Inte\\nمدى-ابل*2855\\nفي 01/09/25 22:11"
    **Output**: { "merchant": "Adel Inte", "amount": 182, "date": "2025-09-01", "paymentMethod": "bank-default", "categoryId": "cat-5" }

2.  **Input**: "شراء-POS\\nبـ‬‪95.78 ‬‪SAR\\nمن ‬‪BINDAWOOD\\nإئتمانية **4278 ‬‪(Apple Pay)\\nفي ‬‪03/09/25 ‬‪14:45\\nالصرف المتبقي ‬‪12146.95 ‬‪SAR"
    **Output**: { "merchant": "BINDAWOOD", "amount": 95.78, "date": "2025-09-03", "paymentMethod": "snb-card", "categoryId": "cat-1" }

3.  **Input**: "POS Purchase (Apple Pay)\\nCard: Visa card XX8095\\nAmount: SAR 115.00\\nMerchant: AlHamra Roundabout Statio\\nIn: SAUDI ARABIA\\nRemaining limit SAR 2,502.34\\nOn: 2025-09-06 15:11:57"
    **Output**: { "merchant": "AlHamra Roundabout Statio", "amount": 115.00, "date": "2025-09-06", "paymentMethod": "enbd-card", "categoryId": "cat-3" }

4.  **Input**: "POS Purchase (Apple Pay)\\nCard: Visa card XX8095\\nAmount: SAR 10.00\\nMerchant: MKAN CO\\nIn: SAUDI ARABIA\\nRemaining limit SAR 2,782.27\\nOn: 2025-09-03 23:44:56"
    **Output**: { "merchant": "MKAN CO", "amount": 10.00, "date": "2025-09-03", "paymentMethod": "enbd-card", "categoryId": "cat-7" }
---
`,
    ICON_SUGGESTER: "You are an emoji expert. Your task is to suggest a single, relevant emoji for a given category name. You must respond with ONLY the emoji character and nothing else.",
    SMART_SUMMARY_GENERATOR: `You are a professional financial analyst. Your task is to write a concise, one-paragraph summary of a user's financial situation based on the provided data for a specific period. The summary should be in Arabic, professional in tone, and suitable for the beginning of a financial report. Highlight the key figures like total income, total expenses, and the net result for that period.`,
    BUDGET_PLANNER: `You are a helpful and encouraging financial planning assistant in Arabic. Your goal is to help the user create a realistic monthly budget based on their spending history and a total budget amount they provide. Use the 50/30/20 rule (50% for Needs, 30% for Wants, 20% for Savings/Debt) as a general framework, but you MUST adapt it to the user's actual spending patterns revealed in their transaction data. Your response MUST be in Arabic and formatted using Markdown. It should contain: 1. A brief, encouraging introductory sentence. 2. A breakdown of the total budget into Needs, Wants, and Savings, with the suggested amount for each. 3. A detailed table with three columns: "الفئة", "المبلغ المقترح", and "ملاحظات". 4. In the table, allocate the "Needs" and "Wants" amounts across the user's actual spending categories. 5. The "Notes" column should provide a brief justification. 6. Conclude with a short, motivational tip.`
};

const callGemini = async (systemInstruction: string, userPrompt: string, isJsonOutput: boolean = false): Promise<string> => {
  if (!ai) {
    throw new Error("لم تتم تهيئة خدمة الذكاء الاصطناعي. يرجى التأكد من صحة إعدادات الاتصال.");
  }
  try {
    // استخدام الطريقة الصحيحة لاستدعاء Gemini API
    const model = ai.getGenerativeModel({ 
      model: GEMINI_MODEL,
      systemInstruction: systemInstruction,
      generationConfig: {
        ...(isJsonOutput && { responseMimeType: "application/json" })
      }
    });
    
    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text();
    return responseText;

  } catch (error) {
    console.error("Gemini API Error:", error);
    let userMessage = "عفواً، حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.";
    if (error instanceof Error && 'message' in error) {
        if (error.message.includes('API key not valid')) {
            userMessage = "تم رفض الوصول. يرجى التحقق من صحة مفتاح API الخاص بك.";
        }
    }
    throw new Error(userMessage);
  }
};

export const analyzeFinancialData = (query: string, filteredData: any) =>
    callGemini(GEMINI_PROMPTS.FINANCIAL_ANALYST, `User Query: "${query}"\n\nFinancial Data: ${JSON.stringify(filteredData)}`);

export const analyzePastedText = (text: string, categories: Category[], cards: { [key: string]: CardConfig }, bankAccounts: { [key: string]: BankAccountConfig }) => {
    const cardIds = Object.keys(cards);
    const bankAccountIds = Object.keys(bankAccounts);
    let mappingRules = `- **Payment Method Mapping**:\n  - The 'paymentMethod' MUST be one of these exact values: [${[...bankAccountIds, ...cardIds].map(id => `'${id}'`).join(', ')}].\n`;
    
    // Add rules for bank accounts
    Object.values(bankAccounts).forEach(account => {
        const keywords = [account.name.split(' ')[0], ...(account.smsSamples || [])].filter(Boolean);
        if (keywords.length > 0) {
            mappingRules += `  - If the text is a bank/mada transaction and contains any of these: '${keywords.join("', '")}', use '${account.id}'.\n`;
        }
    });
    
    // Add rules for credit cards
    Object.values(cards).forEach(card => {
        const keywords = [card.name.split(' ')[0], ...(card.smsSamples || [])].filter(Boolean);
        if (keywords.length > 0) {
            mappingRules += `  - If the text is a credit card transaction and contains any of these: '${keywords.join("', '")}', use '${card.id}'.\n`;
        }
    });

    mappingRules += "  - If no specific bank account keywords match for a bank/mada transaction, default to the first bank account ID in the list.";
    
    const systemInstruction = GEMINI_PROMPTS.PASTE_ANALYZER
        .replace('{{PAYMENT_METHOD_MAPPING}}', mappingRules);

    return callGemini(systemInstruction, `Text to analyze: "${text}"\n\nAvailable Categories: ${JSON.stringify(categories)}\n\nFirst bank account ID is '${bankAccountIds[0]}'`, true);
};


export const generateInvestmentAdvice = (query: string) =>
    callGemini(GEMINI_PROMPTS.INVESTMENT_COACH, query);

export const suggestCategoryIcon = (categoryName: string) =>
    callGemini(GEMINI_PROMPTS.ICON_SUGGESTER, `Category: ${categoryName}`);
    
export const generateSmartSummary = (calculations: FinancialCalculations) =>
    callGemini(GEMINI_PROMPTS.SMART_SUMMARY_GENERATOR, `Financial Data: ${JSON.stringify(calculations)}`);

export const generateBudgetPlan = (totalBudget: number, categories: Category[], recentTransactions: Transaction[]) =>
    callGemini(GEMINI_PROMPTS.BUDGET_PLANNER, `Total monthly budget is: ${totalBudget} SAR. My spending categories are: ${JSON.stringify(categories)}. My transactions from the last 60 days are: ${JSON.stringify(recentTransactions)}`);
