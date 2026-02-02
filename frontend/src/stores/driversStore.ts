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
  hasLiveLocation?: boolean; // true if using real GPS, false if using warehouse fallback
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

          // Fetch drivers AND locations in parallel
          const [driversResponse, locationsResponse] = await Promise.all([
            driverService.getAll(Object.fromEntries(params.entries())),
            driverService.getLocations().catch((err) => {
              console.error('[DriversStore] Failed to fetch locations:', err);
              return [];
            }),
          ]);

          console.log('[DriversStore] Drivers fetched:', driversResponse.items?.length || 0);
          console.log('[DriversStore] Locations fetched:', locationsResponse?.length || 0);
          if (locationsResponse && locationsResponse.length > 0) {
            console.log('[DriversStore] First location:', JSON.stringify(locationsResponse[0], null, 2));
          }

          // Create location lookup map: driver_id -> location
          const locationMap = new Map<number, { latitude: number; longitude: number; heading?: number; speed?: number; timestamp?: string }>(
            (locationsResponse || []).map((loc: any) => [Number(loc.driver_id), loc])
          );

          // Transform drivers to include location data and status
          // Prioritize live GPS location over warehouse fallback
          const driversWithLocation: DriverWithLocation[] = (driversResponse.items || []).map(
            (driver: Driver) => {
              // Ensure we look up using a number, as keys were cast to numbers
              const liveLocation = locationMap.get(Number(driver.id));
              const warehouseLat = driver.warehouse?.latitude;
              const warehouseLng = driver.warehouse?.longitude;

              // Check for valid coordinates (not 0,0 which is invalid)
              const isValidCoord = (lat: number | undefined, lng: number | undefined) =>
                lat != null && lng != null && !(lat === 0 && lng === 0);

              const hasValidLiveLocation = liveLocation && isValidCoord(liveLocation.latitude, liveLocation.longitude);
              const hasValidWarehouse = isValidCoord(warehouseLat, warehouseLng);

              // Use live location if valid, otherwise warehouse if valid, otherwise undefined
              const finalLat = hasValidLiveLocation ? liveLocation.latitude : (hasValidWarehouse ? warehouseLat : undefined);
              const finalLng = hasValidLiveLocation ? liveLocation.longitude : (hasValidWarehouse ? warehouseLng : undefined);

              const driverWithLoc = {
                ...driver,
                status: determineDriverStatus(driver as DriverWithLocation),
                latitude: finalLat,
                longitude: finalLng,
                heading: liveLocation?.heading,
                speed: liveLocation?.speed,
                lastUpdated: liveLocation?.timestamp || new Date().toISOString(),
                hasLiveLocation: !!hasValidLiveLocation,
              };

              // Debug logging
              if (hasValidLiveLocation) {
                console.log(`[DriversStore] Driver ${driver.id}: LIVE at (${finalLat}, ${finalLng})`);
              } else if (hasValidWarehouse) {
                console.log(`[DriversStore] Driver ${driver.id}: WAREHOUSE fallback at (${finalLat}, ${finalLng})`);
              } else {
                console.warn(`[DriversStore] Driver ${driver.id}: NO VALID COORDINATES (warehouse has 0,0 or null)`);
              }

              return driverWithLoc;
            }
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
