import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api-client.js';
import { queryKeys } from './query-keys.js';
import { Flock, DashboardData, UnifiedDailyRecord, HealthStatus } from '../types/index.js';

// 1. Health Query (polled periodically)
export function useHealthQuery() {
  return useQuery<HealthStatus>({
    queryKey: queryKeys.health(),
    queryFn: () => api.getHealth(),
    refetchInterval: 10000, // Every 10 seconds
  });
}

// 2. Flocks Queries
export function useFlocksQuery(status?: 'active' | 'closed') {
  return useQuery<Flock[]>({
    queryKey: queryKeys.flocks.list(status),
    queryFn: () => api.getFlocks(status),
  });
}

export function useFlockQuery(flockId?: string) {
  return useQuery<Flock>({
    queryKey: queryKeys.flocks.detail(flockId || ''),
    queryFn: () => api.getFlock(flockId!),
    enabled: !!flockId,
  });
}

// 3. Flocks Mutations
export function useCreateFlockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.createFlock>[0]) => api.createFlock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flocks.all() });
    },
  });
}

export function useUpdateFlockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flockId, data }: { flockId: string; data: { name?: string; eggTrackingEnabled?: boolean } }) =>
      api.updateFlock(flockId, data),
    onSuccess: (_, { flockId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flocks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.flocks.detail(flockId) });
      queryClient.invalidateQueries({ queryKey: ['daily-record', flockId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', flockId] });
      queryClient.invalidateQueries({ queryKey: ['reports', flockId] });
    },
  });
}

export function useCloseFlockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flockId: string) => api.closeFlock(flockId),
    onSuccess: (_, flockId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flocks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.flocks.detail(flockId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard', flockId] });
    },
  });
}

export function useDeleteFlockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flockId: string) => api.deleteFlock(flockId),
    onSuccess: (_, flockId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flocks.all() });
      queryClient.removeQueries({ queryKey: queryKeys.flocks.detail(flockId) });
      queryClient.removeQueries({ queryKey: ['daily-record', flockId] });
      queryClient.removeQueries({ queryKey: ['dashboard', flockId] });
      queryClient.removeQueries({ queryKey: ['reports', flockId] });
    },
  });
}

// 4. Dashboard Query
export function useDashboardQuery(flockId?: string, date?: string) {
  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard(flockId || '', date || ''),
    queryFn: () => api.getDashboard(flockId!, date),
    enabled: !!flockId && !!date,
  });
}

// 5. Unified Daily Record Query & Mutation
export function useDailyRecordQuery(flockId?: string, date?: string) {
  return useQuery<UnifiedDailyRecord>({
    queryKey: queryKeys.dailyRecord(flockId || '', date || ''),
    queryFn: () => api.getDailyRecord(flockId!, date!),
    enabled: !!flockId && !!date,
  });
}

export function useSaveDailyRecordMutation(flockId: string, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.saveDailyRecord(flockId, payload),
    onSuccess: (_, variables) => {
      const targetDate = variables?.date || date;
      // Invalidate daily record, dashboard, and reports queries
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyRecord(flockId, targetDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(flockId, targetDate) });
      queryClient.invalidateQueries({ queryKey: ['reports', flockId] });
    },
  });
}

// 6. Reports Queries
export function useReportsQuery(
  flockId?: string,
  reportType: 'summary' | 'mortality' | 'feed' | 'chips' | 'trays' | 'eggs' | 'diesel' | 'weight' | 'health' = 'summary'
) {
  return useQuery<any>({
    queryKey: queryKeys.reports(flockId || '', reportType),
    queryFn: () => {
      if (reportType === 'summary') return api.getSummaryReport(flockId!);
      if (reportType === 'mortality') return api.getMortalityReport(flockId!);
      if (reportType === 'feed') return api.getFeedReport(flockId!);
      if (reportType === 'chips') return api.getChipsReport(flockId!);
      if (reportType === 'trays') return api.getTraysReport(flockId!);
      if (reportType === 'eggs') return api.getEggsReport(flockId!);
      if (reportType === 'diesel') return api.getDieselReport(flockId!);
      if (reportType === 'weight') return api.getWeightReport(flockId!);
      if (reportType === 'health') return api.getHealthReport(flockId!);
      return Promise.resolve(null);
    },
    enabled: !!flockId,
  });
}

// 7. Medicines Master Query
export function useMedicinesQuery() {
  return useQuery<{ id: string; name: string; active: boolean }[]>({
    queryKey: queryKeys.medicines(),
    queryFn: () => api.getMedicines(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
