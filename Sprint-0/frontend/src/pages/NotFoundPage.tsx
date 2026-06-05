import { Link } from 'react-router-dom';
import { Pill, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-6">
      <div className="text-center animate-fade-in">
        <div className="h-20 w-20 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center mx-auto mb-6">
          <Pill className="h-10 w-10 text-teal-400" />
        </div>
        <h1 className="text-6xl font-extrabold text-white">404</h1>
        <p className="text-xl font-semibold text-slate-300 mt-2">Page not found</p>
        <p className="text-slate-500 mt-3 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 mt-8 btn-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
