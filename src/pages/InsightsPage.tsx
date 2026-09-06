import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { predictSpending } from '@/lib/financeAnalyzer';
import { useFinance } from '@/hooks/useFinance';
import { useAsync } from '@/hooks/useAsync';
import { formatCurrency } from '@/lib/format';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import type { HeuristicInsight } from '@/lib/types';
import {
  Sparkles, Cpu, Zap, TrendingUp, AlertTriangle, Lightbulb,
  CheckCircle2, RefreshCw, ShieldCheck, Gauge,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

interface AIResponse {
  insights: string[] | HeuristicInsight[];
  provider: string;
  source: 'ai' | 'heuristic';
}

const insightStyleMap: Record<string, { Icon: typeof TrendingUp; color: string; bg: string }> = {
  positive: { Icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  warning: { Icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  tip: { Icon: Lightbulb, color: 'text-accent-600', bg: 'bg-accent-50' },
  info: { Icon: Zap, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
};

export function InsightsPage() {
  const { fetchTransactions, fetchBudget } = useFinance();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<AIResponse | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictData, setPredictData] = useState<ReturnType<typeof predictSpending> | null>(null);

  const { data: baseData, loading: baseLoading, error: baseError } = useAsync(async () => {
    const [transactions, budget] = await Promise.all([fetchTransactions(), fetchBudget()]);
    return { transactions, budget };
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'insights' }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${resp.status})`);
      }
      const data = (await resp.json()) as AIResponse;
      setAiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrediction = async () => {
    if (!baseData) return;
    setPredictLoading(true);
    try {
      // Use local computation for the deterministic prediction
      const result = predictSpending(baseData.transactions, baseData.budget);
      setPredictData(result);
    } finally {
      setPredictLoading(false);
    }
  };

  const handleGenerate = () => {
    fetchInsights();
    fetchPrediction();
  };

  if (baseLoading) return <LoadingState message="Loading insights..." />;
  if (baseError) return <ErrorState message="Couldn't load your data" />;

  const providerLabel = aiData?.provider === 'gemini'
    ? 'Gemini AI'
    : aiData?.provider === 'groq'
      ? 'Groq AI'
      : 'Rules Engine';
  const isAI = aiData?.source === 'ai';

  // Normalize insights to display objects
  const normalizedInsights: { title: string; body: string; type: string }[] = (() => {
    if (!aiData) return [];
    if (isAI) {
      return (aiData.insights as string[]).map((text, i) => ({
        title: `Insight ${i + 1}`,
        body: text,
        type: 'info',
      }));
    }
    return aiData.insights as HeuristicInsight[];
  })();

  const prediction = predictData;
  const predChart = prediction?.history.map((b) => ({
    name: b.label,
    Expense: Number(b.expense.toFixed(0)),
    Predicted: Number(prediction.predictedExpense.toFixed(0)),
  })) ?? [];

  const hasNoData = baseData?.transactions.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            AI Insights
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Personalized recommendations and spending prediction</p>
        </div>
        <button onClick={handleGenerate} disabled={loading || hasNoData} className="btn-primary">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {aiData ? 'Refresh insights' : 'Generate insights'}
        </button>
      </div>

      {hasNoData && (
        <div className="card">
          <EmptyState
            icon={<Sparkles className="h-7 w-7" />}
            title="No data to analyze yet"
            description="Add some transactions and set a budget to unlock AI-powered insights and spending predictions."
          />
        </div>
      )}

      {/* Provider badge */}
      {aiData && (
        <div className="flex items-center gap-2">
          <span className={`badge ${isAI ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
            {isAI ? <Sparkles className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
            {isAI ? `Powered by ${providerLabel}` : `${providerLabel} (heuristic fallback)`}
          </span>
          {!isAI && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Add an AI API key to enable AI-powered insights
            </span>
          )}
        </div>
      )}

      {/* Prediction card */}
      {prediction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Spending Prediction</h3>
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Predicted next-month expense</p>
              <p className="text-3xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(prediction.predictedExpense)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" /> Confidence
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{prediction.confidence}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Basis months</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{prediction.basisMonths}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Budget risk</span>
                <span className={`font-semibold ${prediction.budgetRisk ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {prediction.budgetRisk ? 'High — exceeds budget' : 'Low — within budget'}
                </span>
              </div>
            </div>
            {prediction.budgetRisk && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 flex items-start gap-2 animate-fade-in">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Based on your average spending, you're likely to exceed your monthly budget next month. Consider reducing discretionary categories.</span>
              </div>
            )}
          </div>

          <div className="card p-5 lg:col-span-2">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Expense Trend & Prediction</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={predChart} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <ReferenceLine y={prediction.predictedExpense} stroke="#059669" strokeDasharray="5 5" label={{ value: 'Prediction', position: 'right', fill: '#059669', fontSize: 11 }} />
                <Area type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={2.5} fill="url(#expGrad)" />
                <Area type="monotone" dataKey="Predicted" stroke="#059669" strokeWidth={2} strokeDasharray="4 4" fill="url(#predGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Insights list */}
      {loading && <LoadingState message="Analyzing your finances..." />}
      {error && <ErrorState message={error} onRetry={handleGenerate} />}

      {!loading && !error && normalizedInsights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {normalizedInsights.map((ins, i) => {
            const { Icon, color, bg } = insightStyleMap[ins.type] ?? insightStyleMap.info;
            return (
              <div
                key={i}
                className="card p-5 flex gap-4 animate-fade-in hover:shadow-soft transition-shadow"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{ins.title}</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{ins.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && !aiData && !hasNoData && (
        <div className="card">
          <EmptyState
            icon={<Sparkles className="h-7 w-7" />}
            title="Ready for insights"
            description="Click 'Generate insights' to analyze your finances and get personalized recommendations."
          />
        </div>
      )}
    </div>
  );
}
