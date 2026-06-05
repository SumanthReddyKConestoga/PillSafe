import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  User,
  Shield,
  BookOpen,
  LogOut,
  Pill,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/analyze', label: 'Analyze Medication', icon: ScanLine },
];

const bottomItems = [
  { to: '/dashboard/profile', label: 'My Profile', icon: User },
  { to: '/dashboard/safety', label: 'Safety Records', icon: Shield },
  { to: '/dashboard/education', label: 'Med Education', icon: BookOpen },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-navy-900 border-r border-navy-700 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 pt-6 pb-4 border-b border-navy-700">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-9 w-9 rounded-xl bg-teal-500 flex items-center justify-center glow-teal">
            <Pill className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-base leading-none">PillSafe</p>
            <p className="text-xs text-teal-400 mt-0.5">Medication Auditor</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}

        <div className="pt-4">
          <p className="px-3 pb-2 text-xs font-semibold text-navy-500 uppercase tracking-wider">More</p>
          {bottomItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-navy-700 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-navy-800 border border-navy-600">
          <div className="h-8 w-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
            <span className="text-teal-400 text-xs font-bold">
              {user?.first_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : user?.email}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
