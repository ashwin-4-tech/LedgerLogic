import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Transaction, TransactionInput, Budget, BudgetInput } from '@/lib/types';

export function useFinance() {
  const fetchTransactions = useCallback(async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Transaction[];
  }, []);

  const createTransaction = useCallback(async (input: TransactionInput) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as Transaction;
  }, []);

  const updateTransaction = useCallback(async (id: string, input: TransactionInput) => {
    const { data, error } = await supabase
      .from('transactions')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Transaction;
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const fetchBudget = useCallback(async (): Promise<Budget | null> => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return (data as Budget) ?? null;
  }, []);

  const saveBudget = useCallback(async (input: BudgetInput): Promise<Budget> => {
    const { data: existing } = await supabase
      .from('budgets')
      .select('id')
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('budgets')
        .update(input)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as Budget;
    }

    const { data, error } = await supabase
      .from('budgets')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as Budget;
  }, []);

  return {
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    fetchBudget,
    saveBudget,
  };
}
