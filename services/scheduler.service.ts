import { ScheduledAction } from "@/models/scheduled-action.model";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082/api";

// Enhanced types for the robust scheduler
export interface SchedulerHealthStatus {
  isInitialized: boolean;
  activeSchedules: number;
  scheduledEntries: number;
  failedActions: number;
  lastInitialization: string;
  uptime: number;
}

export interface SchedulerDebugInfo {
  registrySize: number;
  activeSchedulesCount: number;
  isInitialized: boolean;
  persistentState: {
    lastInitialization: number;
    failedActions: string[];
    version: string;
  };
  schedules: Array<{
    id: string;
    actionId: string;
    type: 'daily' | 'one-time';
    scheduledTime: string;
    isActive: boolean;
    timezone?: string;
    hasTimeout: boolean;
    hasInterval: boolean;
  }>;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  executedAt: string;
}

// Error handling with retry logic
class SchedulerApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'SchedulerApiError';
  }
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000,  // 5 seconds
  retryableStatusCodes: [408, 429, 502, 503, 504]
};

// Enhanced axios instance with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const statusCode = error.response?.status;
    const isRetryable = RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
    
    console.error(`❌ API Error: ${statusCode} ${error.config?.url}`, error.message);
    
    throw new SchedulerApiError(
      error.response?.data?.message || error.message,
      statusCode,
      isRetryable
    );
  }
);

// Retry helper function
async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && error instanceof SchedulerApiError && error.retryable) {
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, RETRY_CONFIG.maxRetries - retries),
        RETRY_CONFIG.maxDelay
      );
      
      console.log(`🔄 Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retries - 1);
    }
    throw error;
  }
}

export class ScheduledActionService {
  // Enhanced CRUD operations with retry logic
  static async getAllScheduledActions(): Promise<ScheduledAction[]> {
    return withRetry(async () => {
      const response = await apiClient.get<ApiResponse<ScheduledAction[]>>('/scheduler');
      return response.data.data;
    });
  }

  static async getScheduledActionById(id: string): Promise<ScheduledAction> {
    return withRetry(async () => {
      const response = await apiClient.get<ApiResponse<ScheduledAction>>(`/scheduler/${id}`);
      return response.data.data;
    });
  }

  static async createAction(action: Omit<ScheduledAction, "id">): Promise<ScheduledAction> {
    return withRetry(async () => {
      const response = await apiClient.post<ApiResponse<ScheduledAction>>('/scheduler', action);
      return response.data.data;
    });
  }

  static async updateAction(id: string, action: Partial<ScheduledAction>): Promise<ScheduledAction> {
    return withRetry(async () => {
      const response = await apiClient.put<ApiResponse<ScheduledAction>>(`/scheduler/${id}`, action);
      return response.data.data;
    });
  }

  static async patchAction(id: string, action: Partial<ScheduledAction>): Promise<ScheduledAction> {
    return withRetry(async () => {
      const response = await apiClient.patch<ApiResponse<ScheduledAction>>(`/scheduler/${id}`, action);
      return response.data.data;
    });
  }

  static async deleteAction(id: string): Promise<void> {
    return withRetry(async () => {
      await apiClient.delete(`/scheduler/${id}`);
    });
  }

  // New enhanced features
  static async pauseAction(id: string): Promise<void> {
    return withRetry(async () => {
      await apiClient.post(`/scheduler/${id}/pause`);
    });
  }

  static async resumeAction(id: string): Promise<void> {
    return withRetry(async () => {
      await apiClient.post(`/scheduler/${id}/resume`);
    });
  }

  static async executeAction(id: string, actionType: string, eventName?: string): Promise<ExecutionResult> {
    return withRetry(async () => {
      const response = await apiClient.post<ExecutionResult>(`/scheduler/execute/${id}`, {
        actionType,
        eventName
      });
      return response.data;
    });
  }

  static async getHealthStatus(): Promise<SchedulerHealthStatus> {
    return withRetry(async () => {
      const response = await apiClient.get<ApiResponse<SchedulerHealthStatus>>('/scheduler/health');
      return response.data.data;
    });
  }

  static async getDebugInfo(): Promise<SchedulerDebugInfo> {
    return withRetry(async () => {
      const response = await apiClient.get<ApiResponse<SchedulerDebugInfo>>('/scheduler/debug');
      return response.data.data;
    });
  }

  static async reinitializeScheduler(): Promise<SchedulerHealthStatus> {
    return withRetry(async () => {
      const response = await apiClient.post<ApiResponse<SchedulerHealthStatus>>('/scheduler/reinitialize');
      return response.data.data;
    });
  }

  // Bulk operations
  static async pauseMultipleActions(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.pauseAction(id)));
  }

  static async resumeMultipleActions(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.resumeAction(id)));
  }

  static async deleteMultipleActions(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.deleteAction(id)));
  }
}
