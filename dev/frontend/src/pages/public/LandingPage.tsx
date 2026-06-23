import { Link } from 'react-router-dom';
import { ScanLine, FileText, ShieldCheck, Heart, ArrowRight, Eye, Users, Camera } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const STEPS = [
  { n: 1, icon: Camera, title: 'Scan', desc: 'Photograph your prescription label or pill with your camera.' },
  { n: 2, icon: FileText, title: 'Read', desc: 'PillSafe reads the label and identifies the medication.' },
  { n: 3, icon: ShieldCheck, title: 'Verify', desc: 'We check it against your active prescriptions for a safety match.' },
  { n: 4, icon: Heart, title: 'Stay Safe', desc: 'Get plain-language guidance and clear warnings before you take it.' },
];

const AUDIENCES = [
  { icon: Users, title: 'Elderly Patients', desc: 'Large text, voice readouts, and a simple camera-first workflow.' },
  { icon: Heart, title: 'Caregivers', desc: 'Track medications and schedules for the people you care for.' },
  { icon: Eye, title: 'Visually Impaired', desc: 'Full voice assistant support reads results and schedules aloud.' },
];

export default function LandingPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Know what you&apos;re taking,<br />before you take it.
          </h1>
          <p className="mt-5 text-teal-50/90 max-w-2xl mx-auto text-lg">
            PillSafe uses AI-powered scanning to verify your medications and prescriptions —
            built for patients who deserve to understand what they&apos;re taking.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="inline-flex items-center gap-2 bg-white text-teal-700 px-6 py-3 rounded-xl font-semibold hover:bg-teal-50 transition-colors shadow-lg">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors">
              Sign In
            </Link>
          </div>
          <p className="mt-6 text-xs text-teal-100/70">
            Decision support only — always confirm with a licensed pharmacist or physician.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {STEPS.map(({ n, icon: Icon, title, desc }) => (
            <Card key={n} className="text-center">
              <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-3">
                <Icon className="h-6 w-6 text-teal-600" />
              </div>
              <p className="font-semibold text-slate-900">{n}. {title}</p>
              <p className="text-sm text-slate-500 mt-1.5">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Who it&apos;s for</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {AUDIENCES.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="text-center">
                <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="text-sm text-slate-500 mt-1.5">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <ScanLine className="h-10 w-10 text-teal-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Ready to verify your medications?</h2>
        <p className="text-slate-500 mt-2">Create a free account and scan your first prescription in minutes.</p>
        <Link to="/register" className="inline-flex items-center gap-2 mt-6 btn-primary !px-6 !py-3">
          Create Free Account <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
