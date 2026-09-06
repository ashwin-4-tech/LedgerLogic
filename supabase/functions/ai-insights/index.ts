import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TxRow {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string;
  payment_method: string;
  description: string | null;
  transaction_date: string;
}

interface BudgetRow {
  monthly_budget: number;
  category_budgets: { category: string; limit: number }[];
}

interface MonthlyBucket {
  month: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

function summarize(transactions: TxRow[], budget: BudgetRow | null) {
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  const buckets = new Map<string, MonthlyBucket>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = monthKey(d);
    buckets.set(key, { month: key, label: monthLabel(key), income: 0, expense: 0, savings: 0 });
  }
  for (const t of transactions) {
    const key = monthKey(new Date(t.transaction_date));
    const b = buckets.get(key);
    if (b) {
      if (t.type === 'income') b.income += Number(t.amount);
      else b.expense += Number(t.amount);
    }
  }
  const monthlyTrend = Array.from(buckets.values()).map((b) => ({ ...b, savings: b.income - b.expense }));

  const catMap = new Map<string, number>();
  let expenseTotal = 0;
  for (const t of transactions) {
    if (t.type === 'expense') {
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + Number(t.amount));
      expenseTotal += Number(t.amount);
    }
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([category, amount]) => ({ category, amount, percentage: expenseTotal > 0 ? (amount / expenseTotal) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);

  return { totalIncome, totalExpense, savings, savingsRate, monthlyTrend, categoryBreakdown, transactionCount: transactions.length };
}

function heuristicInsights(transactions: TxRow[], budget: BudgetRow | null) {
  const s = summarize(transactions, budget);
  const insights: { title: string; body: string; type: string }[] = [];

  if (s.savingsRate >= 20) {
    insights.push({ title: 'Strong savings rate', body: `You're saving ${s.savingsRate.toFixed(0)}% of your income — well above the recommended 20%. Keep it up!`, type: 'positive' });
  } else if (s.savingsRate >= 10) {
    insights.push({ title: 'Room to save more', body: `Your savings rate is ${s.savingsRate.toFixed(0)}%. Aim for 20%+ by trimming discretionary categories.`, type: 'tip' });
  } else if (s.savingsRate > 0) {
    insights.push({ title: 'Low savings rate', body: `You're only saving ${s.savingsRate.toFixed(0)}% of your income. Review top expense categories for quick wins.`, type: 'warning' });
  } else if (s.totalExpense > 0) {
    insights.push({ title: 'Spending exceeds income', body: `You spent more than you earned. Immediate action needed to avoid debt.`, type: 'warning' });
  }

  const topCat = s.categoryBreakdown[0];
  if (topCat && topCat.percentage > 35) {
    insights.push({ title: `${topCat.category} dominates spending`, body: `${topCat.category} accounts for ${topCat.percentage.toFixed(0)}% of your expenses. Consider if this aligns with your priorities.`, type: 'info' });
  }

  const trend = s.monthlyTrend;
  if (trend.length >= 2) {
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    if (prev.expense > 0) {
      const change = ((last.expense - prev.expense) / prev.expense) * 100;
      if (change > 20) insights.push({ title: 'Spending spiked this month', body: `Your spending rose ${change.toFixed(0)}% compared to last month. Worth reviewing recent transactions.`, type: 'warning' });
      else if (change < -15) insights.push({ title: 'Great spending reduction', body: `You cut spending by ${Math.abs(change).toFixed(0)}% versus last month. Excellent discipline!`, type: 'positive' });
    }
  }

  if (budget && budget.monthly_budget > 0) {
    const last = trend[trend.length - 1];
    const usedPct = (last.expense / budget.monthly_budget) * 100;
    if (usedPct >= 100) insights.push({ title: 'Monthly budget exceeded', body: `You've used ${usedPct.toFixed(0)}% of your monthly budget. Tighten spending for the rest of the month.`, type: 'warning' });
    else if (usedPct >= 80) insights.push({ title: 'Approaching budget limit', body: `You've used ${usedPct.toFixed(0)}% of your monthly budget.`, type: 'warning' });
    else if (usedPct < 50 && usedPct > 0) insights.push({ title: 'Well within budget', body: `You've used just ${usedPct.toFixed(0)}% of your monthly budget. Great spending management.`, type: 'positive' });
  }

  if (budget && budget.category_budgets.length > 0) {
    const lastMonth = trend[trend.length - 1];
    const monthCatMap = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === 'expense' && monthKey(new Date(t.transaction_date)) === lastMonth.month) {
        monthCatMap.set(t.category, (monthCatMap.get(t.category) ?? 0) + Number(t.amount));
      }
    }
    for (const cb of budget.category_budgets) {
      const spent = monthCatMap.get(cb.category) ?? 0;
      if (cb.limit > 0 && spent > cb.limit) {
        insights.push({ title: `${cb.category} category over budget`, body: `You spent ₹${spent.toFixed(0)} on ${cb.category}, exceeding the ₹${cb.limit.toFixed(0)} limit.`, type: 'warning' });
      }
    }
  }

  if (insights.length === 0) {
    insights.push({ title: 'Start tracking to see insights', body: 'Add transactions and set a budget to unlock personalized financial insights.', type: 'info' });
  }

  return insights;
}

