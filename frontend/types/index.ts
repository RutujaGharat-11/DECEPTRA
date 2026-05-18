export interface AnalysisResult {
  risk?: 'Low' | 'Medium' | 'High';
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence?: number;
  confidence_score?: number;
  indicators?: string[];
  signals?: string[];
  explanation?: string;
  safety_actions?: string[];
  urgency_level?: number;
  authority_claim?: number;
  emotional_pressure?: number;
  financial_request?: number;
  document_category?: string;
  document_type?: string;
  message_type?: string;
  platform?: string;
  platform_confidence?: string;
  platform_evidence?: string;
  ui_clues_detected?: string[];
  sender?: string;
  is_suspicious_sender?: boolean;
  sender_reason?: string;
  original_text?: string;
  extracted_text?: string;
  risk_flags?: string[];
  suspicious_domains?: { domain: string; impersonating: string }[];
  domain_verification?: { domain: string; verification: { verified: boolean; domain_age_days?: number; suspicious: boolean; reason?: string } }[];
  detected_qr_data?: string[];
  detected_links?: { url: string; risk: string }[];
  why_detected?: string[];
  risk_breakdown?: string;
  user_impact?: string;
  recommended_action?: string;
  
  // Modality-aware fields
  modality?: 'text' | 'image' | 'document' | 'audio';
  risk_findings?: string[];
  detected_source?: string;
  qr_data?: string[];
  qr_payload?: string;
  qr_risk?: string;
  qr_detected?: boolean;
  platform_detected?: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
