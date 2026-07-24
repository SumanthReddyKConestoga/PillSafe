import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import type { DinResolutionResult } from '@/types';

interface DinConfirmPickerProps {
  drugName: string;
  resolution: DinResolutionResult;
  onConfirm: (din: string) => void;
  onDismiss: () => void;
}

export default function DinConfirmPicker({ drugName, resolution, onConfirm, onDismiss }: DinConfirmPickerProps) {
  const [selectedDin, setSelectedDin] = useState<string | null>(
    resolution.status === 'confirm' ? resolution.candidates[0]?.din ?? null : null,
  );

  if (resolution.status === 'not_found') {
    return null;
  }

  if (resolution.status === 'too_many_candidates') {
    return (
      <Alert
        variant="info"
        message={`We couldn't automatically narrow down which "${drugName}" product this is (too many similar matches). You can link it to a specific product later from My Medications.`}
      />
    );
  }

  if (resolution.status === 'confirm') {
    const candidate = resolution.candidates[0];
    return (
      <Card className="border-blue-200 bg-blue-50/40 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Is this your medication?</p>
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="font-semibold text-slate-900">{candidate.product}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            DIN {candidate.din} · {candidate.active_ingredient ?? 'unknown ingredient'} · {candidate.strength ?? '—'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onDismiss}>Not this one</Button>
          <Button onClick={() => onConfirm(candidate.din)}>
            <CheckCircle2 className="h-4 w-4" /> Yes, that's it
          </Button>
        </div>
      </Card>
    );
  }

  // pick_list
  return (
    <Card className="space-y-3">
      <p className="text-sm font-semibold text-slate-900">
        Which product matches your "{drugName}" prescription?
      </p>
      <div className="space-y-2">
        {resolution.candidates.map((c) => (
          <button
            key={c.din}
            type="button"
            onClick={() => setSelectedDin(c.din)}
            className={`w-full text-left flex items-start justify-between rounded-xl border p-3 transition-colors ${
              selectedDin === c.din
                ? 'border-primary bg-teal-50'
                : 'border-slate-100 hover:border-teal-300'
            }`}
          >
            <div>
              <p className="font-semibold text-slate-900">{c.product}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                DIN {c.din} · {c.active_ingredient ?? 'unknown ingredient'} · {c.strength ?? '—'}
              </p>
            </div>
          </button>
        ))}
      </div>
      {resolution.total_candidate_count > resolution.candidates.length && (
        <p className="text-xs text-slate-500">
          Showing {resolution.candidates.length} of {resolution.total_candidate_count} matches.
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onDismiss}>Skip for now</Button>
        <Button disabled={!selectedDin} onClick={() => selectedDin && onConfirm(selectedDin)}>
          Confirm selection
        </Button>
      </div>
    </Card>
  );
}
