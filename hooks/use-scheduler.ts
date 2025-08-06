import { useCallback, useEffect, useState, useRef } from 'react';
import { ScheduledAction } from '@/models/scheduled-action.model';
import { 
  ScheduledActionService, 
  SchedulerHealthStatus, 
  SchedulerDebugInfo 
} from '@/services/scheduler.service';
import { useToast } from '@/hooks/use-toast';
import { WebSocketService } from '@/services/web-socket.service';

export interface ScheduledActionWithPlaylist extends ScheduledAction {
  playlistStatus?: {
    found: boolean;
    availableFiles: string[];
    searchedFor: string;
  };
}

interface UseSchedulerOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableWebSocket?: boolean;
}

interface UseSchedulerReturn {
  // Data
  actions: ScheduledActionWithPlaylist[];
  healthStatus: SchedulerHealthStatus | null;
  debugInfo: SchedulerDebugInfo | null;
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  executingActions: Set<string>;
  
  // Error handling
  error: string | null;
  retryCount: number;
  
  // Actions
  refresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  
  // Individual action operations
  createAction: (action: Omit<ScheduledAction, 'id'>) => Promise<ScheduledAction>;
  updateAction: (id: string, updates: Partial<ScheduledAction>) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
  pauseAction: (id: string) => Promise<void>;
  resumeAction: (id: string) => Promise<void>;
  executeAction: (id: string) => Promise<void>;
  
  // Bulk operations
  deleteMultipleActions: (ids: string[]) => Promise<void>;
  pauseMultipleActions: (ids: string[]) => Promise<void>;
  resumeMultipleActions: (ids: string[]) => Promise<void>;
  
  // Health monitoring
  getHealthStatus: () => Promise<void>;
  getDebugInfo: () => Promise<void>;
  reinitializeScheduler: () => Promise<void>;
  
  // Utility
  clearError: () => void;
}

const TIMEZONE_STORAGE_KEY = 'scheduler_timezone_preference';
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;

