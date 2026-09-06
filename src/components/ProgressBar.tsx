interface ProgressBarProps {
  value: number;
  max: number;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  size?: 'sm' | 'md';
  label?: string;
}

export function ProgressBar({ value, max, variant = 'default', size = 'md', label }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const overflow = max > 0 ? Math.max((value / max) * 100 - 100, 0) : 0;

  const colorMap = {
    default: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    success: 'bg-accent-500',
  };
  const autoVariant =
    pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'default';
  const color = variant === 'default' ? colorMap[autoVariant] : colorMap[variant];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-label={label ?? 'Progress'}
      className={`w-full ${size === 'sm' ? 'h-1.5' : 'h-2.5'} rounded-full bg-slate-100 overflow-hidden`}
    >
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
      {overflow > 0 && (
        <div className="text-xs text-rose-600 mt-1 font-medium">
          {overflow.toFixed(0)}% over limit
        </div>
      )}
    </div>
  );
}
