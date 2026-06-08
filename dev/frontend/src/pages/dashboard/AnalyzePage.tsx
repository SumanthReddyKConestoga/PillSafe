import { useState, useRef, useCallback } from 'react';
import {
  Upload, ImageIcon, ScanLine, CheckCircle2, AlertTriangle,
  Pill, FileText, Loader2, X, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import client from '@/api/client';
import type { AnalyzeResult } from '@/types';

type Stage = 'idle' | 'preview' | 'analyzing' | 'done' | 'error';

export default function AnalyzePage() {
  const [stage, setStage] = useState<Stage>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (JPG, PNG, WebP).');
      setStage('error');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStage('preview');
    setErrorMsg('');
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const reset = () => {
    setStage('idle');
    setFile(null);
    setPreview(null);
    setResult(null);
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const analyze = async () => {
    if (!file) return;
    setStage('analyzing');
    const form = new FormData();
    form.append('image', file);
    try {
      const { data } = await client.post<AnalyzeResult>('/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      setStage('done');
    } catch {
      setErrorMsg('Analysis failed. Please try again with a clearer image.');
      setStage('error');
    }
  };

  const confidencePct = result ? Math.round((result.pills_detected[0]?.confidence ?? 0) * 100) : 0;

  return (
    <div className="space-y-6 page-enter max-w-4xl mx-auto">
      {stage === 'idle' && (
        <Card className="bg-gradient-to-r from-teal-600/10 to-transparent border-teal-600/30">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
              <ScanLine className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">How it works</h2>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Upload a photo of your prescription bottle or loose pills. Our AI will identify the medication,
                parse the label, and flag any safety concerns in under 5 seconds.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Pill ID', 'OCR Label', 'Drug Interactions', 'Plain-Language Guidance'].map((tag) => (
                  <span key={tag} className="badge bg-teal-500/10 text-teal-400 border border-teal-500/20">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {(stage === 'idle' || stage === 'error') && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 p-14 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
            dragging ? 'border-teal-400 bg-teal-500/10 scale-[1.01]' : 'border-navy-600 bg-navy-800/50 hover:border-teal-600/60 hover:bg-teal-500/5'
          }`}
        >
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-teal-500/25' : 'bg-navy-700'}`}>
            <Upload className={`h-8 w-8 transition-colors ${dragging ? 'text-teal-300' : 'text-slate-500'}`} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">{dragging ? 'Drop to upload' : 'Drop a photo here'}</p>
            <p className="text-slate-500 text-sm mt-1">or click to browse — JPG, PNG, WebP</p>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      )}

      {stage === 'error' && errorMsg && <Alert variant="error" message={errorMsg} />}

      {(stage === 'preview' || stage === 'analyzing') && preview && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <ImageIcon className="h-4 w-4 text-teal-400" />{file?.name}
            </div>
            <button onClick={reset} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="h-4 w-4" /></button>
          </div>
          <div className="relative">
            <img src={preview} alt="uploaded pill" className="w-full max-h-72 object-cover" />
            {stage === 'analyzing' && (
              <div className="absolute inset-0 bg-navy-900/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 text-teal-400 animate-spin" />
                <p className="text-white font-semibold">Analyzing…</p>
                <p className="text-slate-400 text-sm">Running CV + OCR + NLP pipeline</p>
              </div>
            )}
          </div>
          {stage === 'preview' && (
            <div className="px-5 py-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">Ready to analyze</p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={reset} size="sm">Change</Button>
                <Button onClick={analyze} size="sm"><ScanLine className="h-4 w-4" />Analyze</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {stage === 'done' && result && (
        <div className="space-y-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Analysis Complete</p>
                <p className="text-xs text-slate-500">ID: {result.request_id.slice(0, 8)}…</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={reset}><RefreshCw className="h-3.5 w-3.5" />New Scan</Button>
          </div>

          {result.safety_alerts.length > 0 && <Alert variant="warning" message={result.safety_alerts.join(' • ')} />}
          {!result.ml_pipeline_enabled && <Alert variant="info" message="Demo mode: showing sample results. ML pipeline activates in Sprint 4." />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Pill className="h-4 w-4 text-teal-400" strokeWidth={1.8} />
                <h3 className="font-semibold text-white text-sm">Pill Identification</h3>
              </div>
              {result.pills_detected.map((pill) => (
                <div key={pill.pill_id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">{pill.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{pill.color} · {pill.shape} · {pill.imprint ?? 'no imprint'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-teal-400">{confidencePct}%</p>
                      <p className="text-xs text-slate-500">confidence</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-700" style={{ width: `${confidencePct}%` }} />
                  </div>
                </div>
              ))}
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-blue-400" strokeWidth={1.8} />
                <h3 className="font-semibold text-white text-sm">Label Information</h3>
              </div>
              <dl className="space-y-2.5">
                {[
                  ['Drug Name', result.label.drug_name],
                  ['Dosage', result.label.dosage],
                  ['Frequency', result.label.frequency],
                  ['Refills Remaining', result.label.refills_remaining],
                  ['Expiry', result.label.expiry_date],
                ].map(([key, val]) => (
                  <div key={String(key)} className="flex justify-between text-sm">
                    <dt className="text-slate-500">{key}</dt>
                    <dd className="text-white font-medium">{String(val ?? '—')}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-teal-600/8 to-transparent border-teal-600/30">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-teal-400" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Guidance</p>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{result.guidance}</p>
                <p className="text-xs text-slate-600 mt-3 border-t border-navy-700 pt-3">
                  Decision support only. Always confirm with your pharmacist or physician.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
