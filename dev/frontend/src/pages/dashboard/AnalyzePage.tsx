import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Pill, FileText, Loader2, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { CameraCapture } from '@/components/CameraCapture';
import { DisclaimerModal } from '@/components/DisclaimerModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { prescriptionsApi } from '@/api/prescriptions';
import { pillApi } from '@/api/pill';
import { voice } from '@/lib/voiceAssistant';
import { useVoicePageAnnounce } from '@/hooks/useVoicePageAnnounce';
import type { Prescription, PillAnalysisResult } from '@/types';

type Mode = 'prescription' | 'pill';
type Stage = 'capture' | 'uploading' | 'done' | 'error';

const SLOT_BADGE: Record<string, string> = {
  morning: 'slot-badge-morning',
  afternoon: 'slot-badge-afternoon',
  evening: 'slot-badge-evening',
  night: 'slot-badge-night',
};

function isWithinScheduleWindow(specificTimes: string[]): { withinWindow: boolean; nextTime: string | null } {
  if (specificTimes.length === 0) return { withinWindow: true, nextTime: null };
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let closestFuture: string | null = null;
  let closestFutureDelta = Infinity;

  for (const time of specificTimes) {
    const [h, m] = time.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    if (Math.abs(slotMinutes - nowMinutes) <= 60) {
      return { withinWindow: true, nextTime: null };
    }
    const delta = slotMinutes >= nowMinutes ? slotMinutes - nowMinutes : slotMinutes + 1440 - nowMinutes;
    if (delta < closestFutureDelta) {
      closestFutureDelta = delta;
      closestFuture = time;
    }
  }
  return { withinWindow: false, nextTime: closestFuture };
}

async function checkGuardrail(detectedNames: string[]) {
  const { data: prescriptions } = await prescriptionsApi.listMine();
  const lowerDetected = detectedNames.map((n) => n.toLowerCase());

  const matched = prescriptions.find((p) =>
    lowerDetected.some((d) => d.length > 2 && (p.drug_name.toLowerCase().includes(d) || d.includes(p.drug_name.toLowerCase()))),
  );

  if (!matched) return { status: 'unmatched' as const, prescription: null, timing: null };

  const timing = isWithinScheduleWindow(matched.specific_times);
  return { status: 'matched' as const, prescription: matched, timing };
}

