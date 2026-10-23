import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api', timeout: 5000 });
export interface HealthResponse { status: 'ok' | 'error'; database: 'connected' | 'disconnected'; timestamp: string; }
export async function getHealth(): Promise<HealthResponse> { return (await api.get<HealthResponse>('/health')).data; }
