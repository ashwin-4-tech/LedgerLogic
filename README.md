# LedgerLogic

**An AI-powered personal finance dashboard that turns raw transactions into visual insights — no spreadsheets, no BI license, no data wrangling required.**

As a data analyst, I spend my days building dashboards in Power BI for other people's data. But when it came to my own money, I was still staring at bank statements and half-broken spreadsheets. Power BI is powerful, but it's overkill for personal finance — you have to import data, build a model, design visuals, and refresh everything manually before you see a single chart.

LedgerLogic is my attempt to fix that. It takes the parts of Power BI that matter for personal finance — structured data capture, category breakdowns, trend analysis, and visual storytelling — and wraps them in a focused, fast, and genuinely useful app. You log transactions as you go, and the dashboards build themselves. Then an AI engine reads your numbers and tells you what they mean.

---

## What it does

LedgerLogic gives anyone a complete picture of their spending without touching a spreadsheet or a BI tool.

- **Record transactions in seconds** — income or expense, with category, payment method, date, and optional notes.
- **See your money visually** — summary cards, monthly income vs. expense trends, category-wise spending breakdowns, and recent activity, all rendered as interactive charts.
- **Set budgets and track them** — a monthly overall budget plus per-category limits, with progress bars showing how close you are to each limit.
- **Get AI-generated insights** — instead of exporting to a BI tool and building a report, click one button and get plain-language observations about your spending patterns, savings rate, budget risk, and category trends.
- **Predict next month's spending** — a lightweight forecasting model uses your historical data to estimate next month's expenses and flags whether you're likely to blow past your budget.
- **Export PDF reports** — generate a clean, formatted report of a given month's transactions for your records or to share with an accountant.
- **Works in light and dark mode** — because staring at financial dashboards at midnight should be easy on the eyes.

---

## Why I built this instead of just using Power BI

Power BI is built for analysts working with large organizational datasets. For personal finance, the workflow is backwards:

1. Export transactions from your bank as CSV
2. Open Power BI Desktop
3. Import and clean the data
4. Build a data model with relationships
5. Design every visual from scratch
6. Publish and refresh the report

That's six steps before you see a single insight — and you have to repeat most of them every time new transactions come in.

LedgerLogic collapses all of that into one app. You enter transactions directly (no CSV gymnastics), and the visualizations, summaries, and AI insights are generated automatically. The dashboards update in real time. It's not trying to replace Power BI for enterprise analytics — it's bringing the *idea* of BI (structured data → visual insight) to something everyone deals with: their own spending.

---

## How the AI insights work

The AI insights page is the heart of what makes LedgerLogic different from a plain expense tracker.

1. **Data summarization** — your transactions are aggregated into a financial summary: total income, total expense, savings rate, 6-month trend, and top spending categories.
2. **AI prompt generation** — that summary is turned into a structured prompt asking for concise, actionable insights (each capped at 140 characters).
3. **AI model call** — the prompt is sent to a large language model via a server-side edge function. The model returns 5–7 personalized observations.
4. **Heuristic fallback** — if no AI API key is configured or the AI call fails, a rules-based engine kicks in and generates insights from the same data using financial heuristics (savings rate thresholds, budget utilization, month-over-month spending changes, category dominance). You always get insights, never a blank screen.

The spending prediction is computed locally using a moving-average model over your historical monthly expenses. It reports a predicted amount, a confidence score (which rises as you log more data), and a budget-risk flag if the prediction exceeds your set budget.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router |
| Charts | Recharts |
| Icons | Lucide React |
| Date handling | date-fns |
| Backend & database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (email/password) |
| AI insights | Supabase Edge Function (Deno) calling Gemini or Groq, with heuristic fallback |
| PDF export | jsPDF + jsPDF-AutoTable |

---

## Project structure

```
src/
├── components/          # Reusable UI: Layout, Modal, SummaryCard, TransactionForm, etc.
├── context/             # Auth and Theme providers
├── hooks/               # useFinance (data fetching), useAsync (async state)
├── lib/                 # types, formatters, Supabase client, finance analyzer
├── pages/               # Dashboard, Transactions, Budget, Insights, Reports, Profile, Auth
└── App.tsx              # Route definitions

supabase/
├── functions/ai-insights/   # Edge function: AI + heuristic insights and predictions
└── migrations/              # Database schema (transactions, budgets, RLS policies)
```

---

## Database

Two tables back the entire app:

- **transactions** — one row per income or expense entry, scoped to the signed-in user.
- **budgets** — one row per user, holding a monthly overall budget and an array of per-category limits.

Row-level security (RLS) is enabled on both tables, so each user can only read and write their own data. No one else's transactions are ever accessible.

---

## Getting started

1. Install dependencies:
   ```
   npm install
   ```
2. Start the dev server:
   ```
   npm run dev
   ```
3. Open the app in your browser and create an account.
4. Add a few transactions, set a monthly budget, and head to the Insights page to generate your first AI-powered analysis.

To enable AI-powered insights (instead of the heuristic fallback), set one of the following as an edge function secret:

- `GEMINI_API_KEY` — to use Google's Gemini model
- `GROQ_API_KEY` — to use Groq's Llama model

If neither is set, the app still works — it just generates insights using the built-in rules engine.

---

## Who this is for

Anyone who wants to understand their spending without learning a BI tool. You don't need to be a data analyst to use it — but if you are one, you'll appreciate that the dashboards build themselves.

---

## License

Personal project — free to use and adapt.
