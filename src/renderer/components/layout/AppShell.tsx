import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-6xl px-8 py-8 animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
