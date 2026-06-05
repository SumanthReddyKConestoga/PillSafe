import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pill, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
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

  return (
    <div className="min-h-screen flex bg-navy-950">
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-teal-900/40">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-teal-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-teal-600/6 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-teal-500 flex items-center justify-center glow-teal">
              <Pill className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">PillSafe</p>
              <p className="text-xs text-teal-400">Medication Auditor</p>
            </div>
          </div>

          <div className="space-y-5">
            <h1 className="text-3xl font-extrabold text-white leading-tight">
              Join thousands protecting their{' '}
              <span className="text-gradient">medication safety</span>
            </h1>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '100K+', label: 'Deaths prevented annually' },
                { value: '< 5s', label: 'Verification speed' },
                { value: '95%+', label: 'Accuracy rate' },
                { value: '12+', label: 'Languages supported' },
              ].map(({ value, label }) => (
                <div key={label} className="card-glass p-4">
                  <p className="text-2xl font-extrabold text-teal-400">{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-glass p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-full bg-teal-500 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-white">No raw patient data stored</span>
            </div>
            <p className="text-xs text-slate-400">
              Only structured, de-identified pipeline outputs reach our AI layer. HIPAA-aware design.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-lg animate-fade-in">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-teal-500 flex items-center justify-center">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <p className="text-xl font-bold text-white">PillSafe</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="text-slate-400 mt-1.5 text-sm">Start protecting your medication safety today</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && <Alert variant="error" message={serverError} />}

            <div className="grid grid-cols-2 gap-4">
              <Input label="First name" placeholder="Jane" error={errors.first_name?.message} {...register('first_name')} />
              <Input label="Last name" placeholder="Smith" error={errors.last_name?.message} {...register('last_name')} />
            </div>

            <Input label="Email address" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email?.message} {...register('email')} />

            <Input label="Date of birth" type="date" error={errors.date_of_birth?.message} hint="Must be 18 or older" {...register('date_of_birth')} />

            <div>
              <label className="label">Password</label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
              <div className="flex gap-2 mt-2">
                {passwordRules.map(({ test, label }) => (
                  <span key={label} className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${test(password) ? 'bg-teal-500/15 border-teal-500/40 text-teal-400' : 'bg-navy-800 border-navy-600 text-slate-500'}`}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">Sign in</Link>
          </p>

          <p className="mt-6 text-center text-xs text-slate-600">
            Decision support tool only. Always confirm with your pharmacist or physician.
          </p>
        </div>
      </div>
    </div>
  );
}
