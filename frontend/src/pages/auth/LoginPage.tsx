import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';

import { login, getMe } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

const TrustBadge = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2 text-emerald-100/80 text-sm">
    <span className="text-emerald-300">{icon}</span>
    {label}
  </div>
);

export default function LoginPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';
  const sessionExpired = searchParams.get('session') === 'expired';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const tokenResp = await login(values);
      const user = await getMe();
      setAuth(user, tokenResp.access_token);
      navigate(redirect, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.detail?.error?.message;
        setFormError(msg ?? 'An unexpected error occurred. Please try again.');
      } else {
        setFormError('Unable to connect. Please check your network and try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left hero panel */}
      <div
        className="hidden md:flex md:w-5/12 lg:w-1/2 flex-col justify-between p-10 lg:p-14"
        style={{ background: 'linear-gradient(160deg, #0A5040 0%, #0F6E56 50%, #185FA5 100%)' }}
      >
        <div className="flex items-center gap-3">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-hidden>
            <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.15" />
            <path d="M16 8a8 8 0 100 16A8 8 0 0016 8z" stroke="white" strokeWidth="1.5" />
            <path d="M13 16h6M16 13v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 10l2-2M10 22l-2 2" stroke="#E1F5EE" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-white font-bold text-xl tracking-tight">PillSafe</span>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Medication safety,<br />
              <span className="text-emerald-300">powered by AI.</span>
            </h1>
            <p className="mt-4 text-emerald-100/80 text-lg leading-relaxed">
              Identify pills, parse prescription labels, and get clear guidance — designed for patients who deserve to understand their medications.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <TrustBadge
              icon={<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>}
              label="PIPEDA Compliant"
            />
            <TrustBadge
              icon={<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>}
              label="End-to-End Encrypted"
            />
            <TrustBadge
              icon={<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 1a6 6 0 00-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 00.572.729 6.016 6.016 0 002.856 0A.75.75 0 0012 15.1v-.644c0-1.013.762-1.957 3.815-2.825A6 6 0 0010 1zM8.863 17.414a.75.75 0 00-.226 1.483 9.066 9.066 0 002.726 0 .75.75 0 00-.226-1.483 7.553 7.553 0 01-2.274 0z" /></svg>}
              label="Decision Support Only — Not a Replacement for Medical Advice"
            />
          </div>
        </div>

        <p className="text-emerald-100/50 text-xs">
          © {new Date().getFullYear()} PillSafe · Conestoga College AIML Program
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 bg-white">
        {/* Mobile brand bar */}
        <div className="md:hidden mb-8 flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#0F6E56" />
            <path d="M13 16h6M16 13v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-neutral-900 font-bold text-xl">PillSafe</span>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900">Welcome back</h2>
            <p className="mt-1 text-sm text-neutral-500">Sign in to access your medication profile</p>
          </div>

          {sessionExpired && (
            <div className="mb-5">
              <Alert variant="warning" title="Session expired">
                Your session has timed out. Please sign in again to continue.
              </Alert>
            </div>
          )}

          {formError && (
            <div className="mb-5">
              <Alert variant="error" onDismiss={() => setFormError(null)}>
                {formError}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              className="mt-2"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary hover:text-primary-dark">
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
