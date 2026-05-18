import { fetchWithAuth } from './api';
import { AnalysisResult } from '../types';

export const analyzeDocument = async (file: File): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append('file', file);

  return fetchWithAuth('/analyze/document', {
    method: 'POST',
    body: formData,
  });
};
