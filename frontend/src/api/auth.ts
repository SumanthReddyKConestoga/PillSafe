import apiClient from './client';
import type { LoginPayload, RegisterPayload, TokenResponse, User } from '@/types';

export async function register(payload: RegisterPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/register', payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', payload);
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}

export async function refreshToken(): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/refresh');
  return data;
}
