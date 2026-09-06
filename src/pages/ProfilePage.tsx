import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/hooks/useFinance';
import { useAsync } from '@/hooks/useAsync';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import { Modal } from '@/components/Modal';
import { LoadingState } from '@/components/States';
import {
  User as UserIcon, Mail, Lock, Save, CheckCircle2, BarChart3, Receipt, Calendar,
} from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();
  const { fetchTransactions } = useFinance();
  const { data: transactions } = useAsync(fetchTransactions, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSaved, setPwdSaved] = useState(false);

  useEffect(() => {
    if (user) {
      const metaName = (user.user_metadata as { name?: string })?.name ?? '';
      setName(metaName);
      setEmail(user.email ?? '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      const { error } = await supabase.auth.updateUser({
        email: email !== user?.email ? email : undefined,
        data: { name: name.trim() },
      });
      if (error) throw error;
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdError(null);
    setPwdSaved(false);
    if (newPwd.length < 6) { setPwdError('New password must be at least 6 characters'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match'); return; }

    setPwdSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: currentPwd,
      });
      if (signInError) throw new Error('Current password is incorrect');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });
      if (updateError) throw updateError;

      setPwdSaved(true);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setTimeout(() => { setPwdOpen(false); setPwdSaved(false); }, 1500);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwdSaving(false);
    }
  };

  if (!user) return <LoadingState />;

  const txns = transactions ?? [];
  const totalIncome = txns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const oldestTx = txns.length > 0 ? txns[txns.length - 1] : null;

  const stats = [
    { icon: Receipt, label: 'Total transactions', value: String(txns.length) },
    { icon: BarChart3, label: 'Total income tracked', value: formatCurrency(totalIncome) },
    { icon: BarChart3, label: 'Total expenses tracked', value: formatCurrency(totalExpense) },
    { icon: Calendar, label: 'Member since', value: oldestTx ? formatDate(user.created_at) : formatDate(user.created_at) },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account details and password</p>
      </div>

      {/* Account summary */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white text-xl font-bold font-display shadow-glow">
            {name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-bold font-display text-lg text-slate-900 dark:text-slate-100">{name || 'User'}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
                <s.icon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit profile */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-5">Account Details</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input className="input pl-10" value={name} onChange={(e) => { setName(e.target.value); setProfileSaved(false); }} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input className="input pl-10" value={email} onChange={(e) => { setEmail(e.target.value); setProfileSaved(false); }} />
            </div>
          </div>
          {profileError && <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{profileError}</div>}
          <div className="flex items-center justify-end gap-3">
            {profileSaved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="h-4 w-4" /> Profile updated
              </span>
            )}
            <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary">
              <Save className="h-4 w-4" />
              {savingProfile ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Security</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Change your password</p>
          </div>
          <button onClick={() => setPwdOpen(true)} className="btn-secondary">
            <Lock className="h-4 w-4" /> Change password
          </button>
        </div>
      </div>

      <Modal open={pwdOpen} onClose={() => setPwdOpen(false)} title="Change password" maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input type="password" className="input" value={currentPwd} onChange={(e) => { setCurrentPwd(e.target.value); setPwdError(null); }} placeholder="••••••••" />
          </div>
          <div>
            <label className="label">New password</label>
            <input type="password" className="input" value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setPwdError(null); }} placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input type="password" className="input" value={confirmPwd} onChange={(e) => { setConfirmPwd(e.target.value); setPwdError(null); }} placeholder="Re-enter new password" />
          </div>
          {pwdError && <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{pwdError}</div>}
          {pwdSaved && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Password updated successfully
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setPwdOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleChangePassword} disabled={pwdSaving} className="btn-primary">
              {pwdSaving ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
