import React, { createContext, useContext, useState, useEffect } from 'react';
import { FeatureFlags, FeatureFlagKey } from '../types';
import { useTelemetry } from './TelemetryContext';

interface FeatureFlagContextType {
  flags: FeatureFlags;
  toggleFlag: (key: FeatureFlagKey) => void;
  setMaintenanceNotice: (notice: string) => void;
  resetAllFlags: () => void;
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (open: boolean) => void;
  activeKillSwitchCount: number;
}

const STORAGE_KEY = 'fidelity_feature_flags_v1';

const DEFAULT_FLAGS: FeatureFlags = {
  enableCoverLetter: true,
  enableBatchUploader: true,
  enableUniquenessTester: true,
  enableScraper: true,
  enableGapAnalysis: true,
  enablePDFExport: true,
  maintenanceMode: false,
  customMaintenanceNotice: 'Cover Letter Generator is currently undergo temporary prompt calibration. Normal service will resume shortly.',
};

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const telemetry = useTelemetry();

  const [flags, setFlags] = useState<FeatureFlags>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load feature flags:', e);
    }
    return DEFAULT_FLAGS;
  });

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch (e) {
      console.error('Failed to save feature flags:', e);
    }
  }, [flags]);

  const toggleFlag = (key: FeatureFlagKey) => {
    setFlags((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };

      // Log Emergency Kill Switch event into Telemetry
      const severity = nextVal ? 'INFO' : 'WARN';
      const actionName = nextVal ? 'ACTIVATED' : 'DEACTIVATED (KILL SWITCH ENGAGED)';
      telemetry.captureLog(
        severity,
        'Feature Flag Admin',
        `Feature '${key}' was ${actionName} by Administrator.`,
        { featureKey: key, newState: nextVal }
      );

      return updated;
    });
  };

  const setMaintenanceNotice = (notice: string) => {
    setFlags((prev) => ({ ...prev, customMaintenanceNotice: notice }));
  };

  const resetAllFlags = () => {
    setFlags(DEFAULT_FLAGS);
    telemetry.captureLog('INFO', 'Feature Flag Admin', 'Reset all feature flags to default enabled state.');
  };

  // Count active kill switches (disabled features or enabled maintenance mode)
  const activeKillSwitchCount =
    (flags.maintenanceMode ? 1 : 0) +
    (!flags.enableCoverLetter ? 1 : 0) +
    (!flags.enableBatchUploader ? 1 : 0) +
    (!flags.enableUniquenessTester ? 1 : 0) +
    (!flags.enableScraper ? 1 : 0) +
    (!flags.enableGapAnalysis ? 1 : 0) +
    (!flags.enablePDFExport ? 1 : 0);

  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        toggleFlag,
        setMaintenanceNotice,
        resetAllFlags,
        isAdminModalOpen,
        setIsAdminModalOpen,
        activeKillSwitchCount,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};
