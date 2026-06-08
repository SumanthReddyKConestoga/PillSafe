import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const pageTitleKeys: Record<string, string> = {
  '/dashboard': 'nav.dashboard',
  '/dashboard/analyze': 'nav.analyze',
  '/dashboard/profile': 'nav.profile',
  '/dashboard/safety': 'nav.safety',
  '/dashboard/education': 'nav.education',
  '/admin/dashboard': 'admin.dashboard',
  '/admin/users': 'admin.users',
};

export default function AppShell() {
  const { pathname } = useLocation();
  const titleKey = pageTitleKeys[pathname];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar titleKey={titleKey} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
