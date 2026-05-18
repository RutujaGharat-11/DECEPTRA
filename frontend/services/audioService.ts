import { fetchWithAuth } from './api';
import { AnalysisResult } from '../types';

export const analyzeAudio = async (file: File): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append('file', file);

  return fetchWithAuth('/analyze/audio', {
    method: 'POST',
    body: formData,
  });
};
