import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pill, ScanLine, Trash2, Clock4 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { prescriptionsApi } from '@/api/prescriptions';
import { useVoicePageAnnounce } from '@/hooks/useVoicePageAnnounce';
import { voice } from '@/lib/voiceAssistant';
import type { Prescription } from '@/types';

const SLOT_BADGE: Record<string, string> = {
  morning: 'slot-badge-morning',
  afternoon: 'slot-badge-afternoon',
  evening: 'slot-badge-evening',
  night: 'slot-badge-night',
};

export default function MyMedicationsPage() {
  useVoicePageAnnounce('My Medications');
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await prescriptionsApi.listMine();
      setPrescriptions(data);
      voice.speak(`You have ${data.length} active prescription${data.length === 1 ? '' : 's'}.`);
    } catch {
      setError('Could not load your medications. Please try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this medication from your active list?')) return;
    await prescriptionsApi.remove(id);
    setPrescriptions((prev) => prev?.filter((p) => p.id !== id) ?? null);
  };

  return (
    <div className="space-y-6 page-enter max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Medications</h1>
        <Link to="/dashboard/analyze">
          <Button>
            <ScanLine className="h-4 w-4" /> Add Prescription
          </Button>
        </Link>
      </div>

      {error && <Alert variant="error" message={error} />}

      {prescriptions && prescriptions.length === 0 && (
        <Card className="text-center py-14">
          <div className="h-16 w-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-4">
            <Pill className="h-8 w-8 text-teal-600" />
          </div>
          <p className="font-semibold text-slate-900">No medications yet</p>
          <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
            Scan your first prescription label and we&apos;ll keep track of your dosage and schedule.
          </p>
          <Link to="/dashboard/analyze" className="inline-block mt-5">
            <Button size="lg">
              <ScanLine className="h-4 w-4" /> Scan Your First Prescription
            </Button>
          </Link>
        </Card>
      )}

      {prescriptions && prescriptions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prescriptions.map((p) => (
            <Card key={p.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-lg">{p.drug_name}</p>
                  {p.dosage && <p className="text-base text-slate-600 mt-0.5">{p.dosage}</p>}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${p.drug_name}`}
                  onClick={() => handleRemove(p.id)}
                  className="h-11 w-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-danger-text hover:bg-danger-bg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {p.time_slots.map((slot) => (
                  <span key={slot} className={`badge ${SLOT_BADGE[slot] ?? ''}`}>
                    {slot.charAt(0).toUpperCase() + slot.slice(1)}
                  </span>
                ))}
              </div>

              {p.specific_times.length > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Clock4 className="h-3.5 w-3.5" />
                  {p.specific_times.join(', ')}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
