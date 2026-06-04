import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/Card';

interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  accent?: string;
}

function StatTile({ label, value, sublabel, icon, accent = 'bg-primary-light text-primary' }: StatTileProps) {
  return (
    <Card className="flex items-start gap-4">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-neutral-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-neutral-900 mt-0.5">{value}</p>
        {sublabel && <p className="text-xs text-neutral-500 mt-0.5">{sublabel}</p>}
      </div>
    </Card>
  );
}

const PillIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
  </svg>
);

const ScanIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

export default function DashboardPage() {
  const { user } = useAuthStore();
  const firstName = user?.first_name ?? 'there';

  return (
    <div className="space-y-6 page-enter">
      {/* Welcome card */}
      <Card className="bg-gradient-to-r from-primary to-primary-dark text-white border-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Welcome back, {firstName}!</h1>
            <p className="mt-1 text-emerald-100/80 text-sm">
              Your medication safety dashboard is ready. Upload a prescription bottle to get started.
            </p>
          </div>
          <Link
            to="/dashboard/analyze"
            className="inline-flex items-center gap-2 bg-white text-primary px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition-colors shrink-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Analyze Medication
          </Link>
        </div>
      </Card>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile
          label="Medications Analyzed"
          value="0"
          sublabel="Upload your first to get started"
          icon={<PillIcon />}
          accent="bg-primary-light text-primary"
        />
        <StatTile
          label="Last Scan"
          value="Never"
          sublabel="No scans yet"
          icon={<ScanIcon />}
          accent="bg-accent-light text-accent"
        />
        <StatTile
          label="Safety Alerts"
          value="0"
          sublabel="All clear"
          icon={<AlertIcon />}
          accent="bg-green-50 text-success"
        />
      </div>

      {/* CTA card */}
      <Card className="border-dashed border-2 border-neutral-200 bg-neutral-50 text-center py-10">
        <div className="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-neutral-900">Upload your first medication</h3>
        <p className="mt-1 text-sm text-neutral-500 max-w-xs mx-auto">
          Take a photo of your prescription bottle. PillSafe will identify the pill and parse the label in seconds.
        </p>
        <Link
          to="/dashboard/analyze"
          className="mt-5 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          Get started
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </Card>

      {/* Disclaimer */}
      <p className="text-xs text-neutral-400 text-center leading-relaxed">
        PillSafe provides decision support only. Always confirm medication information with your pharmacist or physician.
        This tool does not store images or personal health data beyond your session.
      </p>
    </div>
  );
}
