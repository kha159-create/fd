
import React, { useState } from 'react';
import { AppState, FinancialCalculations } from '../../types';
import { generateSmartSummary } from '../../services/geminiService';

declare const XLSX: any;
declare const jspdf: any;

interface ExportTabProps {
    state: AppState;
    onRestore: (newState: AppState) => void;
    calculations: FinancialCalculations;
    getFilteredTransactions: () => any[];
    setLoading: (loading: boolean, text?: string) => void;
    setModal: (config: any) => void;
    selectedPeriod: string;
}

const ExportTab: React.FC<ExportTabProps> = ({ state, onRestore, calculations, getFilteredTransactions, setLoading, setModal, selectedPeriod }) => {
    const [summaryResult, setSummaryResult] = useState('');
    
    const getPaymentMethodName = (key: string) => ({ 'mada-bank': 'بنك', 'cash': 'نقدي', 'snb-card': 'SNB', 'enbd-card': 'ENBD', 'tabby-bnpl': 'تابي', 'tamara-bnpl': 'تمارا' }[key] || key);
    const getTransactionTypeName = (key: string) => ({ 'income': 'دخل', 'expense': 'مصاريف', 'snb-payment': 'سداد SNB', 'enbd-payment': 'سداد ENBD', 'bnpl-payment': 'سداد قسط' }[key] || key);
    const formatCurrency = (value: number) => (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const handleExportExcel = () => {
        setLoading(true, "جاري تجهيز ملف Excel...");
        try {
            const wb = XLSX.utils.book_new();
            const transactionsData = getFilteredTransactions().map(t => {
                const category = state.categories.find(c => c.id === t.categoryId);
                return {
                    'التاريخ': t.date,
                    'النوع': getTransactionTypeName(t.type),
                    'الوسيلة': getPaymentMethodName(t.paymentMethod),
                    'المبلغ': t.amount,
                    'الفئة': category ? category.name : 'N/A',
                    'الوصف': t.description,
                };
            });
            const ws_transactions = XLSX.utils.json_to_sheet(transactionsData);
            XLSX.utils.book_append_sheet(wb, ws_transactions, "المعاملات");
            XLSX.writeFile(wb, `Expense_Report_${selectedPeriod}.xlsx`);
        } catch (error) {
            console.error("Excel export failed:", error);
            setModal({ title: "خطأ", body: "<p>فشل تصدير الملف.</p>" });
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePDF = () => {
        setLoading(true, "جاري إنشاء تقرير PDF...");
        try {
            const { jsPDF } = jspdf;
            const doc = new jsPDF();
            
            // For production, a library like pdfmake with custom fonts is better for Arabic.
            doc.setRTL(true);
            doc.setFont('Helvetica'); // A font more likely to have some glyphs

            doc.text(`تقرير المصاريف - ${selectedPeriod}`, 105, 20, { align: 'center' });

            const summaryData = [
                ['إجمالي الدخل', formatCurrency(calculations.totalIncome)],
                ['إجمالي المصاريف', formatCurrency(calculations.totalExpenses)],
                ['الصافي', formatCurrency(calculations.totalIncome - calculations.totalExpenses)],
            ];

            (doc as any).autoTable({
                startY: 30,
                head: [['البند', 'المبلغ']],
                body: summaryData,
                styles: { halign: 'right' },
                headStyles: { halign: 'right' },
            });
            
            doc.save(`financial_report_${selectedPeriod}.pdf`);
        } catch (error) {
            console.error("PDF generation failed:", error);
            setModal({ title: "خطأ", body: "<p>فشل إنشاء ملف PDF.</p>" });
        } finally {
            setLoading(false);
        }
    };

    const handleBackup = () => {
        try {
            const backupData = JSON.stringify(state, null, 2);
            const blob = new Blob([backupData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expenses_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            setModal({ title: "خطأ", body: "<p>فشل إنشاء النسخة الاحتياطية.</p>" });
        }
    };

    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const restoredState = JSON.parse(e.target?.result as string);
                if (restoredState?.transactions && restoredState?.categories) {
                    setModal({
                        show: true,
                        title: "استعادة نسخة احتياطية",
                        body: "<p>هل أنت متأكد؟ سيتم الكتابة فوق جميع بياناتك الحالية.</p>",
                        confirmText: 'نعم، استعادة',
                        onConfirm: () => {
                           onRestore(restoredState);
                        }
                    });
                } else {
                    throw new Error("Invalid backup file format.");
                }
            } catch (error) {
                 setModal({ show: true, title: "خطأ", body: "<p>فشل في استعادة النسخة الاحتياطية. الملف غير صالح.</p>", confirmText: 'موافق', hideCancel: true });
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    };
    
    const handleSmartSummary = async () => {
        setLoading(true, "جاري إنشاء الملخص...");
        setSummaryResult('');
        try {
            if (getFilteredTransactions().length < 1) {
                throw new Error("لا توجد بيانات كافية في هذه الفترة لإنشاء ملخص.");
            }
            const summaryText = await generateSmartSummary(calculations);
            setSummaryResult(summaryText);
        } catch (error) {
            setModal({ show: true, title: "خطأ", body: `<p>${error instanceof Error ? error.message : "حدث خطأ."}</p>` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6"><h3 className="text-xl font-bold text-slate-900 mb-4">📊 تصدير إلى Excel</h3><p className="text-slate-500 mb-4">قم بتصدير بيانات الفترة المحددة إلى ملف Excel.</p><button onClick={handleExportExcel} className="w-full mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold">📊 تصدير إلى Excel</button></div>
                <div className="glass-card p-6"><h3 className="text-xl font-bold text-slate-900 mb-4">📄 تقرير PDF</h3><p className="text-slate-500 mb-4">إنشاء تقرير مالي شامل للفترة المحددة بصيغة PDF.</p><button onClick={handleGeneratePDF} className="w-full mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold">📄 إنشاء تقرير PDF</button></div>
            </div>
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4 text-slate-900">✨ تلخيص ذكي للتقرير</h3>
                <p className="text-slate-500 mb-4">احصل على ملخص سريع ومحترف لوضعك المالي في الفترة المحددة.</p>
                <button onClick={handleSmartSummary} className="w-full magical-button text-white font-semibold px-6 py-3 rounded-lg">✨ إنشاء ملخص ذكي</button>
                {summaryResult && <div className="mt-4 p-4 bg-slate-100 rounded-lg text-slate-700 prose max-w-none" dangerouslySetInnerHTML={{ __html: summaryResult.replace(/\n/g, '<br/>') }}></div>}
            </div>
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-4">💾 النسخ الاحتياطي والاستعادة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><h4 className="font-semibold text-slate-800 mb-3">📤 إنشاء نسخة احتياطية</h4><p className="text-slate-500 mb-4 text-sm">احفظ جميع بياناتك في ملف آمن.</p><button onClick={handleBackup} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">💾 إنشاء</button></div>
                    <div><h4 className="font-semibold text-slate-800 mb-3">📥 استعادة البيانات</h4><p className="text-slate-500 mb-4 text-sm">استعد بياناتك من ملف نسخة احتياطية.</p><input type="file" id="backup-file" accept=".json" className="hidden" onChange={handleRestore} /><button onClick={() => document.getElementById('backup-file')?.click()} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">📥 استعادة</button></div>
                </div>
            </div>
        </div>
    );
};

export default ExportTab;