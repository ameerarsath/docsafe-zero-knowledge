/**
 * Dashboard Statistics Hook
 * 
 * Custom hook for fetching and managing dashboard statistics with
 * automatic refresh and error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, EnhancedDashboardStats } from '../services/api/dashboard';

interface UseDashboardStatsResult {
  stats: EnhancedDashboardStats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useDashboardStats(autoRefresh: boolean = true): UseDashboardStatsResult {
  const [stats, setStats] = useState<EnhancedDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dashboardStats = await dashboardApi.getEnhancedDashboardStats();
      setStats(dashboardStats);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard statistics');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats,
    lastUpdated,
  };
}