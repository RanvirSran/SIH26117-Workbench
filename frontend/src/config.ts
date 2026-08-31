export const API_URL: string = import.meta.env.VITE_API_URL ?? '/api';

export const USE_MOCK_DATA: boolean =
  (import.meta.env.VITE_USE_MOCK_DATA ?? 'true') === 'true';
