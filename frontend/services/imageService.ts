import { fetchWithAuth } from './api';
import { AnalysisResult } from '../types';

export const analyzeImage = async (file: File): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append('file', file);

  // When sending FormData, do not set Content-Type header manually; 
  // the browser will set it with the correct boundary.
  return fetchWithAuth('/analyze/image', {
    method: 'POST',
    body: formData,
  });
};
