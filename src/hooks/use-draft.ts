import { useState, useEffect, useCallback } from 'react';

interface UseDraftOptions {
  key: string;
  autosaveDelay?: number;
}

export function useDraft<T>(initialData: T, options: UseDraftOptions) {
  const { key, autosaveDelay = 2000 } = options;
  const [data, setData] = useState<T>(initialData);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(`draft_${key}`);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setData(parsed.data);
        setLastSaved(new Date(parsed.timestamp));
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [key]);

  // Autosave draft
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true);
      const draftData = {
        data,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`draft_${key}`, JSON.stringify(draftData));
      setLastSaved(new Date());
      setIsSaving(false);
    }, autosaveDelay);

    return () => clearTimeout(timer);
  }, [data, key, autosaveDelay]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(`draft_${key}`);
    setLastSaved(null);
  }, [key]);

  const saveDraft = useCallback(() => {
    setIsSaving(true);
    const draftData = {
      data,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`draft_${key}`, JSON.stringify(draftData));
    setLastSaved(new Date());
    setIsSaving(false);
  }, [data, key]);

  return {
    data,
    setData,
    lastSaved,
    isSaving,
    clearDraft,
    saveDraft,
  };
}