export function useScheduler(options: UseSchedulerOptions = {}): UseSchedulerReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    enableWebSocket = true
  } = options;

  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout>();
  const healthIntervalRef = useRef<NodeJS.Timeout>();
  const wsConnectedRef = useRef(false);

  // State
  const [actions, setActions] = useState<ScheduledActionWithPlaylist[]>([]);
  const [healthStatus, setHealthStatus] = useState<SchedulerHealthStatus | null>(null);
  const [debugInfo, setDebugInfo] = useState<SchedulerDebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Error handling
  const handleError = useCallback((err: unknown, operation: string) => {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error(`❌ Scheduler Error (${operation}):`, err);
    
    setError(message);
    toast({
      title: `Error: ${operation}`,
      description: message,
      variant: 'destructive',
    });
  }, [toast]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  // Fetch actions with error handling and retry
  const fetchActions = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      
      const data = await ScheduledActionService.getAllScheduledActions();
      setActions(data.map(action => ({ ...action, playlistStatus: undefined })));
      
      clearError();
      setRetryCount(0);
      
      return data;
    } catch (err) {
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        setRetryCount(prev => prev + 1);
        console.log(`🔄 Retrying fetchActions (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
        setTimeout(() => fetchActions(showLoading), 2000 * retryCount);
      } else {
        handleError(err, 'Fetching actions');
      }
      return [];
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [retryCount, handleError, clearError]);

  // Health status monitoring
  const fetchHealthStatus = useCallback(async () => {
    try {
      const health = await ScheduledActionService.getHealthStatus();
      setHealthStatus(health);
      
      // Auto-reinitialize if scheduler is not initialized
      if (!health.isInitialized) {
        console.warn('⚠️ Scheduler not initialized, attempting to reinitialize...');
        await ScheduledActionService.reinitializeScheduler();
        await fetchHealthStatus(); // Check again after reinitialize
      }
    } catch (err) {
      console.warn('⚠️ Health check failed:', err);
      // Don't show toast for health check failures to avoid spam
    }
  }, []);

  // WebSocket event handlers
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'scheduledAction':
        toast({
          title: 'Action Executed',
          description: `${data.action.actionType} executed for ${data.action.eventName || 'system'}`,
        });
        fetchActions(); // Refresh to get updated timestamps
        break;
        
      case 'scheduledActionError':
        toast({
          title: 'Action Failed',
          description: `Failed to execute ${data.action.actionType}: ${data.error}`,
          variant: 'destructive',
        });
        break;
        
      case 'scheduledActionFailure':
        toast({
          title: 'Action Failed Permanently',
          description: `Action ${data.action.id} failed after max retries: ${data.error}`,
          variant: 'destructive',
        });
        break;
        
      default:
        break;
    }
  }, [toast, fetchActions]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (enableWebSocket && !wsConnectedRef.current) {
      WebSocketService.connect();
      WebSocketService.addListener(handleWebSocketMessage);
      wsConnectedRef.current = true;
    }

    return () => {
      if (wsConnectedRef.current) {
        WebSocketService.removeListener(handleWebSocketMessage);
        wsConnectedRef.current = false;
      }
    };
  }, [enableWebSocket, handleWebSocketMessage]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        if (!refreshing) {
          fetchActions();
        }
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refreshing, fetchActions]);

  // Health monitoring setup
  useEffect(() => {
    fetchHealthStatus(); // Initial health check
    
    healthIntervalRef.current = setInterval(fetchHealthStatus, HEALTH_CHECK_INTERVAL);
    
    return () => {
      if (healthIntervalRef.current) {
        clearInterval(healthIntervalRef.current);
      }
    };
  }, [fetchHealthStatus]);

  // Initial data load
  useEffect(() => {
    fetchActions(true);
  }, []);

  // Action operations
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchActions();
      await fetchHealthStatus();
    } finally {
      setRefreshing(false);
    }
  }, [fetchActions, fetchHealthStatus]);

  const forceRefresh = useCallback(async () => {
    setRefreshing(true);
    clearError();
    try {
      await ScheduledActionService.reinitializeScheduler();
      await fetchActions();
      await fetchHealthStatus();
      toast({
        title: 'Scheduler Refreshed',
        description: 'Scheduler has been reinitialized successfully',
      });
    } catch (err) {
      handleError(err, 'Force refresh');
    } finally {
      setRefreshing(false);
    }
  }, [fetchActions, fetchHealthStatus, handleError, clearError, toast]);

  const createAction = useCallback(async (action: Omit<ScheduledAction, 'id'>) => {
    try {
      // Add default timezone if not specified
      const actionWithDefaults = {
        ...action,
        timezone: action.timezone || localStorage.getItem(TIMEZONE_STORAGE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone,
        isActive: true,
        maxRetries: action.maxRetries || 3,
      };

      const result = await ScheduledActionService.createAction(actionWithDefaults);
      
      toast({
        title: 'Action Created',
        description: `${action.isDaily ? 'Daily' : 'One-time'} ${action.actionType} action scheduled`,
      });
      
      await fetchActions();
      return result;
    } catch (err) {
      handleError(err, 'Creating action');
      throw err;
    }
  }, [fetchActions, handleError, toast]);

  const updateAction = useCallback(async (id: string, updates: Partial<ScheduledAction>) => {
    try {
      await ScheduledActionService.updateAction(id, updates);
      toast({
        title: 'Action Updated',
        description: 'Scheduled action has been updated',
      });
      await fetchActions();
    } catch (err) {
      handleError(err, 'Updating action');
      throw err;
    }
  }, [fetchActions, handleError, toast]);

  const deleteAction = useCallback(async (id: string) => {
    try {
      await ScheduledActionService.deleteAction(id);
      toast({
        title: 'Action Deleted',
        description: 'Scheduled action has been deleted immediately',
      });
      await fetchActions();
    } catch (err) {
      handleError(err, 'Deleting action');
      throw err;
    }
  }, [fetchActions, handleError, toast]);

  const pauseAction = useCallback(async (id: string) => {
    try {
      await ScheduledActionService.pauseAction(id);
      toast({
        title: 'Action Paused',
        description: 'Action has been paused and will not execute',
      });
      await fetchActions();
    } catch (err) {
      handleError(err, 'Pausing action');
      throw err;
    }
  }, [fetchActions, handleError, toast]);

  const resumeAction = useCallback(async (id: string) => {
    try {
      await ScheduledActionService.resumeAction(id);
      toast({
        title: 'Action Resumed',
        description: 'Action has been resumed and will execute as scheduled',
      });
      await fetchActions();
    } catch (err) {
      handleError(err, 'Resuming action');
      throw err;
    }
  }, [fetchActions, handleError, toast]);

  const executeAction = useCallback(async (id: string) => {
    const action = actions.find(a => a.id === id);
    if (!action) {
      toast({
        title: 'Error',
        description: 'Action not found',
        variant: 'destructive',
      });
      return;
    }

    setExecutingActions(prev => new Set(prev).add(id));
    
    try {
      const result = await ScheduledActionService.executeAction(
        id, 
        action.actionType, 
        action.eventName
      );
      
      toast({
        title: result.success ? 'Action Executed' : 'Execution Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
      
      if (result.success) {
        await fetchActions();
      }
    } catch (err) {
      handleError(err, 'Executing action');
    } finally {
      setExecutingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [actions, fetchActions, handleError, toast]);

  // Bulk operations
  const deleteMultipleActions = useCallback(async (ids: string[]) => {
    try {
      await ScheduledActionService.deleteMultipleActions(ids);
      toast({
        title: 'Actions Deleted',
        description: `${ids.length} actions have been deleted`,
      });
      await fetchActions();
    } catch (err) {
      handleError(err, 'Deleting multiple actions');
      throw err;
    }
  }, [fetchActions, handleError, toast]);

  const pauseMultipleActions = useCallback(async (ids: string[]) => {
    try {
      await ScheduledActionService.pauseMultipleActions(ids);
      toast({
        title: 'Actions Paused',
        description: `${ids.length} actions have been paused`,
      });
      await fetchActions();
    } catch (err) {
      handleError(err, 'Pausing multiple actions');
      throw err;
    }
  }, [fetchActions, handleError, toast]);

  const resumeMultipleActions = useCallback(async (ids: string[]) => {
    try {
      await ScheduledActionService.resumeMultipleActions(ids);
      toast({
        title: 'Actions Resumed',
        description: `${ids.length} actions have been resumed`,
      });
      await fetchActions();
    } catch (err) {
      handleError(err, 'Resuming multiple actions');
      throw err;
    }
  }, [fetchActions, handleError, toast]);

  const getHealthStatus = useCallback(async () => {
    await fetchHealthStatus();
  }, [fetchHealthStatus]);

  const getDebugInfo = useCallback(async () => {
    try {
      const debug = await ScheduledActionService.getDebugInfo();
      setDebugInfo(debug);
    } catch (err) {
      handleError(err, 'Getting debug info');
    }
  }, [handleError]);

  const reinitializeScheduler = useCallback(async () => {
    try {
      await ScheduledActionService.reinitializeScheduler();
      await fetchActions();
      await fetchHealthStatus();
      toast({
        title: 'Scheduler Reinitialized',
        description: 'Scheduler has been reinitialized successfully',
      });
    } catch (err) {
      handleError(err, 'Reinitializing scheduler');
    }
  }, [fetchActions, fetchHealthStatus, handleError, toast]);

  return {
    // Data
    actions,
    healthStatus,
    debugInfo,
    
    // Loading states
    loading,
    refreshing,
    executingActions,
    
    // Error handling
    error,
    retryCount,
    
    // Actions
    refresh,
    forceRefresh,
    
    // Individual operations
    createAction,
    updateAction,
    deleteAction,
    pauseAction,
    resumeAction,
    executeAction,
    
    // Bulk operations
    deleteMultipleActions,
    pauseMultipleActions,
    resumeMultipleActions,
    
    // Health monitoring
    getHealthStatus,
    getDebugInfo,
    reinitializeScheduler,
    
    // Utility
    clearError,
  };
}