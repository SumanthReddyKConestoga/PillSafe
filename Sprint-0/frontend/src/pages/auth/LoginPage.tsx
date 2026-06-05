import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Eye, EyeOff, Pill, ScanLine, Activity } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

const features = [
  { icon: ScanLine, title: 'Visual Pill Verification', desc: 'AI identifies pills by color, shape, and imprint' },
  { icon: Activity, title: 'Drug Interaction Checker', desc: 'Flags dangerous combinations automatically' },
  { icon: ShieldCheck, title: 'Accessible Design', desc: '12+ languages, audio assistance, visual pictograms' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await login(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message;
      setServerError(msg ?? 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex bg-navy-950">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-teal-900/40">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-teal-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-[500px] w-[500px] rounded-full bg-teal-600/8 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-teal-500 flex items-center justify-center glow-teal">
              <Pill className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">PillSafe</p>
              <p className="text-xs text-teal-400">Medication Auditor</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-extrabold text-white leading-tight">
                Medication safety,{' '}
                <span className="text-gradient">made accessible</span>
              </h1>
              <p className="mt-4 text-slate-400 leading-relaxed max-w-md">
                AI-powered verification for elderly, visually impaired, and non-native speaking patients.
                Preventing 100,000+ annual medication errors.
              </p>
            </div>

            <div className="space-y-4">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-teal-400" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-glass p-4">
            <p className="text-sm text-slate-300 italic">
              "My mother accidentally took her morning medication twice. PillSafe would have caught that."
            </p>
            <p className="text-xs text-teal-400 mt-2">— Family caregiver</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-teal-500 flex items-center justify-center">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <p className="text-xl font-bold text-white">PillSafe</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-slate-400 mt-1.5 text-sm">Sign in to your medication dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && <Alert variant="error" message={serverError} />}

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
            </div>

            <div className="flex items-center justify-end">
              <button type="button" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                Forgot password?
              </button>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-navy-700">
            <p className="text-center text-xs text-slate-600">
              Decision support tool only. Always confirm with your pharmacist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
