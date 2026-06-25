import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScanLine, ShieldCheck, Activity, Clock, ArrowRight,
  Pill, AlertTriangle, BookOpen, TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { prescriptionsApi } from '@/api/prescriptions';
import { voice } from '@/lib/voiceAssistant';
import type { Prescription, TimeSlot } from '@/types';

const SLOT_BADGE: Record<TimeSlot, string> = {
  morning: 'slot-badge-morning',
  afternoon: 'slot-badge-afternoon',
  evening: 'slot-badge-evening',
  night: 'slot-badge-night',
};

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: string;
}

function StatCard({ label, value, sub, icon, iconBg = 'bg-teal-50 text-teal-600', trend }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-teal-600 text-xs font-medium">
          <TrendingUp className="h-3.5 w-3.5" />{trend}
        </div>
      )}
    </div>
  );
}

interface DoseRow {
  prescription: Prescription;
  time: string;
  label: string;
}

function buildTodaysDoses(prescriptions: Prescription[]): DoseRow[] {
  const rows: DoseRow[] = [];
  for (const p of prescriptions) {
    for (const time of p.specific_times) {
      const [h, m] = time.split(':').map(Number);
      const suffix = h < 12 ? 'AM' : 'PM';
      const h12 = h % 12 || 12;
      rows.push({ prescription: p, time, label: `${h12}:${String(m).padStart(2, '0')} ${suffix}` });
    }
  }
  return rows.sort((a, b) => a.time.localeCompare(b.time));
}

