import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  FactBank,
  JobDescriptionAnalysis,
  EvidenceSelectionOutput,
  GeneratedResume,
  FidelityAuditResult,
  ScenarioPreset,
  ResumeIteration,
} from '../types';
import { BENCHMARK_PRESETS } from '../data/presets';
import { extractCandidateName } from '../lib/fileParser';

export interface CandidateContextType {
  // Candidate Profile Core State
  candidateName: string;
  setCandidateName: (name: string) => void;
  rawResume: string;
  setRawResume: (resumeText: string) => void;
  jobDescription: string;
  setJobDescription: (jdText: string) => void;

  // Scenario Preset
  selectedPreset: ScenarioPreset;
  setSelectedPreset: (preset: ScenarioPreset) => void;

  // Active Pipeline Outputs
  factBank: FactBank | null;
  setFactBank: React.Dispatch<React.SetStateAction<FactBank | null>>;
  jdAnalysis: JobDescriptionAnalysis | null;
  setJdAnalysis: React.Dispatch<React.SetStateAction<JobDescriptionAnalysis | null>>;
  evidenceSelection: EvidenceSelectionOutput | null;
  setEvidenceSelection: React.Dispatch<React.SetStateAction<EvidenceSelectionOutput | null>>;
  generatedResume: GeneratedResume | null;
  setGeneratedResume: React.Dispatch<React.SetStateAction<GeneratedResume | null>>;
  auditResult: FidelityAuditResult | null;
  setAuditResult: React.Dispatch<React.SetStateAction<FidelityAuditResult | null>>;

  // Active Iteration Tracking
  activeIterationId: string | null;
  setActiveIterationId: React.Dispatch<React.SetStateAction<string | null>>;

  // Synchronized Actions
  loadIteration: (iteration: ResumeIteration) => void;
  updateCandidateFromBatch: (candidateName: string, rawResume: string, factBank: FactBank) => void;
  resetToPreset: (preset: ScenarioPreset) => void;
}

const CandidateContext = createContext<CandidateContextType | undefined>(undefined);

export const CandidateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPreset, setSelectedPresetState] = useState<ScenarioPreset>(BENCHMARK_PRESETS[0]);

  const [candidateName, setCandidateName] = useState<string>(selectedPreset.candidate_a.name);
  const [rawResume, setRawResume] = useState<string>(selectedPreset.candidate_a.raw_resume);
  const [jobDescription, setJobDescription] = useState<string>(selectedPreset.job_description);

  const [factBank, setFactBank] = useState<FactBank | null>(null);
  const [jdAnalysis, setJdAnalysis] = useState<JobDescriptionAnalysis | null>(null);
  const [evidenceSelection, setEvidenceSelection] = useState<EvidenceSelectionOutput | null>(null);
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const [auditResult, setAuditResult] = useState<FidelityAuditResult | null>(null);

  const [activeIterationId, setActiveIterationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('fidelity_active_iteration_id_v1') || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (activeIterationId) {
      localStorage.setItem('fidelity_active_iteration_id_v1', activeIterationId);
    } else {
      localStorage.removeItem('fidelity_active_iteration_id_v1');
    }
  }, [activeIterationId]);

  // Auto-detect and synchronize candidateName whenever rawResume or factBank updates
  useEffect(() => {
    if (factBank?.candidate_name && factBank.candidate_name.trim().length > 0) {
      setCandidateName(factBank.candidate_name);
      return;
    }

    if (rawResume && rawResume.trim().length > 0) {
      const detectedName = extractCandidateName(rawResume);
      if (detectedName) {
        setCandidateName(detectedName);
      }
    }
  }, [rawResume, factBank?.candidate_name]);

  // When preset changes, reset state to match selected preset candidate
  const setSelectedPreset = (preset: ScenarioPreset) => {
    setSelectedPresetState(preset);
    setCandidateName(preset.candidate_a.name);
    setRawResume(preset.candidate_a.raw_resume);
    setJobDescription(preset.job_description);
    setFactBank(null);
    setJdAnalysis(null);
    setEvidenceSelection(null);
    setGeneratedResume(null);
    setAuditResult(null);
    setActiveIterationId(null);
  };

  const resetToPreset = (preset: ScenarioPreset) => {
    setSelectedPreset(preset);
  };

  const loadIteration = (iteration: ResumeIteration) => {
    setActiveIterationId(iteration.id);
    setCandidateName(iteration.candidateName);
    setRawResume(iteration.rawResume);
    setJobDescription(iteration.jobDescription);
    setFactBank(iteration.factBank);
    setJdAnalysis(iteration.jdAnalysis);
    setEvidenceSelection(iteration.evidenceSelection);
    setGeneratedResume(iteration.generatedResume);
    setAuditResult(iteration.auditResult);
  };

  const updateCandidateFromBatch = (name: string, resumeText: string, fb: FactBank) => {
    setCandidateName(name);
    setRawResume(resumeText);
    setFactBank(fb);
    setJdAnalysis(null);
    setEvidenceSelection(null);
    setGeneratedResume(null);
    setAuditResult(null);
    setActiveIterationId(null);
  };

  return (
    <CandidateContext.Provider
      value={{
        candidateName,
        setCandidateName,
        rawResume,
        setRawResume,
        jobDescription,
        setJobDescription,
        selectedPreset,
        setSelectedPreset,
        factBank,
        setFactBank,
        jdAnalysis,
        setJdAnalysis,
        evidenceSelection,
        setEvidenceSelection,
        generatedResume,
        setGeneratedResume,
        auditResult,
        setAuditResult,
        activeIterationId,
        setActiveIterationId,
        loadIteration,
        updateCandidateFromBatch,
        resetToPreset,
      }}
    >
      {children}
    </CandidateContext.Provider>
  );
};

export const useCandidate = (): CandidateContextType => {
  const context = useContext(CandidateContext);
  if (!context) {
    throw new Error('useCandidate must be used within a CandidateProvider');
  }
  return context;
};
