/**
 * API Client for FastAPI Backend
 * Shared with Ebook project
 */

import { API_CONFIG } from '../../config/api.config';

const API_BASE_URL = API_CONFIG.python.apiUrl;

interface ApiRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    requireAuth?: boolean;
}

export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    detail?: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('jwt_token');
    }

    public setToken(token: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem('jwt_token', token);
    }

    public clearToken(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('jwt_token');
    }

    private buildHeaders(options: ApiRequestOptions): Headers {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');

        if (options.requireAuth !== false) {
            const token = this.getToken();
            if (token) {
                headers.append('Authorization', `Bearer ${token}`);
            }
        }

        if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
                headers.append(key, value);
            });
        }

        return headers;
    }

    async request<T = any>(
        endpoint: string,
        options: ApiRequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const { method = 'GET', body, requireAuth = true } = options;

        const url = `${this.baseUrl}${endpoint}`;
        const headers = this.buildHeaders({ ...options, requireAuth });

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            let data = {};
            try {
                data = await response.json();
            } catch (e) {
                // If response is not JSON
            }

            if (!response.ok) {
                return {
                    error: (data as any).detail || (data as any).error || `HTTP ${response.status}`,
                    detail: (data as any).detail,
                };
            }

            return { data: data as T };
        } catch (error) {
            console.error('API request failed:', error);
            return {
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    async get<T = any>(endpoint: string, requireAuth = true): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET', requireAuth });
    }

    async post<T = any>(
        endpoint: string,
        body?: any,
        requireAuth = true
    ): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'POST', body, requireAuth });
    }

    async put<T = any>(
        endpoint: string,
        body?: any,
        requireAuth = true
    ): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'PUT', body, requireAuth });
    }

    async delete<T = any>(endpoint: string, requireAuth = true): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE', requireAuth });
    }
}

export const apiClient = new ApiClient();
export type { ApiRequestOptions };
