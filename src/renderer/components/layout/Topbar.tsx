import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../app/ThemeProvider';
import { Button } from '../ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';
import { OWNER_NAME } from '../../lib/branding';

const SECTION_LABEL: Record<string, string> = {
  console: 'Consola',
  plugins: 'Plugins',
  mods: 'Mods',
  monitoring: 'Monitor',
  backups: 'Backups',
};

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const servers = useQuery({ queryKey: ['servers'], queryFn: () => window.api.servers.list() });

  const crumbs = buildCrumbs(location.pathname, (id) => servers.data?.find((s) => s.id === id)?.name);

  return (
    <header className="drag flex h-14 items-center justify-between border-b border-border/60 px-7 glass">
      <nav className="no-drag flex items-center gap-2 text-sm font-semibold">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 ? <span className="text-muted-foreground/50">/</span> : null}
            {c.to ? (
              <Link to={c.to} className="text-muted-foreground transition-colors hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span className="text-foreground">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="no-drag flex items-center gap-2.5">
        <span className="hidden select-none items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
          {OWNER_NAME}
        </span>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </header>
  );
}

function buildCrumbs(
  path: string,
  serverName: (id: string) => string | undefined,
): Array<{ label: string; to?: string }> {
  const m = /^\/servers\/(srv_[A-Za-z0-9_-]+)(?:\/([a-z]+))?/.exec(path);
  if (m) {
    const [, id, section] = m;
    const name = serverName(id!) ?? 'Servidor';
    const crumbs: Array<{ label: string; to?: string }> = [
      { label: 'Dashboard', to: '/dashboard' },
    ];
    if (section && SECTION_LABEL[section]) {
      crumbs.push({ label: name, to: `/servers/${id}` }, { label: SECTION_LABEL[section]! });
    } else {
      crumbs.push({ label: name });
    }
    return crumbs;
  }
  if (path.startsWith('/servers/new')) {
    return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Crear servidor' }];
  }
  if (path.startsWith('/settings')) {
    return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Ajustes' }];
  }
  return [{ label: 'Dashboard' }];
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