function predict(transactions: TxRow[], budget: BudgetRow | null) {
  const s = summarize(transactions, budget);
  const expenseBuckets = s.monthlyTrend.filter((b) => b.expense > 0);
  const basisMonths = expenseBuckets.length;
  const predictedExpense = basisMonths > 0 ? expenseBuckets.reduce((sum, b) => sum + b.expense, 0) / basisMonths : 0;
  const confidence = Math.min(Math.max(55 + basisMonths * 8 + Math.min(s.transactionCount * 0.5, 10), 55), 95);
  const budgetRisk = budget != null && budget.monthly_budget > 0 && predictedExpense > budget.monthly_budget;
  return { predictedExpense, confidence: Math.round(confidence), budgetRisk, basisMonths, history: s.monthlyTrend };
}

async function callAI(provider: string, apiKey: string, promptText: string): Promise<string[]> {
  const systemPrompt = 'You are a concise personal finance advisor. Respond with ONLY a JSON array of strings, each string being a short actionable insight (max 140 chars). No markdown, no explanation, just the array.';

  if (provider === 'gemini') {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${promptText}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
        }),
      },
    );
    if (!resp.ok) throw new Error(`Gemini API error ${resp.status}`);
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return parseAIInsights(text);
  }

  // Groq default
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptText },
      ],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });
  if (!resp.ok) throw new Error(`Groq API error ${resp.status}`);
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return parseAIInsights(text);
}

function parseAIInsights(text: string): string[] {
  // Try to extract a JSON array from the response
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => typeof s === 'string').slice(0, 8);
      }
    } catch {
      // fall through
    }
  }
  return text.split('\n').map((l) => l.replace(/^[-*\d.]+\s*/, '').trim()).filter((l) => l.length > 10).slice(0, 8);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const action = body.action as 'insights' | 'predict';

    const [{ data: txData }, { data: budgetData }] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', userId),
      supabase.from('budgets').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const transactions = (txData ?? []) as TxRow[];
    const budget = (budgetData as BudgetRow | null) ?? null;

    if (action === 'predict') {
      const result = predict(transactions, budget);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // action === 'insights'
    const heuristic = heuristicInsights(transactions, budget);

    // Check for AI API key
    const groqKey = Deno.env.get('GROQ_API_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const provider = geminiKey ? 'gemini' : groqKey ? 'groq' : null;
    const apiKey = geminiKey ?? groqKey ?? null;

    if (provider && apiKey) {
      try {
        const s = summarize(transactions, budget);
        const promptText = `Here is a user's financial summary (currency: Indian Rupee, use ₹ symbol):\n- Total income: ₹${s.totalIncome.toFixed(0)}\n- Total expense: ₹${s.totalExpense.toFixed(0)}\n- Savings: ₹${s.savings.toFixed(0)} (${s.savingsRate.toFixed(0)}% rate)\n- Monthly budget: ${budget ? '₹' + budget.monthly_budget.toFixed(0) : 'not set'}\n- Top categories: ${s.categoryBreakdown.slice(0, 5).map((c) => `${c.category} (₹${c.amount.toFixed(0)}, ${c.percentage.toFixed(0)}%)`).join(', ')}\n- 6-month expense trend: ${s.monthlyTrend.map((b) => `${b.label}: ₹${b.expense.toFixed(0)}`).join(', ')}\n\nGenerate 5-7 short, specific, actionable financial insights for this user. Use ₹ for all currency amounts. Each insight should be a single string (max 140 chars). Return ONLY a JSON array of strings.`;

        const aiStrings = await callAI(provider, apiKey, promptText);
        return new Response(
          JSON.stringify({ insights: aiStrings, provider, source: 'ai' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch {
        // fall back to heuristic
      }
    }

    return new Response(
      JSON.stringify({ insights: heuristic, provider: provider ?? 'rules', source: 'heuristic' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
