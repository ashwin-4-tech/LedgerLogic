import { useState, useMemo } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { useAsync } from '@/hooks/useAsync';
import { summarizeTransactions } from '@/lib/financeAnalyzer';
import { formatCurrency, formatDate, formatMonthYear, monthKey } from '@/lib/format';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { FileText, Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function ReportsPage() {
  const { fetchTransactions, fetchBudget } = useFinance();
  const { data, loading, error } = useAsync(async () => {
    const [transactions, budget] = await Promise.all([fetchTransactions(), fetchBudget()]);
    return { transactions, budget };
  }, []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  const report = useMemo(() => {
    if (!data) return null;
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;
    const periodTransactions = data.transactions.filter(
      (t) => monthKey(t.transaction_date) === periodKey,
    );

    const totalIncome = periodTransactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    const catMap = new Map<string, { amount: number; count: number }>();
    for (const t of periodTransactions) {
      if (t.type === 'expense') {
        const entry = catMap.get(t.category) ?? { amount: 0, count: 0 };
        entry.amount += Number(t.amount);
        entry.count += 1;
        catMap.set(t.category, entry);
      }
    }
    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, v]) => ({ category, amount: v.amount, count: v.count, percentage: totalExpense > 0 ? (v.amount / totalExpense) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    // monthly trend within the year for context
    const fullSummary = summarizeTransactions(data.transactions, data.budget);

    return {
      periodKey,
      totalIncome,
      totalExpense,
      savings,
      savingsRate,
      categoryBreakdown,
      transactions: periodTransactions.sort(
        (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime(),
      ),
      transactionCount: periodTransactions.length,
      monthlyTrend: fullSummary.monthlyTrend,
    };
  }, [data, year, month]);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long' });

  const goPrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const handleExportPDF = () => {
    if (!report) return;
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(5, 150, 105);
      doc.rect(0, 0, pageWidth, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('LedgerLogic', 14, 15);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Monthly Finance Report', 14, 23);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`${monthLabel} ${year}`, pageWidth - 14, 18, { align: 'right' });

      // Summary section
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 46);

      const summaryRows = [
        ['Total Income', formatCurrency(report.totalIncome)],
        ['Total Expense', formatCurrency(report.totalExpense)],
        ['Net Savings', formatCurrency(report.savings)],
        ['Savings Rate', `${report.savingsRate.toFixed(1)}%`],
        ['Transactions', String(report.transactionCount)],
      ];
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: summaryRows,
        theme: 'striped',
        headStyles: { fillColor: [5, 150, 105], fontSize: 10 },
        bodyStyles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      // Category breakdown
      let yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Breakdown by Category', 14, yPos);

      if (report.categoryBreakdown.length > 0) {
        autoTable(doc, {
          startY: yPos + 4,
          head: [['Category', 'Amount', '% of Expenses', 'Transactions']],
          body: report.categoryBreakdown.map((c) => [
            c.category,
            formatCurrency(c.amount),
            `${c.percentage.toFixed(1)}%`,
            String(c.count),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [5, 150, 105], fontSize: 10 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('No expense data for this period.', 14, yPos + 6);
      }

      // Transactions table
      if (report.transactions.length > 0) {
        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('All Transactions', 14, yPos);
        autoTable(doc, {
          startY: yPos + 4,
          head: [['Date', 'Title', 'Category', 'Type', 'Amount']],
          body: report.transactions.map((t) => [
            formatDate(t.transaction_date),
            t.title,
            t.category,
            t.type === 'income' ? 'Income' : 'Expense',
            `${t.type === 'income' ? '+' : '-'}${formatCurrency(Number(t.amount))}`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [5, 150, 105], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 4: { halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `LedgerLogic Report · ${monthLabel} ${year} · Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' },
        );
      }

      doc.save(`finance-report-${year}-${String(month).padStart(2, '0')}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingState message="Loading report data..." />;
  if (error) return <ErrorState message="Couldn't load report data" />;

  const barData = report?.categoryBreakdown.slice(0, 8).map((c) => ({
    name: c.category,
    amount: Number(c.amount.toFixed(0)),
  })) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monthly summary with PDF export</p>
        </div>
        <button onClick={handleExportPDF} disabled={exporting || !report || report.transactionCount === 0} className="btn-primary">
          <Download className="h-4 w-4" aria-hidden="true" />
          {exporting ? 'Generating...' : 'Export PDF'}
        </button>
      </div>

      {/* Month picker */}
      <div className="card p-4 flex items-center justify-between">
        <button onClick={goPrevMonth} aria-label={`Previous month, ${month === 1 ? new Date(year - 1, 11, 1).toLocaleDateString('en-IN', { month: 'long' }) : new Date(year, month - 2, 1).toLocaleDateString('en-IN', { month: 'long' })} ${month === 1 ? year - 1 : year}`} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">{monthLabel} {year}</span>
        </div>
        <button
          onClick={goNextMonth}
          disabled={year === now.getFullYear() && month === now.getMonth() + 1}
          aria-label={`Next month, ${month === 12 ? new Date(year + 1, 0, 1).toLocaleDateString('en-IN', { month: 'long' }) : new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long' })} ${month === 12 ? year + 1 : year}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {!report || report.transactionCount === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileText className="h-7 w-7" aria-hidden="true" />}
            title={`No data for ${monthLabel} ${year}`}
            description="There are no transactions recorded for this month. Try a different month or add transactions."
          />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard title="Income" value={formatCurrency(report.totalIncome)} icon="income" />
            <SummaryCard title="Expense" value={formatCurrency(report.totalExpense)} icon="expense" />
            <SummaryCard
              title="Net Savings"
              value={formatCurrency(report.savings)}
              icon="savings"
              subtitle={`${report.savingsRate.toFixed(0)}% rate`}
            />
            <SummaryCard
              title="Transactions"
              value={String(report.transactionCount)}
              icon="budget"
              subtitle="this month"
            />
          </div>

          {/* Category chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Expense by Category</h3>
            <figure role="img" aria-label={`Bar chart of expenses by category: ${barData.map((d) => `${d.name} ${d.amount}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="amount" fill="#059669" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
            </figure>
          </div>

          {/* Transactions list */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">All Transactions — {formatMonthYear(report.periodKey)}</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
