import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
    >
      <Sun className={`h-5 w-5 ${isDark ? 'hidden' : 'block'}`} aria-hidden="true" />
      <Moon className={`h-5 w-5 ${isDark ? 'block' : 'hidden'}`} aria-hidden="true" />
      <span className="sr-only">{isDark ? 'Dark mode active' : 'Light mode active'}</span>
    </button>
  );
}
