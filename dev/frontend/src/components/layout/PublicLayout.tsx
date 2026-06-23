import { Link, Outlet, useLocation } from 'react-router-dom';
import { Pill } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function PublicLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { pathname } = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        pathname === to ? 'text-teal-700' : 'text-slate-600 hover:text-teal-700'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">PillSafe</span>
          </Link>
          <nav className="flex items-center gap-6">
            {navLink('/about', 'About')}
            {navLink('/contact', 'Contact')}
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary !px-4 !py-2">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-teal-700">Sign In</Link>
                <Link to="/register" className="btn-primary !px-4 !py-2">Get Started</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-slate-400">
          PillSafe · Decision support only — always confirm with a licensed pharmacist or physician.
        </div>
      </footer>
    </div>
  );
}