export default function AnalyzePage() {
  useVoicePageAnnounce('Analyze Medication');

  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('prescription');
  const [stage, setStage] = useState<Stage>('capture');
  const [errorMsg, setErrorMsg] = useState('');
  const [showResultDisclaimer, setShowResultDisclaimer] = useState(false);
  const [prescriptionResult, setPrescriptionResult] = useState<Prescription | null>(null);
  const [pillResult, setPillResult] = useState<PillAnalysisResult | null>(null);
  const [guardrail, setGuardrail] = useState<Awaited<ReturnType<typeof checkGuardrail>> | null>(null);

  const reset = useCallback(() => {
    setStage('capture');
    setErrorMsg('');
    setPrescriptionResult(null);
    setPillResult(null);
    setGuardrail(null);
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    reset();
  };

  const handlePrescriptionCapture = async (blob: Blob) => {
    setStage('uploading');
    try {
      const { data } = await prescriptionsApi.upload(blob);
      setPrescriptionResult(data);
      setStage('done');
      setShowResultDisclaimer(true);
      voice.speak(`${data.drug_name} detected. Saved to your medications.`);
    } catch {
      setErrorMsg('Could not read that prescription label. Please retake the photo in good lighting.');
      setStage('error');
    }
  };

  const handlePillCapture = async (blob: Blob) => {
    setStage('uploading');
    try {
      const { data } = await pillApi.analyze(blob);
      setPillResult(data);
      const candidateNames = data.candidates.map((c) => c.product);
      const guard = await checkGuardrail(candidateNames);
      setGuardrail(guard);
      setStage('done');
      setShowResultDisclaimer(true);
      if (guard.status === 'matched') {
        voice.speak('This matches your prescription.');
      } else {
        voice.speak('Warning. This pill does not match any of your active prescriptions.');
      }
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { detail?: { error?: { code?: string; message?: string } } } } })
        ?.response?.data?.detail?.error;
      setErrorMsg(
        code?.code === 'CV_UNAVAILABLE'
          ? 'Pill detection isn’t available on this server yet — opencv-python-headless needs to be installed.'
          : code?.message ?? 'Could not analyze that pill. Try a plain, well-lit background.',
      );
      setStage('error');
    }
  };

  return (
    <div className="space-y-6 page-enter max-w-4xl mx-auto">
      <div className="flex gap-2" role="tablist" aria-label="Scan mode">
        <button
          role="tab"
          aria-selected={mode === 'prescription'}
          onClick={() => switchMode('prescription')}
          className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
            mode === 'prescription' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
          }`}
        >
          <FileText className="h-4 w-4" /> Scan Prescription
        </button>
        <button
          role="tab"
          aria-selected={mode === 'pill'}
          onClick={() => switchMode('pill')}
          className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
            mode === 'pill' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
          }`}
        >
          <Pill className="h-4 w-4" /> Scan Pill
        </button>
      </div>

      {stage === 'capture' && (
        <Card>
          <CameraCapture
            captureLabel={mode === 'prescription' ? 'Capture prescription label' : 'Capture pill photo'}
            onConfirm={(blob) => (mode === 'prescription' ? handlePrescriptionCapture(blob) : handlePillCapture(blob))}
          />
        </Card>
      )}

      {stage === 'uploading' && (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
            <p className="text-slate-900 font-semibold">
              {mode === 'prescription' ? 'Reading your prescription label…' : 'Identifying your pill…'}
            </p>
            <p className="text-slate-500 text-sm">This usually takes a few seconds.</p>
          </div>
        </Card>
      )}

      {stage === 'error' && (
        <div className="space-y-4">
          <Alert variant="error" message={errorMsg} />
          <Button onClick={reset}>Try Again</Button>
        </div>
      )}

      {stage === 'done' && (
        <DisclaimerModal open={showResultDisclaimer} onAccept={() => setShowResultDisclaimer(false)} />
      )}

      {stage === 'done' && !showResultDisclaimer && prescriptionResult && (
        <div className="space-y-5 animate-slide-up">
          <Card className="border-success-border bg-success-bg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-success-text shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Prescription saved</p>
                <p className="text-sm text-slate-700 mt-1">
                  <strong>{prescriptionResult.drug_name}</strong>
                  {prescriptionResult.dosage ? ` · ${prescriptionResult.dosage}` : ''}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {prescriptionResult.time_slots.map((slot) => (
                    <span key={slot} className={`badge ${SLOT_BADGE[slot] ?? ''}`}>
                      {slot.charAt(0).toUpperCase() + slot.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={reset}>Scan Another</Button>
            <Button onClick={() => navigate('/dashboard/medications')}>
              View My Medications <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {stage === 'done' && !showResultDisclaimer && pillResult && (
        <div className="space-y-5 animate-slide-up">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <ScanLine className="h-4 w-4 text-teal-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Detected Attributes</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge bg-slate-100 text-slate-700 border border-slate-200">Colour: {pillResult.detected_color}</span>
              <span className="badge bg-slate-100 text-slate-700 border border-slate-200">Shape: {pillResult.detected_shape}</span>
              <span className="badge bg-slate-100 text-slate-700 border border-slate-200">
                Imprint: {pillResult.detected_imprint ?? 'none detected'}
              </span>
            </div>
          </Card>

          {guardrail?.status === 'matched' ? (
            <Alert
              variant="success"
              message={`This matches your prescription for ${guardrail.prescription?.drug_name}.`}
            />
          ) : (
            <Alert
              variant="error"
              message="This pill does not match any medication in your active prescriptions. Do not take this pill without consulting your pharmacist."
            />
          )}

          {guardrail?.status === 'matched' && guardrail.timing && !guardrail.timing.withinWindow && (
            <Alert
              variant="warning"
              message={`You are not scheduled to take ${guardrail.prescription?.drug_name} at this time.${
                guardrail.timing.nextTime ? ` Your next dose is at ${guardrail.timing.nextTime}.` : ''
              }`}
            />
          )}

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Pill className="h-4 w-4 text-teal-600" />
              <h3 className="font-semibold text-slate-900 text-sm">DIN Database Candidates</h3>
            </div>
            {pillResult.candidates.length === 0 ? (
              <p className="text-sm text-slate-500">
                No matches found in our database yet. The DIN reference table is still being populated.
              </p>
            ) : (
              <div className="space-y-3">
                {pillResult.candidates.map((c) => (
                  <div key={c.din} className="flex items-start justify-between border border-slate-100 rounded-xl p-3">
                    <div>
                      <p className="font-semibold text-slate-900">{c.product}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        DIN {c.din} · {c.active_ingredient ?? 'unknown ingredient'} · {c.strength ?? '—'}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-teal-600">{Math.round(c.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {pillResult.claude_description && (
            <Card className="border-blue-200 bg-blue-50/40">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">AI Guidance (not medical advice)</p>
                  <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{pillResult.claude_description}</p>
                </div>
              </div>
            </Card>
          )}

          <Button variant="secondary" onClick={reset}>Scan Another</Button>
        </div>
      )}
    </div>
  );
}
