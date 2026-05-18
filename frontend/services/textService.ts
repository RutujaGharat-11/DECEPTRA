import { fetchWithAuth } from './api';
import { AnalysisResult } from '../types';

export const analyzeText = async (text: string): Promise<AnalysisResult> => {
  return fetchWithAuth('/analyze/text', {
    method: 'POST',
    body: JSON.stringify({ message: text }),
  });
};
