import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Plus,
  Settings,
  Activity,
  Box,
  Puzzle,
  Archive,
  Terminal,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { Logo } from '../brand/Logo';
import { OWNER_NAME } from '../../lib/branding';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const TOP_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/servers/new', label: 'Crear servidor', icon: Plus },
];

const BOTTOM_ITEMS: NavItem[] = [{ to: '/settings', label: 'Ajustes', icon: Settings }];

export function Sidebar() {
  const location = useLocation();
  const servers = useQuery({
    queryKey: ['servers'],
    queryFn: () => window.api.servers.list(),
  });

  const activeServerMatch = /^\/servers\/(srv_[A-Za-z0-9_-]+)/.exec(location.pathname);
  const activeServerId = activeServerMatch?.[1] ?? null;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border/60 bg-card/40">
      <div className="drag h-12" />
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2.5 px-2">
          <Logo size={34} glow />
          <div>
            <div className="text-sm font-semibold leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-[hsl(263_90%_72%)] to-[hsl(258_85%_58%)] bg-clip-text text-transparent">
                {OWNER_NAME}
              </span>{' '}
              Studio
            </div>
            <div className="text-[11px] text-muted-foreground">Minecraft Server Manager</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-6 px-3 py-3 overflow-auto scrollbar-thin">
        <div className="space-y-1">
          {TOP_ITEMS.map((item) => (
            <NavRow key={item.to} item={item} />
          ))}
        </div>
        <div>
          <div className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Servidores
          </div>
          <div className="space-y-0.5">
            {servers.data?.length ? (
              servers.data.map((s) => {
                const isActive = activeServerId === s.id;
                return (
                  <NavLink
                    key={s.id}
                    to={`/servers/${s.id}`}
                    className={({ isActive: navActive }) =>
                      cn(
                        'relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                        navActive || isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      )
                    }
                  >
                    <StatusDot status={s.status} />
                    <span className="truncate">{s.name}</span>
                    {isActive ? (
                      <motion.div
                        layoutId="active-server"
                        className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
                      />
                    ) : null}
                  </NavLink>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Crea tu primer servidor para empezar.
              </div>
            )}
          </div>
        </div>
        {activeServerId ? <ServerSubNav serverId={activeServerId} /> : null}
      </nav>
      <div className="space-y-1 border-t border-border/60 p-3">
        {BOTTOM_ITEMS.map((item) => (
          <NavRow key={item.to} item={item} />
        ))}
      </div>
    </aside>
  );
}

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function ServerSubNav({ serverId }: { serverId: string }) {
  const items = [
    { to: `/servers/${serverId}/console`, label: 'Consola', icon: Terminal },
    { to: `/servers/${serverId}/plugins`, label: 'Plugins', icon: Puzzle },
    { to: `/servers/${serverId}/mods`, label: 'Mods', icon: Box },
    { to: `/servers/${serverId}/monitoring`, label: 'Monitor', icon: Activity },
    { to: `/servers/${serverId}/backups`, label: 'Backups', icon: Archive },
  ];
  return (
    <div>
      <div className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Servidor activo
      </div>
      <div className="space-y-0.5">
        {items.map((i) => (
          <NavRow key={i.to} item={i} />
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colour =
    status === 'running'
      ? 'bg-[hsl(var(--success))]'
      : status === 'starting' || status === 'stopping' || status === 'updating'
        ? 'bg-[hsl(var(--warning))] animate-pulse'
        : status === 'crashed'
          ? 'bg-destructive'
          : 'bg-muted-foreground/50';
  return <span className={cn('h-2 w-2 rounded-full', colour)} />;
}
