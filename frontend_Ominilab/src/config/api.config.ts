const apiUrl = (import.meta.env.PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const API_CONFIG = {
  python: { apiUrl },
  websocket: {
    baseUrl: apiUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:'),
  },
};

export default API_CONFIG;
