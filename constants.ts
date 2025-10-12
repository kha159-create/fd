import { AppState } from './types';

export const getInitialState = (): AppState => ({
  transactions: [],
  categories: [
    { id: 'cat-1', name: 'بقالة', icon: '🛒' },
    { id: 'cat-2', name: 'مطاعم', icon: '🍔' },
    { id: 'cat-3', name: 'وقود', icon: '⛽' },
    { id: 'cat-4', name: 'فواتير', icon: '🧾' },
    { id: 'cat-9', name: 'سداد فواتير', icon: '💳' },
    { id: 'cat-5', name: 'تسوق', icon: '🛍️' },
    { id: 'cat-6', name: 'إيجار', icon: '🏠' },
    { id: 'cat-8', name: 'صيدلية', icon: '💊' },
    { id: 'cat-7', name: 'أخرى', icon: '💸' },
  ],
  installments: [],
  investments: {
      currentValue: 0
  },
  cards: {
    snb: { limit: 26000, dueDay: 15 },
    enbd: { limit: 10000, dueDay: 18 }
  },
  bank: { balance: 0 }
});
