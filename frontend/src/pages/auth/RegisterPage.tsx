import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';

import { register as registerApi, getMe } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

const step1Schema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/\d/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const step2Schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().refine((v) => {
    const dob = new Date(v);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    return age >= 18;
  }, 'You must be at least 18 years old'),
  preferred_language: z.string().min(1),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

function PasswordStrengthMeter({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const levels = [
    { label: 'Weak', color: 'bg-danger' },
    { label: 'Fair', color: 'bg-warning' },
    { label: 'Strong', color: 'bg-yellow-400' },
    { label: 'Very strong', color: 'bg-success' },
  ];
  if (!password) return null;
  const level = levels[Math.min(score - 1, 3)];
  return (
    <div className="mt-2" aria-label={`Password strength: ${level?.label ?? ''}`}>
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? level?.color : 'bg-neutral-200'}`}
          />
        ))}
      </div>
      {level && <p className="text-xs text-neutral-500">{level.label}</p>}
    </div>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={[
              'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
              i + 1 < current ? 'bg-primary text-white' :
              i + 1 === current ? 'bg-primary text-white ring-4 ring-primary-light' :
              'bg-neutral-200 text-neutral-500',
            ].join(' ')}
            aria-current={i + 1 === current ? 'step' : undefined}
          >
            {i + 1 < current ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            ) : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-12 h-0.5 mx-1 ${i + 1 < current ? 'bg-primary' : 'bg-neutral-200'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-sm text-neutral-500 font-medium">
        {['Account', 'Profile', 'Confirm'][current - 1]}
      </span>
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const form1 = useForm<Step1Values>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { preferred_language: 'en' },
  });

  const watchedPassword = form1.watch('password', '');

  const onStep1 = (values: Step1Values) => {
    setStep1Data(values);
    setStep(2);
  };

  const onStep2 = async (values: Step2Values) => {
    if (!step1Data) return;
    setFormError(null);
    try {
      const tokenResp = await registerApi({
        email: step1Data.email,
        password: step1Data.password,
        first_name: values.first_name,
        last_name: values.last_name,
        date_of_birth: values.date_of_birth,
        preferred_language: values.preferred_language,
      });
      const user = await getMe();
      setAuth(user, tokenResp.access_token);
      setStep(3);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.detail?.error?.message;
        if (err.response?.status === 409) {
          setStep(1);
          form1.setError('email', { message: msg ?? 'This email is already registered.' });
        } else {
          setFormError(msg ?? 'Registration failed. Please try again.');
        }
      } else {
        setFormError('Unable to connect. Please check your network.');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel */}
      <div
        className="hidden md:flex md:w-5/12 lg:w-1/2 flex-col justify-center p-10 lg:p-14"
        style={{ background: 'linear-gradient(160deg, #0A5040 0%, #0F6E56 60%, #185FA5 100%)' }}
      >
        <div className="flex items-center gap-3 mb-10">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-hidden>
            <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.15" />
            <path d="M13 16h6M16 13v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-white font-bold text-xl">PillSafe</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
          Your health journey<br />starts here.
        </h2>
        <p className="mt-4 text-emerald-100/80 leading-relaxed">
          Create your secure patient profile in under 2 minutes. We'll keep your data safe and only use it to provide you with personalized medication guidance.
        </p>
        <div className="mt-8 space-y-3">
          {['No credit card required', 'PIPEDA-compliant data storage', 'Cancel or delete anytime'].map((t) => (
            <div key={t} className="flex items-center gap-2 text-emerald-100/80 text-sm">
              <svg className="h-4 w-4 text-emerald-300 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 bg-white">
        <div className="md:hidden mb-8 flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#0F6E56" />
            <path d="M13 16h6M16 13v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-xl text-neutral-900">PillSafe</span>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900">Create your account</h2>
            <p className="mt-1 text-sm text-neutral-500">Safe, private, and free</p>
          </div>

          <StepIndicator current={step} total={3} />

          {formError && (
            <div className="mb-5">
              <Alert variant="error" onDismiss={() => setFormError(null)}>{formError}</Alert>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={form1.handleSubmit(onStep1)} noValidate className="space-y-4 page-enter">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                error={form1.formState.errors.email?.message}
                {...form1.register('email')}
              />
              <div>
                <Input
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  error={form1.formState.errors.password?.message}
                  {...form1.register('password')}
                />
                <PasswordStrengthMeter password={watchedPassword} />
              </div>
              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                error={form1.formState.errors.confirmPassword?.message}
                {...form1.register('confirmPassword')}
              />
              <Button type="submit" fullWidth size="lg" className="mt-2">Continue</Button>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={form2.handleSubmit(onStep2)} noValidate className="space-y-4 page-enter">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  autoComplete="given-name"
                  error={form2.formState.errors.first_name?.message}
                  {...form2.register('first_name')}
                />
                <Input
                  label="Last name"
                  autoComplete="family-name"
                  error={form2.formState.errors.last_name?.message}
                  {...form2.register('last_name')}
                />
              </div>
              <Input
                label="Date of birth"
                type="date"
                error={form2.formState.errors.date_of_birth?.message}
                {...form2.register('date_of_birth')}
              />
              <div>
                <label htmlFor="lang" className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Preferred language
                </label>
                <select
                  id="lang"
                  className="block w-full rounded-lg border border-neutral-200 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...form2.register('preferred_language')}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="zh">中文</option>
                  <option value="pa">ਪੰਜਾਬੀ</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  isLoading={form2.formState.isSubmitting}
                >
                  {form2.formState.isSubmitting ? 'Creating account…' : 'Create account'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3 — confirmation */}
          {step === 3 && (
            <div className="text-center py-6 page-enter">
              <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Account created!</h3>
              <p className="mt-2 text-neutral-500 text-sm">Redirecting you to your dashboard…</p>
            </div>
          )}

          {step < 3 && (
            <p className="mt-6 text-center text-sm text-neutral-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
