import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface TopbarProps {
  title?: string;
}

export default function Topbar({ title }: TopbarProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-16 bg-navy-900 border-b border-navy-700 flex items-center justify-between px-6 shrink-0">
      {title ? <h1 className="text-lg font-semibold text-white">{title}</h1> : <div />}

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-navy-800 border border-navy-600 rounded-xl px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <span className="text-xs">Search medications…</span>
          <kbd className="hidden md:block text-xs bg-navy-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </div>

        <button className="relative h-9 w-9 rounded-xl bg-navy-800 border border-navy-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-teal-500/50 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal-500" />
        </button>

        <div className="h-9 w-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
          <span className="text-teal-400 text-sm font-bold">
            {user?.first_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
      </div>
    </header>
  );
}
