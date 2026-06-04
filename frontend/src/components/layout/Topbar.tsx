import { useAuthStore } from '@/store/authStore';

interface TopbarProps {
  onMenuToggle: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user } = useAuthStore();
  const greeting = getGreeting();
  const initials = getInitials(user?.first_name ?? null, user?.last_name ?? null);
  const displayName = user?.first_name ?? user?.email ?? '';

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <p className="text-sm font-medium text-neutral-700 hidden sm:block">
          {greeting},{' '}
          <span className="text-neutral-900 font-semibold">{displayName}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="relative p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </button>

        <div
          className="h-9 w-9 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center cursor-pointer select-none"
          aria-label={`User avatar for ${displayName}`}
          title={user?.email}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
