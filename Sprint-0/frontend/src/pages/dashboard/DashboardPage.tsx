import { Link } from 'react-router-dom';
import {
  ScanLine, ShieldCheck, Activity, Clock, ArrowRight,
  Pill, AlertTriangle, BookOpen, TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: string;
}

function StatCard({ label, value, sub, icon, iconBg = 'bg-teal-500/15 text-teal-400', trend }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-teal-400 text-xs font-medium">
          <TrendingUp className="h-3.5 w-3.5" />{trend}
        </div>
      )}
    </div>
  );
}

const quickActions = [
  { to: '/dashboard/analyze', icon: ScanLine, label: 'Analyze Medication', desc: 'Upload a photo to verify your pills', badge: null, accent: 'group-hover:text-teal-400' },
  { to: '/dashboard/safety', icon: ShieldCheck, label: 'Safety Records', desc: 'View your verification history', badge: null, accent: 'group-hover:text-blue-400' },
  { to: '/dashboard/education', icon: BookOpen, label: 'Medication Guide', desc: 'Learn about your prescriptions', badge: 'New', accent: 'group-hover:text-purple-400' },
];

const safetyTips = [
  { icon: Clock, tip: 'Take medications at the same time each day to build a routine.' },
  { icon: AlertTriangle, tip: 'Never crush or split pills without asking your pharmacist first.' },
  { icon: Activity, tip: 'Keep an updated medication list with you at all times.' },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.first_name ?? 'there';

  return (
    <div className="space-y-6 page-enter max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-teal-700 to-navy-800 p-6 border border-teal-600/40">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-400/10" />
        <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-teal-500/10" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-teal-200 text-sm font-medium">Good to see you,</p>
            <h1 className="text-2xl font-extrabold text-white mt-0.5">
              {firstName.charAt(0).toUpperCase() + firstName.slice(1)}!
            </h1>
            <p className="text-teal-100/70 text-sm mt-1.5 max-w-md">
              Your medication dashboard is ready. Upload a prescription photo to get an instant safety check.
            </p>
          </div>
          <Link to="/dashboard/analyze" className="inline-flex items-center gap-2 bg-white text-teal-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-colors shrink-0 shadow-lg">
            <ScanLine className="h-4 w-4" />Analyze Now<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Medications Analyzed" value={String(user?.medications_analyzed ?? 0)} sub="Upload your first to start" icon={<Pill className="h-5 w-5" strokeWidth={1.8} />} />
        <StatCard label="Safety Score" value="—" sub="Scan to generate score" icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.8} />} iconBg="bg-blue-500/15 text-blue-400" />
        <StatCard label="Interactions Found" value="0" sub="No alerts this session" icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.8} />} iconBg="bg-amber-500/15 text-amber-400" />
        <StatCard label="Adherence Streak" value="—" sub="Set up reminders to track" icon={<Activity className="h-5 w-5" strokeWidth={1.8} />} iconBg="bg-purple-500/15 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map(({ to, icon: Icon, label, desc, badge, accent }) => (
              <Link key={to} to={to} className="group card p-5 hover:border-teal-600/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-900/20">
                <div className="flex items-start justify-between">
                  <Icon className={`h-6 w-6 text-slate-500 transition-colors duration-200 ${accent}`} strokeWidth={1.6} />
                  {badge && <span className="badge bg-teal-500/15 text-teal-400 border border-teal-500/30">{badge}</span>}
                </div>
                <p className="mt-4 font-semibold text-white text-sm">{label}</p>
                <p className="mt-1 text-xs text-slate-500">{desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-600 group-hover:text-teal-400 transition-colors">
                  Open <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-navy-700 flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">Recent Activity</h2>
              <button className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all</button>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4 py-3">
                <div className="h-8 w-8 rounded-lg bg-navy-700 flex items-center justify-center text-slate-500 shrink-0">
                  <Pill className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">No scans yet</p>
                  <p className="text-xs text-slate-600 mt-0.5">Your verification history will appear here</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Safety Tips</h2>
          <div className="space-y-3">
            {safetyTips.map(({ icon: Icon, tip }) => (
              <Card key={tip} padding="sm" className="flex items-start gap-3 hover:border-teal-600/40 transition-colors">
                <div className="h-7 w-7 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-teal-400" strokeWidth={1.8} />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{tip}</p>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-navy-700">
              <h3 className="text-sm font-semibold text-white">Today's Schedule</h3>
            </div>
            <div className="px-4 py-3">
              <div className="grid grid-cols-7 gap-1 mb-3">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${i === new Date().getDay() - 1 ? 'bg-teal-500 text-white' : 'bg-navy-700 text-slate-500'}`}>
                    {d}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 text-center">No medications scheduled yet</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
