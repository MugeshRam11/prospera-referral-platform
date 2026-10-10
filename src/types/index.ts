export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
    stack?: string;
  };
  timestamp: string;
}

export interface HealthCheckData {
  status: string;
  uptime: number;
  environment: string;
  timestamp: string;
  version: string;
}
