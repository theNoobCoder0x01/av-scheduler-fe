"use client";

import React, { useState, useEffect } from 'react';
import { ScheduledAction } from '@/models/scheduled-action.model';
import { ScheduledActionService } from '@/services/scheduler.service';

interface SchedulerHealthStatus {
  isInitialized: boolean;
  activeSchedules: number;
  scheduledEntries: number;
  failedActions: number;
  lastInitialization: string;
  uptime: number;
}

interface SchedulerDebugInfo {
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

const TIMEZONE_OPTIONS = [
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'UTC'
];

export function SchedulerManagement() {
  const [actions, setActions] = useState<ScheduledAction[]>([]);
  const [healthStatus, setHealthStatus] = useState<SchedulerHealthStatus | null>(null);
  const [debugInfo, setDebugInfo] = useState<SchedulerDebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAction, setNewAction] = useState<Partial<ScheduledAction>>({
    actionType: 'play',
    time: '09:00:00',
    isDaily: true,
    timezone: 'UTC',
    isActive: true,
    maxRetries: 3
  });
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [actionsData, healthData] = await Promise.all([
        ScheduledActionService.getAllScheduledActions(),
        fetchHealthStatus()
      ]);
      
      setActions(actionsData);
      setHealthStatus(healthData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthStatus = async (): Promise<SchedulerHealthStatus> => {
    const response = await fetch('/api/scheduler/health');
    if (!response.ok) throw new Error('Failed to fetch health status');
    const result = await response.json();
    return result.data;
  };

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/scheduler/debug');
      if (!response.ok) throw new Error('Failed to fetch debug info');
      const result = await response.json();
      setDebugInfo(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debug info');
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ScheduledActionService.createAction(newAction as ScheduledAction);
      setNewAction({
        actionType: 'play',
        time: '09:00:00',
        isDaily: true,
        timezone: 'UTC',
        isActive: true,
        maxRetries: 3
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create action');
    }
  };

  const handleDeleteAction = async (id: string) => {
    try {
      await ScheduledActionService.deleteAction(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete action');
    }
  };

  const handlePauseAction = async (id: string) => {
    try {
      const response = await fetch(`/api/scheduler/${id}/pause`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to pause action');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause action');
    }
  };

  const handleResumeAction = async (id: string) => {
    try {
      const response = await fetch(`/api/scheduler/${id}/resume`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to resume action');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume action');
    }
  };

  const handleReinitializeScheduler = async () => {
    try {
      const response = await fetch('/api/scheduler/reinitialize', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to reinitialize scheduler');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reinitialize scheduler');
    }
  };

  const formatUptime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading scheduler data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Scheduler Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            {showDebugInfo ? 'Hide Debug' : 'Show Debug'}
          </button>
          <button
            onClick={handleReinitializeScheduler}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reinitialize Scheduler
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Health Status */}
      {healthStatus && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Scheduler Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${healthStatus.isInitialized ? 'text-green-600' : 'text-red-600'}`}>
                {healthStatus.isInitialized ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-600">Initialized</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{healthStatus.activeSchedules}</div>
              <div className="text-sm text-gray-600">Active Schedules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{healthStatus.scheduledEntries}</div>
              <div className="text-sm text-gray-600">Scheduled Entries</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${healthStatus.failedActions > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {healthStatus.failedActions}
              </div>
              <div className="text-sm text-gray-600">Failed Actions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{formatUptime(healthStatus.uptime)}</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Information */}
      {showDebugInfo && debugInfo && (
        <div className="bg-gray-50 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Debug Information</h2>
            <button
              onClick={fetchDebugInfo}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><strong>Registry Size:</strong> {debugInfo.registrySize}</div>
              <div><strong>Active Schedules:</strong> {debugInfo.activeSchedulesCount}</div>
              <div><strong>Failed Actions:</strong> {debugInfo.persistentState.failedActions.length}</div>
              <div><strong>Version:</strong> {debugInfo.persistentState.version}</div>
            </div>
            
            {debugInfo.schedules.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Current Schedule Entries:</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Action ID</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Scheduled Time</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Timezone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debugInfo.schedules.map((schedule) => (
                        <tr key={schedule.id} className="border-b">
                          <td className="p-2 font-mono text-xs">{schedule.id}</td>
                          <td className="p-2">{schedule.actionId}</td>
                          <td className="p-2">{schedule.type}</td>
                          <td className="p-2">{new Date(schedule.scheduledTime).toLocaleString()}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              schedule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {schedule.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-2">{schedule.timezone || 'Local'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create New Action */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Create New Scheduled Action</h2>
        <form onSubmit={handleCreateAction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Action Type</label>
            <select
              value={newAction.actionType}
              onChange={(e) => setNewAction({...newAction, actionType: e.target.value as any})}
              className="w-full p-2 border rounded"
              required
            >
              <option value="play">Play</option>
              <option value="pause">Pause</option>
              <option value="stop">Stop</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Time (HH:MM:SS)</label>
            <input
              type="time"
              step="1"
              value={newAction.time}
              onChange={(e) => setNewAction({...newAction, time: e.target.value})}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Timezone</label>
            <select
              value={newAction.timezone}
              onChange={(e) => setNewAction({...newAction, timezone: e.target.value})}
              className="w-full p-2 border rounded"
            >
              {TIMEZONE_OPTIONS.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Max Retries</label>
            <input
              type="number"
              min="0"
              max="10"
              value={newAction.maxRetries}
              onChange={(e) => setNewAction({...newAction, maxRetries: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Event Name</label>
            <input
              type="text"
              value={newAction.eventName || ''}
              onChange={(e) => setNewAction({...newAction, eventName: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="Optional event name"
            />
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newAction.isDaily}
                onChange={(e) => setNewAction({...newAction, isDaily: e.target.checked})}
                className="mr-2"
              />
              Daily recurring
            </label>
          </div>
          
          {!newAction.isDaily && (
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="datetime-local"
                value={newAction.date ? new Date(newAction.date).toISOString().slice(0, 16) : ''}
                onChange={(e) => setNewAction({...newAction, date: new Date(e.target.value)})}
                className="w-full p-2 border rounded"
                required={!newAction.isDaily}
              />
            </div>
          )}
          
          <div className="md:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Create Action
            </button>
          </div>
        </form>
      </div>

      {/* Actions List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Scheduled Actions</h2>
        {actions.length === 0 ? (
          <p className="text-gray-500">No scheduled actions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Event</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Timezone</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Last Run</th>
                  <th className="text-left p-3">Next Run</th>
                  <th className="text-left p-3">Retries</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <tr key={action.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{action.id}</td>
                    <td className="p-3">{action.eventName || '-'}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {action.actionType}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{action.time}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        action.isDaily ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {action.isDaily ? 'Daily' : 'One-time'}
                      </span>
                    </td>
                    <td className="p-3">{action.timezone || 'Local'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        action.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {action.isActive !== false ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="p-3">
                      {action.lastRun ? new Date(action.lastRun * 1000).toLocaleString() : '-'}
                    </td>
                    <td className="p-3">
                      {action.nextRun ? new Date(action.nextRun * 1000).toLocaleString() : '-'}
                    </td>
                    <td className="p-3">
                      {action.retryCount || 0} / {action.maxRetries || 3}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {action.isActive !== false ? (
                          <button
                            onClick={() => handlePauseAction(action.id!)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResumeAction(action.id!)}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            Resume
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAction(action.id!)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}