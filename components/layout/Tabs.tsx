import React, { useState } from 'react';
import { Tab } from '../../types';
import { HomeIcon, ChartBarIcon, ListBulletIcon, EllipsisIcon } from '../common/Icons';

interface TabsProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
}

const ALL_TABS: { id: Tab; label: string; icon?: React.FC<{className?: string}> }[] = [
    { id: 'summary', label: '📊 الملخص', icon: HomeIcon },
    { id: 'analysis', label: '📈 التحليل', icon: ChartBarIcon },
    { id: 'transactions', label: '💳 الحركات', icon: ListBulletIcon },
    { id: 'budget', label: '✨ الميزانية' },
    { id: 'investment', label: '💹 الاستثمار' },
    { id: 'ai-assistant', label: '🤖 المحلل الذكي' },
    { id: 'cards', label: '💳 إدارة البطاقات' },
    { id: 'bank', label: '🏦 البنك' },
    { id: 'installments', label: '📱 الأقساط' },
    { id: 'debts-loans', label: '📊 الديون والقروض' },
    { id: 'settings', label: '⚙️ الإعدادات' },
];

const mainMobileTabs: Tab[] = ['summary', 'analysis', 'transactions'];

const TabsComponent: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
    const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);

    const handleTabClick = (tabId: Tab) => {
        setActiveTab(tabId);
        setMoreMenuOpen(false);
    };

    const mainTabs = ALL_TABS.filter(tab => mainMobileTabs.includes(tab.id));
    const moreTabs = ALL_TABS.filter(tab => !mainMobileTabs.includes(tab.id));

    return (
        <>
            {/* Top Bar for Desktop */}
            <div className="hidden md:flex flex-wrap justify-center mb-8 tab-bar rounded-xl p-2">
                {ALL_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`tab-btn px-4 py-2 mx-1 mb-1 rounded-lg font-semibold text-sm flex items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Bottom Nav for Mobile */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-lg border-t border-slate-200 z-40 flex justify-around items-center">
                {mainTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={`flex flex-col items-center justify-center gap-1 transition-colors w-full h-full ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
                            {Icon && <Icon />}
                            <span className="text-xs">{tab.label.split(' ')[1]}</span>
                        </button>
                    )
                })}
                 <button onClick={() => setMoreMenuOpen(!isMoreMenuOpen)} className={`flex flex-col items-center justify-center gap-1 transition-colors w-full h-full ${isMoreMenuOpen ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
                    <EllipsisIcon />
                    <span className="text-xs">المزيد</span>
                </button>
            </div>

            {/* More Menu Modal for Mobile */}
            {isMoreMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex justify-center items-end" onClick={() => setMoreMenuOpen(false)}>
                    <div className="bg-white w-full rounded-t-2xl p-4 border-t border-slate-200 animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            {moreTabs.map(tab => (
                                <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={`p-3 rounded-lg flex flex-col items-center gap-2 ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                    <span className="text-2xl">{tab.label.split(' ')[0]}</span>
                                    <span className="text-xs font-semibold">{tab.label.split(' ')[1]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TabsComponent;