import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-400 dark:text-slate-500 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-16"
    >
      <div className="h-8 w-8 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-emerald-500 animate-spin" aria-hidden="true" />
      <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center py-16 animate-fade-in"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 text-xl font-bold"
        aria-hidden="true"
      >
        !
      </div>
      <p className="mt-3 text-sm text-rose-600 dark:text-rose-400 font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4">
          Try again
        </button>
      )}
    </div>
  );
}
