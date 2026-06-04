import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppShell } from '@/components/layout/AppShell';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import NotFoundPage from '@/pages/NotFoundPage';

function RequireAuth() {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    const redirect = encodeURIComponent(window.location.pathname);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <Outlet />;
}

function RedirectIfAuth() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

function AnalyzePlaceholder() {
  return (
    <div className="page-enter">
      <h2 className="text-xl font-bold text-neutral-900">Analyze Medication</h2>
      <p className="mt-2 text-neutral-500 text-sm">
        The ML pipeline integration is coming in Sprint 4. This page will allow you to upload a prescription bottle image for analysis.
      </p>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page-enter">
      <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
      <p className="mt-2 text-neutral-500 text-sm">This section is coming soon.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuth />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/dashboard/analyze', element: <AnalyzePlaceholder /> },
          { path: '/dashboard/medications', element: <PlaceholderPage title="My Medications" /> },
          { path: '/dashboard/history', element: <PlaceholderPage title="History" /> },
          { path: '/dashboard/profile', element: <PlaceholderPage title="Profile" /> },
          { path: '/dashboard/settings', element: <PlaceholderPage title="Settings" /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <NotFoundPage /> },
]);
