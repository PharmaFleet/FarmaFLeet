import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Driver, PaginatedResponse } from '@/types';

// Define driver status enum for map display
export enum DriverMapStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  ON_BREAK = 'on_break',
}

// Extended driver type with location data for map
export interface DriverWithLocation extends Driver {
  status: DriverMapStatus;
  latitude?: number;
  longitude?: number;
  heading?: number;
  speed?: number;
  lastUpdated?: string;
  currentOrderId?: number;
}

// Map bounds for filtering drivers
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Drivers store state interface
interface DriversState {
  // Data
  drivers: DriverWithLocation[];
  selectedDriver: DriverWithLocation | null;
  
  // Loading states
  isLoading: boolean;
  isUpdatingLocation: boolean;
  error: string | null;
  
  // Filters
  statusFilter: DriverMapStatus | null;
  showRoutes: boolean;
  bounds: MapBounds | null;
  warehouseId: number | null;
  
  // Actions
  setDrivers: (drivers: DriverWithLocation[]) => void;
  updateDriverLocation: (driverId: number, location: Partial<DriverWithLocation>) => void;
  setSelectedDriver: (driver: DriverWithLocation | null) => void;
  setStatusFilter: (status: DriverMapStatus | null) => void;
  setShowRoutes: (show: boolean) => void;
  setBounds: (bounds: MapBounds | null) => void;
  setWarehouseId: (warehouseId: number | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Fetch drivers with filters
  fetchDrivers: () => Promise<void>;
  
  // Computed
  getFilteredDrivers: () => DriverWithLocation[];
  getOnlineDrivers: () => DriverWithLocation[];
  getActiveDrivers: () => DriverWithLocation[];
}

// Helper to determine driver status from driver data
function determineDriverStatus(driver: DriverWithLocation | Driver): DriverMapStatus {
  // If we have explicit status, use it
  if ('status' in driver && driver.status) {
    return driver.status;
  }
  
  // Otherwise, infer from is_available and current_order
  if (!driver.is_available) {
    return DriverMapStatus.BUSY;
  }
  
  return DriverMapStatus.ONLINE;
}

export const useDriversStore = create<DriversState>()(
  devtools(
    (set, get) => ({
      // Initial state
      drivers: [],
      selectedDriver: null,
      isLoading: false,
      isUpdatingLocation: false,
      error: null,
      statusFilter: null,
      showRoutes: true,
      bounds: null,
      warehouseId: null,

      // Actions
      setDrivers: (drivers) => set({ drivers }, false, 'setDrivers'),

      updateDriverLocation: (driverId, location) => {
        set(
          (state) => ({
            drivers: state.drivers.map((driver) =>
              driver.id === driverId
                ? { ...driver, ...location, lastUpdated: new Date().toISOString() }
                : driver
            ),
            // Update selected driver if it's the one being updated
            selectedDriver:
              state.selectedDriver?.id === driverId
                ? { ...state.selectedDriver, ...location, lastUpdated: new Date().toISOString() }
                : state.selectedDriver,
          }),
          false,
          'updateDriverLocation'
        );
      },

      setSelectedDriver: (driver) => set({ selectedDriver: driver }, false, 'setSelectedDriver'),

      setStatusFilter: (status) => set({ statusFilter: status }, false, 'setStatusFilter'),

      setShowRoutes: (show) => set({ showRoutes: show }, false, 'setShowRoutes'),

      setBounds: (bounds) => set({ bounds }, false, 'setBounds'),

      setWarehouseId: (warehouseId) => set({ warehouseId }, false, 'setWarehouseId'),

      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),

      setError: (error) => set({ error }, false, 'setError'),

      clearError: () => set({ error: null }, false, 'clearError'),

      fetchDrivers: async () => {
        const { bounds, warehouseId, statusFilter } = get();
        
        set({ isLoading: true, error: null }, false, 'fetchDrivers/start');
        
        try {
          // Build query params
          const params = new URLSearchParams();
          
          if (bounds) {
            params.append('north', bounds.north.toString());
            params.append('south', bounds.south.toString());
            params.append('east', bounds.east.toString());
            params.append('west', bounds.west.toString());
          }
          
          if (warehouseId) {
            params.append('warehouse_id', warehouseId.toString());
          }
          
          if (statusFilter) {
            params.append('status', statusFilter);
          }
          
          // Use the driver service with filters
          const { driverService } = await import('@/services/driverService');
          const response = await driverService.getAll(
            Object.fromEntries(params.entries())
          );
          
          // Transform drivers to include location data and status
          const driversWithLocation: DriverWithLocation[] = (response.items || []).map(
            (driver: Driver) => ({
              ...driver,
              status: determineDriverStatus(driver as DriverWithLocation),
              latitude: driver.warehouse?.latitude,
              longitude: driver.warehouse?.longitude,
              lastUpdated: new Date().toISOString(),
            })
          );
          
          set(
            { drivers: driversWithLocation, isLoading: false },
            false,
            'fetchDrivers/success'
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch drivers';
          set(
            { error: errorMessage, isLoading: false },
            false,
            'fetchDrivers/error'
          );
        }
      },

      // Computed getters (these are functions that compute values based on state)
      getFilteredDrivers: () => {
        const { drivers, statusFilter } = get();
        
        if (!statusFilter) {
          return drivers;
        }
        
        return drivers.filter((driver) => driver.status === statusFilter);
      },

      getOnlineDrivers: () => {
        const { drivers } = get();
        return drivers.filter(
          (driver) => driver.status === DriverMapStatus.ONLINE || 
                      driver.status === DriverMapStatus.BUSY
        );
      },

      getActiveDrivers: () => {
        const { drivers } = get();
        return drivers.filter(
          (driver) => driver.status === DriverMapStatus.BUSY
        );
      },
    }),
    { name: 'drivers-store' }
  )
);
