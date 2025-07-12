import { useState, useEffect, useCallback, useMemo } from 'react';
import { AutoSaveStatus } from '../types/response.types';
import { debounce } from 'lodash';

export const useAutoSave = (responses: any[], saveInterval: number = 30000) => {
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>({
    enabled: true,
    last_saved: null,
    saving: false
  });

  const saveResponses = useCallback(async () => {
    if (!saveStatus.enabled || saveStatus.saving) return;

    try {
      setSaveStatus(prev => ({ ...prev, saving: true, error: undefined }));
      
      // Save to localStorage as backup
      localStorage.setItem('dq_responses_backup', JSON.stringify({
        responses,
        timestamp: new Date().toISOString()
      }));

      // Here you would typically save to the server
      // await api.post('/questionnaire/auto-save', { responses });

      setSaveStatus(prev => ({
        ...prev,
        saving: false,
        last_saved: new Date()
      }));

    } catch (error) {
      setSaveStatus(prev => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Save failed'
      }));
    }
  }, [responses, saveStatus.enabled, saveStatus.saving]);

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(saveResponses, 2000),
    [saveResponses]
  );

  // Auto-save on interval
  useEffect(() => {
    if (!saveStatus.enabled) return;

    const interval = setInterval(saveResponses, saveInterval);
    return () => clearInterval(interval);
  }, [saveResponses, saveInterval, saveStatus.enabled]);

  // Save when responses change
  useEffect(() => {
    if (responses.length > 0) {
      debouncedSave();
    }
  }, [responses, debouncedSave]);

  const triggerSave = useCallback(() => {
    saveResponses();
  }, [saveResponses]);

  const toggleAutoSave = useCallback(() => {
    setSaveStatus(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  return {
    saveStatus,
    triggerSave,
    toggleAutoSave
  };
};
