import { useTheme } from '../../app/ThemeProvider';
import { Button } from '../ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';
import { APP_NAME, OWNER_NAME } from '../../lib/branding';

export function Topbar() {
  const { theme, setTheme } = useTheme();
  return (
    <header className="drag flex h-12 items-center justify-between border-b border-border/60 px-4 glass">
      <div className="pl-16 text-sm font-medium text-muted-foreground">{APP_NAME}</div>
      <div className="no-drag flex items-center gap-2">
        <span className="hidden select-none items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
          {OWNER_NAME}
        </span>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </header>
  );
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: 'light' | 'dark' | 'system';
  setTheme: (t: 'light' | 'dark' | 'system') => void;
}) {
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} title={`Tema: ${theme}`}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}