function findNextDose(rows: DoseRow[]): { row: DoseRow; minutesUntil: number } | null {
  if (rows.length === 0) return null;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let best: { row: DoseRow; minutesUntil: number } | null = null;
  for (const row of rows) {
    const [h, m] = row.time.split(':').map(Number);
    const rowMinutes = h * 60 + m;
    const delta = rowMinutes >= nowMinutes ? rowMinutes - nowMinutes : rowMinutes + 1440 - nowMinutes;
    if (!best || delta < best.minutesUntil) best = { row, minutesUntil: delta };
  }
  return best;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  const firstName = user?.first_name ?? 'there';
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(null);

  useEffect(() => {
    prescriptionsApi.listMine().then(({ data }) => {
      setPrescriptions(data);
      voice.speak(`Good morning ${firstName}. You have ${data.length} medication${data.length === 1 ? '' : 's'} scheduled today.`);
    }).catch(() => setPrescriptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live countdown — re-render every 30s so "in 12 minutes" stays accurate.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const todaysDoses = buildTodaysDoses(prescriptions ?? []);
  const nextDose = findNextDose(todaysDoses);
  const hasSchedule = todaysDoses.length > 0;

  const quickActions = [
    { to: '/dashboard/analyze', icon: ScanLine, label: t('dashboard.actions.analyze'), desc: t('dashboard.actions.analyzeDesc'), badge: null, accent: 'group-hover:text-teal-600' },
    { to: '/dashboard/medications', icon: Pill, label: 'My Medications', desc: 'View and manage your active prescriptions', badge: null, accent: 'group-hover:text-teal-600' },
    { to: '/dashboard/safety', icon: ShieldCheck, label: t('dashboard.actions.safety'), desc: t('dashboard.actions.safetyDesc'), badge: null, accent: 'group-hover:text-blue-600' },
    { to: '/dashboard/education', icon: BookOpen, label: t('dashboard.actions.education'), desc: t('dashboard.actions.educationDesc'), badge: 'New', accent: 'group-hover:text-purple-600' },
  ];

  const safetyTips = [
    { icon: Clock, tip: t('dashboard.tips.routine') },
    { icon: AlertTriangle, tip: t('dashboard.tips.crush') },
    { icon: Activity, tip: t('dashboard.tips.list') },
  ];

  return (
    <div className="space-y-6 page-enter max-w-6xl mx-auto">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 p-6">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-teal-200 text-sm font-medium">{t('dashboard.greeting')}</p>
            <h1 className="text-2xl font-extrabold text-white mt-0.5">
              {firstName.charAt(0).toUpperCase() + firstName.slice(1)}!
            </h1>
            <p className="text-white/70 text-sm mt-1.5 max-w-md">{t('dashboard.tagline')}</p>
          </div>
          <Link
            to="/dashboard/analyze"
            className="inline-flex items-center gap-2 bg-white text-teal-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-colors shrink-0 shadow-lg"
          >
            <ScanLine className="h-4 w-4" />
            {t('dashboard.analyzeNow')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('dashboard.stats.analyzed')}
          value={String(user?.medications_analyzed ?? 0)}
          sub={t('dashboard.stats.analyzedSub')}
          icon={<Pill className="h-5 w-5" strokeWidth={1.8} />}
        />
        <StatCard
          label={t('dashboard.stats.safetyScore')}
          value="—"
          sub={t('dashboard.stats.safetyScoreSub')}
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.8} />}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          label={t('dashboard.stats.interactions')}
          value="0"
          sub={t('dashboard.stats.interactionsSub')}
          icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.8} />}
          iconBg="bg-amber-50 text-amber-600"
        />
        <StatCard
          label={t('dashboard.stats.adherence')}
          value="—"
          sub={t('dashboard.stats.adherenceSub')}
          icon={<Activity className="h-5 w-5" strokeWidth={1.8} />}
          iconBg="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('dashboard.quickActions')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map(({ to, icon: Icon, label, desc, badge, accent }) => (
              <Link
                key={to}
                to={to}
                className="group card p-5 hover:border-teal-300 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <Icon className={`h-6 w-6 text-slate-400 transition-colors duration-200 ${accent}`} strokeWidth={1.6} />
                  {badge && <span className="badge bg-teal-50 text-teal-600 border border-teal-200">{badge}</span>}
                </div>
                <p className="mt-4 font-semibold text-slate-900 text-sm">{label}</p>
                <p className="mt-1 text-xs text-slate-500">{desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-400 group-hover:text-teal-600 transition-colors">
                  {t('dashboard.open')} <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>

          {/* Recent activity */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm">{t('dashboard.recentActivity')}</h2>
              <button className="text-xs text-teal-600 hover:text-teal-700 transition-colors">{t('dashboard.viewAll')}</button>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4 py-3">
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                  <Pill className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{t('dashboard.noScans')}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.noScansSub')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('dashboard.safetyTips')}</h2>
          <div className="space-y-3">
            {safetyTips.map(({ icon: Icon, tip }) => (
              <Card key={tip} padding="sm" className="flex items-start gap-3 hover:border-teal-200 transition-colors">
                <div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-teal-600" strokeWidth={1.8} />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{tip}</p>
              </Card>
            ))}
          </div>

          {/* Next dose hero */}
          {nextDose && (
            <Card className="border-teal-300 bg-gradient-to-br from-teal-50 to-white overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Next dose</p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                    {nextDose.row.prescription.drug_name}
                    {nextDose.row.prescription.dosage ? ` · ${nextDose.row.prescription.dosage}` : ''}
                  </p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {nextDose.row.label} ·{' '}
                    {nextDose.minutesUntil < 60
                      ? `in ${nextDose.minutesUntil} min`
                      : `in ${Math.floor(nextDose.minutesUntil / 60)}h ${nextDose.minutesUntil % 60}m`}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Today's schedule — chronological */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">{t('dashboard.todaySchedule')}</h3>
            </div>
            <div className="px-4 py-3">
              {!hasSchedule ? (
                <p className="text-xs text-slate-400 text-center py-2">{t('dashboard.noMeds')}</p>
              ) : (
                <div className="space-y-2">
                  {todaysDoses.map((row) => (
                    <div
                      key={`${row.prescription.id}-${row.time}`}
                      className={`flex items-center gap-3 py-2 px-2 rounded-lg ${
                        nextDose?.row === row ? 'bg-teal-50 border border-teal-200' : ''
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-700 w-20 shrink-0">{row.label}</span>
                      <span className={`badge ${SLOT_BADGE[row.prescription.time_slots[0] ?? 'morning']} shrink-0`}>
                        {row.prescription.time_slots[0]
                          ? row.prescription.time_slots[0].charAt(0).toUpperCase() + row.prescription.time_slots[0].slice(1)
                          : ''}
                      </span>
                      <span className="text-sm text-slate-700 truncate">
                        {row.prescription.drug_name}
                        {row.prescription.dosage ? <span className="text-slate-400"> · {row.prescription.dosage}</span> : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
