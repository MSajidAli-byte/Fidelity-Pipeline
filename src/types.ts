export interface FactItem {
  id: string;
  category: 'experience' | 'education' | 'project' | 'certification' | 'skill';
  role: string;
  company: string;
  timeframe?: string;
  bullet: string;
  tools: string[];
  metrics: string[];
  domain: string;
}

export interface FactBank {
  candidate_id: string;
  candidate_name: string;
  fact_bank: FactItem[];
}

export interface JobDescriptionAnalysis {
  job_title: string;
  company: string;
  must_haves: string[];
  nice_to_haves: string[];
  domain_context: string[];
  key_responsibilities: string[];
  required_tools: string[];
}

export interface EvidenceMatch {
  requirement: string;
  requirement_type: 'must_have' | 'nice_to_have' | 'domain' | 'tool';
  status: 'matched' | 'missing' | 'partial';
  matched_fact_ids: string[];
  notes: string;
}

export interface EvidenceSelectionOutput {
  evidence_ids: string[];
  matches: EvidenceMatch[];
  missing_requirements: string[];
  domain_overlap: string[];
  overall_fit_score: number;
}

export interface ResumeBullet {
  text: string;
  source_fact_ids: string[];
  metric_highlight?: string;
}

export interface TailoredRole {
  company: string;
  role: string;
  period: string;
  bullets: ResumeBullet[];
}

export interface GeneratedResume {
  candidate_name: string;
  target_title: string;
  summary: string;
  tailored_experience: TailoredRole[];
  skills: string[];
  education: string[];
}

export interface HallucinationViolation {
  claim: string;
  missing_evidence_reason: string;
  severity: 'high' | 'medium' | 'low';
}

export interface VerifiedClaim {
  claim: string;
  fact_id: string;
}

export interface UniquenessAnalysis {
  cosine_similarity_score: number;
  risk_flag: 'LOW_UNIQUENESS' | 'HEALTHY_VARIATION' | 'HIGHLY_UNIQUE';
  shared_phrases: string[];
  recommendation: string;
}

export interface FidelityAuditResult {
  overall_fidelity_score: number;
  hallucination_score: number;
  uniqueness_score: number;
  factuality_percentage: number;
  fluff_percentage: number;
  hallucinations_detected: HallucinationViolation[];
  verified_claims: VerifiedClaim[];
  uniqueness_analysis: UniquenessAnalysis;
  summary_narrative: string;
}

export interface PipelineExecutionResult {
  fact_bank: FactBank;
  jd_analysis: JobDescriptionAnalysis;
  evidence_selection: EvidenceSelectionOutput;
  generated_resume: GeneratedResume;
  audit: FidelityAuditResult;
  execution_time_ms: number;
}

export interface ScenarioPreset {
  id: string;
  title: string;
  role: string;
  company: string;
  description: string;
  candidate_a: {
    name: string;
    raw_resume: string;
  };
  candidate_b: {
    name: string;
    raw_resume: string;
  };
  job_description: string;
}

export interface ResumeIteration {
  id: string;
  timestamp: string;
  candidateName: string;
  targetTitle: string;
  presetTitle?: string;
  factBank: FactBank;
  jdAnalysis: JobDescriptionAnalysis;
  evidenceSelection: EvidenceSelectionOutput;
  generatedResume: GeneratedResume;
  auditResult: FidelityAuditResult | null;
  rawResume: string;
  jobDescription: string;
}

export type SubscriptionTierType = 'free' | 'pro' | 'enterprise';

export interface CreditUsageLog {
  id: string;
  timestamp: string;
  action: string;
  cost: number;
  remainingAfter: number;
}

export interface SubscriptionInfo {
  tier: SubscriptionTierType;
  creditsRemaining: number;
  monthlyAllowance: number;
  billingCycleEnd: string;
  usageHistory: CreditUsageLog[];
}

// --- FEATURE FLAGS & EMERGENCY KILL SWITCHES ---
export interface FeatureFlags {
  enableCoverLetter: boolean;
  enableBatchUploader: boolean;
  enableUniquenessTester: boolean;
  enableScraper: boolean;
  enableGapAnalysis: boolean;
  enablePDFExport: boolean;
  maintenanceMode: boolean;
  customMaintenanceNotice?: string;
}

export type FeatureFlagKey = keyof Omit<FeatureFlags, 'customMaintenanceNotice'>;

// --- TELEMETRY & SENTRY / BETTERSTACK LOGS ---
export type LogSeverity = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface TelemetryLog {
  id: string;
  timestamp: string;
  severity: LogSeverity;
  module: string;
  message: string;
  stackTrace?: string;
  latencyMs?: number;
  statusCode?: number;
  metadata?: Record<string, any>;
}

export interface SystemHealthMetrics {
  totalRequests: number;
  errorRatePercentage: number;
  averageLatencyMs: number;
  activeKillSwitchesCount: number;
  status: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
}

// --- USER AUTH & ROLE-BASED ACCESS CONTROL (RBAC) ---
export type UserRole = 'super_admin' | 'user';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  title: string;
}

