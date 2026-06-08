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
