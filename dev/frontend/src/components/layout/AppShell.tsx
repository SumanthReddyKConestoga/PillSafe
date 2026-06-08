import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/analyze': 'Analyze Medication',
  '/dashboard/profile': 'My Profile',
  '/dashboard/safety': 'Safety Records',
  '/dashboard/education': 'Medication Education',
};

export default function AppShell() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname];

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
