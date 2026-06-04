import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest">404</p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">Page not found</h1>
        <p className="mt-3 text-neutral-500 text-sm max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
