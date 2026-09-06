/*
# Create transactions and budgets tables (multi-user, owner-scoped)

1. New Tables
- `transactions` — Stores per-user income and expense entries.
  - id (uuid PK)
  - user_id (uuid, NOT NULL DEFAULT auth.uid(), FK to auth.users ON DELETE CASCADE)
  - title (text, not null)
  - amount (numeric(12,2), not null, > 0)
  - type (text, 'income' | 'expense', CHECK constrained)
  - category (text, not null)
  - payment_method (text, not null, e.g. Card/Cash/Bank/UPI)
  - description (text, nullable)
  - transaction_date (date, not null)
  - created_at, updated_at (timestamptz)
- `budgets` — A single budget document per user.
  - id (uuid PK)
  - user_id (uuid, NOT NULL DEFAULT auth.uid(), FK to auth.users ON DELETE CASCADE, UNIQUE)
  - monthly_budget (numeric(12,2), not null, >= 0)
  - category_budgets (jsonb, not null, default '[]') — array of {category, limit}
  - updated_at (timestamptz)

2. Indexes
- transactions(user_id, transaction_date DESC)
- transactions(user_id, type)
- transactions(user_id, category)
- budgets(user_id) unique already via constraint

3. Security (RLS)
- Enable RLS on both tables.
- Owner-scoped CRUD: each authenticated user can only access rows where
  user_id = auth.uid(). Four separate policies (select/insert/update/delete)
  per table, scoped TO authenticated.
- user_id defaults to auth.uid() so inserts that omit user_id succeed.

4. Notes
- The frontend talks to Supabase with the anon key; after sign-in the
  authenticated session satisfies the ownership checks.
- Budgets uses a UNIQUE constraint on user_id so each user has exactly one
  budget document (upsert by user_id).
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('income','expense')),
  category text NOT NULL,
  payment_method text NOT NULL DEFAULT 'Card',
  description text,
  transaction_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type
  ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category
  ON transactions(user_id, category);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions"
  ON transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions"
  ON transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions"
  ON transactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_budget numeric(12,2) NOT NULL DEFAULT 0 CHECK (monthly_budget >= 0),
  category_budgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_unique
  ON budgets(user_id);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_budget" ON budgets;
CREATE POLICY "select_own_budget"
  ON budgets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_budget" ON budgets;
CREATE POLICY "insert_own_budget"
  ON budgets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_budget" ON budgets;
CREATE POLICY "update_own_budget"
  ON budgets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_budget" ON budgets;
CREATE POLICY "delete_own_budget"
  ON budgets FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger for both tables
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON budgets;
CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
