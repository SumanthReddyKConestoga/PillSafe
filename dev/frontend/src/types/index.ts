export interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  medications_analyzed: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface PillInfo {
  pill_id: string;
  name: string;
  confidence: number;
  color: string;
  shape: string;
  imprint: string | null;
}

export interface LabelInfo {
  drug_name: string | null;
  dosage: string | null;
  frequency: string | null;
  refills_remaining: number | null;
  expiry_date: string | null;
}

export interface AnalyzeResult {
  request_id: string;
  status: string;
  pills_detected: PillInfo[];
  label: LabelInfo;
  guidance: string;
  safety_alerts: string[];
  ml_pipeline_enabled: boolean;
}

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export interface Prescription {
  id: string;
  drug_name: string;
  dosage: string | null;
  frequency_text: string | null;
  time_slots: TimeSlot[];
  specific_times: string[];
  prescribing_doctor: string | null;
  refills_remaining: number | null;
  expiry_date: string | null;
  is_active: boolean;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface DinCandidate {
  din: string;
  product: string;
  active_ingredient: string | null;
  strength: string | null;
  colour: string | null;
  shape: string | null;
  imprint: string | null;
  confidence: number;
}

export interface PillAnalysisResult {
  detected_color: string;
  detected_shape: string;
  detected_imprint: string | null;
  candidates: DinCandidate[];
  claude_description: string | null;
}

export interface ScanRecord {
  id: string;
  created_at: string;
  drug_name: string | null;
  match_status: 'matched' | 'unmatched' | 'warning';
  action_taken: string;
  image_filename: string | null;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  preferred_language: string;
  phone_number: string | null;
  medications_analyzed: number;
  last_scan_at: string | null;
  notifications_enabled: boolean;
  created_at: string;
}
