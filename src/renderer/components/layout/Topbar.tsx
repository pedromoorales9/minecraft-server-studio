import { useTheme } from '../../app/ThemeProvider';
import { Button } from '../ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';

export function Topbar() {
  const { theme, setTheme } = useTheme();
  return (
    <header className="drag flex h-12 items-center justify-between border-b border-border/60 px-4 glass">
      <div className="pl-16 text-sm font-medium text-muted-foreground">Minecraft Server Studio</div>
      <div className="no-drag flex items-center gap-1">
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
