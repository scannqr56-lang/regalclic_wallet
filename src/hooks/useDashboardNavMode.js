import { useEffect, useState } from 'react';
import {
  readStoredNavMode,
  resolveAdvancedNavMode,
  writeStoredNavMode,
} from '@/lib/dashboard-nav';

export function useDashboardNavMode(onboardingComplete = false) {
  const [storedMode, setStoredMode] = useState(readStoredNavMode);

  useEffect(() => {
    setStoredMode(readStoredNavMode());
  }, [onboardingComplete]);

  const isAdvancedMode = resolveAdvancedNavMode({ storedMode, onboardingComplete });

  const setNavMode = (advanced) => {
    const mode = advanced ? 'advanced' : 'beginner';
    writeStoredNavMode(mode);
    setStoredMode(mode);
  };

  return {
    isAdvancedMode,
    setAdvancedMode: () => setNavMode(true),
    setBeginnerMode: () => setNavMode(false),
    toggleNavMode: () => setNavMode(!isAdvancedMode),
  };
}
