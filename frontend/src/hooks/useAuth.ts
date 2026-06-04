import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getMe } from '@/api/auth';

export function useAuthGuard() {
  const { isAuthenticated, setAuth, clearAuth, setLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
      return;
    }

    // Rehydrate user from server on mount (token may still be valid from persist)
    setLoading(true);
    getMe()
      .then((user) => {
        const token = useAuthStore.getState().accessToken ?? '';
        setAuth(user, token);
      })
      .catch(() => {
        clearAuth();
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useAuth() {
  return useAuthStore();
}
