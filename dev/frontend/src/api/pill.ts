import client from './client';
import type { PillAnalysisResult } from '@/types';

export const pillApi = {
  analyze: (image: Blob) => {
    const form = new FormData();
    form.append('image', image, 'pill.jpg');
    return client.post<PillAnalysisResult>('/analyze/pill', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
