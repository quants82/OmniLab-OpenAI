import { apiClient, type ApiResponse } from './apiClient';
import type { User } from '../../types/auth';

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

class AuthApi {
  async login(username: string, password: string): Promise<ApiResponse<TokenResponse>> {
    const response = await apiClient.post<TokenResponse>('/api/auth/login', { username, password }, false);
    if (response.data?.access_token) apiClient.setToken(response.data.access_token);
    return response;
  }

  async register(username: string, password: string): Promise<ApiResponse<TokenResponse>> {
    const response = await apiClient.post<TokenResponse>('/api/auth/register', { username, password }, false);
    if (response.data?.access_token) apiClient.setToken(response.data.access_token);
    return response;
  }

  getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/api/auth/me');
  }

  logout(): void {
    apiClient.clearToken();
  }
}

export const authApi = new AuthApi();
