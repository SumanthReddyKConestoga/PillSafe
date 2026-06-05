import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

const styles: Record<AlertVariant, { wrapper: string; icon: React.ReactNode }> = {
  success: {
    wrapper: 'bg-teal-500/10 border border-teal-500/30 text-teal-300',
    icon: <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />,
  },
  error: {
    wrapper: 'bg-red-500/10 border border-red-500/30 text-red-300',
    icon: <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />,
  },
  warning: {
    wrapper: 'bg-amber-500/10 border border-amber-500/30 text-amber-300',
    icon: <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />,
  },
  info: {
    wrapper: 'bg-blue-500/10 border border-blue-500/30 text-blue-300',
    icon: <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />,
  },
};

interface AlertProps {
  variant?: AlertVariant;
  message: string;
  className?: string;
}

export function Alert({ variant = 'info', message, className = '' }: AlertProps) {
  const { wrapper, icon } = styles[variant];
  return (
    <div className={`flex items-start gap-3 rounded-xl p-4 text-sm ${wrapper} ${className}`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}
