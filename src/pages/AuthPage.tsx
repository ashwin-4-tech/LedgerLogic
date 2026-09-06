import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, Mail, Lock, User, Sparkles, BarChart3, FileText, Check, X } from 'lucide-react';

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number (0–9)', test: (pw) => /\d/.test(pw) },
  { label: 'One special character (!@#$%^&*)', test: (pw) => /[!@#$%^&*]/.test(pw) },
];

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => rule.test(password)),
    [password],
  );
  const allRulesPassed = passwordChecks.every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        if (!allRulesPassed) {
          setError('Please meet all password requirements');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, name.trim());
        if (error) throw new Error(error);
      } else {
        const { error } = await signIn(email, password);
        if (error) throw new Error(error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(
        msg.includes('Invalid login')
          ? 'Incorrect email or password'
          : msg.includes('already registered')
            ? 'An account with this email already exists'
            : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-glow">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-slate-900 leading-none">LedgerLogic</p>
              <p className="text-xs text-slate-400 mt-0.5">AI Finance Tracker</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold font-display text-slate-900">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === 'signup'
              ? 'Start tracking your money and get AI-powered insights.'
              : 'Sign in to access your dashboard and insights.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-name" className="label">Full name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="auth-name"
                    className="input pl-10"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="auth-password" className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  className="input pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={mode === 'signup' ? 'password-rules' : undefined}
                />
              </div>
              {mode === 'signup' && (
                <ul id="password-rules" className="mt-3 space-y-1.5" aria-label="Password requirements">
                  {PASSWORD_RULES.map((rule, i) => {
                    const passed = passwordChecks[i];
                    return (
                      <li
                        key={rule.label}
                        className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
                          passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                            passed
                              ? 'bg-emerald-100 dark:bg-emerald-950/50'
                              : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          {passed ? (
                            <Check className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <X className="h-2.5 w-2.5" aria-hidden="true" />
                          )}
                        </span>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {error && (
              <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-600 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup');
                setError(null);
              }}
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>

      {/* Right — brand panel */}
      <div className="hidden lg:flex flex-1 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-slate-900 to-accent-600/10" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, rgba(16,185,129,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(6,182,212,0.1) 0%, transparent 50%)',
          }}
        />
        <div className="relative flex flex-col justify-center px-16 text-white max-w-lg">
          <h2 className="text-4xl font-bold font-display leading-tight">
            Turn every transaction into <span className="text-emerald-400">actionable insight</span>.
          </h2>
          <p className="mt-4 text-slate-300 text-lg">
            LedgerLogic analyzes your income and expenses, predicts spending, and generates
            downloadable reports — all powered by AI with a smart rules-based fallback.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: Sparkles, title: 'AI-powered insights', desc: 'Personalized recommendations that always work' },
              { icon: BarChart3, title: 'Visual dashboard', desc: 'Charts for trends, categories, and cash flow' },
              { icon: FileText, title: 'PDF reports', desc: 'Export clean monthly summaries in one click' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                  <Icon className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-sm text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
