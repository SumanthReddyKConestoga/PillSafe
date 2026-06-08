import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pill, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  password: z
    .string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/\d/, 'Must contain a number'),
  preferred_language: z.string().default('en'),
});
type FormData = z.infer<typeof schema>;

const passwordRules = [
  { test: (p: string) => p.length >= 8, label: '8+ characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Uppercase letter' },
  { test: (p: string) => /\d/.test(p), label: 'Number' },
];

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const { t } = useTranslation();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const password = watch('password', '');

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await registerUser(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message;
      setServerError(msg ?? 'Registration failed. Please try again.');
    }
  };

  const stats = [
    { value: '100K+', label: 'Deaths prevented annually' },
    { value: '< 5s', label: 'Verification speed' },
    { value: '95%+', label: 'Accuracy rate' },
    { value: '12+', label: 'Languages supported' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden bg-brand-hero">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-white/8 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <Pill className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">PillSafe</p>
              <p className="text-xs text-teal-100">Medication Auditor</p>
            </div>
          </div>

          <div className="space-y-5">
            <h1 className="text-3xl font-extrabold text-white leading-tight">
              Join thousands protecting their medication safety
            </h1>

            <div className="grid grid-cols-2 gap-4">
              {stats.map(({ value, label }) => (
                <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
                  <p className="text-2xl font-extrabold text-white">{value}</p>
                  <p className="text-xs text-teal-100/70 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-white">No raw patient data stored</span>
            </div>
            <p className="text-xs text-teal-100/70">
              Only structured, de-identified pipeline outputs reach our AI layer. HIPAA-aware design.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-start justify-center px-6 py-10 overflow-y-auto bg-white">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <p className="text-xl font-bold text-slate-900">PillSafe</p>
          </div>

          {/* Language switcher */}
          <div className="flex justify-end mb-6">
            <LanguageSwitcher />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">{t('auth.register.title')}</h2>
            <p className="text-slate-500 mt-1.5 text-sm">{t('auth.register.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && <Alert variant="error" message={serverError} />}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('auth.register.firstName')}
                placeholder="Jane"
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <Input
                label={t('auth.register.lastName')}
                placeholder="Smith"
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>

            <Input
              label={t('auth.register.email')}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label={t('auth.register.dob')}
              type="date"
              error={errors.date_of_birth?.message}
              hint={t('auth.register.dobHint')}
              {...register('date_of_birth')}
            />

            <div>
              <label className="label">{t('auth.register.password')}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  className={`input-field pr-12 ${errors.password ? 'input-error' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
              <div className="flex gap-2 mt-2">
                {passwordRules.map(({ test, label }) => (
                  <span
                    key={label}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      test(password)
                        ? 'bg-teal-50 border-teal-300 text-teal-700'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              {t('auth.register.submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t('auth.register.haveAccount')}{' '}
            <Link to="/login" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
              {t('auth.register.signIn')}
            </Link>
          </p>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400">
              {t('auth.register.disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
