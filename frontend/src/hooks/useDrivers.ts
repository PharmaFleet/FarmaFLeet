import { useQuery } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';

interface UseDriversOptions {
  page?: number;
  size?: number;
  active_only?: boolean;
  warehouse_id?: number;
  search?: string;
}

export function useDrivers(options: UseDriversOptions = {}) {
  const queryInfo = useQuery({
    queryKey: ['drivers', options],
    queryFn: () => driverService.getAll(options),
    staleTime: 30000, // 30 seconds
  });

  return {
    ...queryInfo,
    drivers: queryInfo.data?.items || [],
    total: queryInfo.data?.total || 0,
    isEmpty: queryInfo.data?.total === 0,
  };
}

export function useAvailableDrivers() {
  const queryInfo = useQuery({
    queryKey: ['available-drivers'],
    // Use 'size' (backend param name) and 'active_only' (backend param name)
    queryFn: () => driverService.getAll({ size: 500, active_only: true }),
    staleTime: 60000, // 1 minute
  });
  
  return {
    ...queryInfo,
    drivers: queryInfo.data?.items || [],
    total: queryInfo.data?.total || 0,
  };
}

