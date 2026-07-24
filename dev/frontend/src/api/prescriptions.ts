import client from './client';
import type { DinResolutionResult, Prescription, PrescriptionUploadResponse } from '@/types';

export const prescriptionsApi = {
  upload: (image: Blob) => {
    const form = new FormData();
    form.append('image', image, 'prescription.jpg');
    return client.post<PrescriptionUploadResponse>('/prescriptions', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  resolveDin: (id: string) =>
    client.post<DinResolutionResult>(`/prescriptions/${id}/resolve-din`),

  listMine: () => client.get<Prescription[]>('/prescriptions/me'),

  update: (id: string, payload: Partial<Prescription>) =>
    client.patch<Prescription>(`/prescriptions/${id}`, payload),

  remove: (id: string) => client.delete(`/prescriptions/${id}`),

  getImageBlob: (id: string) =>
    client.get<Blob>(`/prescriptions/${id}/image`, { responseType: 'blob' }),
};
