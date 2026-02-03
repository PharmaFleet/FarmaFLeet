import { useQuery } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
import { Loader2, MapPin, AlertCircle, X, Warehouse, Car, Bike } from 'lucide-react';
import { useState, useEffect } from 'react';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Kuwait City center
const DEFAULT_CENTER = { lat: 29.3759, lng: 47.9774 };

/**
 * Create a car marker icon as a data URL
 */
function createCarIcon(color: string, size: number): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="${color}" stroke="white" stroke-width="2"/>
      <g transform="translate(4, 5)" fill="white">
        <path d="M2 8 L2 11 L14 11 L14 8 L12 8 L11 5 L5 5 L4 8 Z" fill="white"/>
        <path d="M5 5 L6 2 L10 2 L11 5" fill="white"/>
        <circle cx="4" cy="11" r="1.5" fill="${color}"/>
        <circle cx="12" cy="11" r="1.5" fill="${color}"/>
        <rect x="6" y="3" width="4" height="2" fill="${color}" rx="0.5"/>
      </g>
    </svg>
  `;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

/**
 * Create a motorcycle marker icon as a data URL
 */
function createMotorcycleIcon(color: string, size: number): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="${color}" stroke="white" stroke-width="2"/>
      <g transform="translate(4, 6)" fill="white">
        <rect x="3" y="4" width="8" height="3" rx="1"/>
        <circle cx="3" cy="9" r="2.5" fill="none" stroke="white" stroke-width="1.5"/>
        <circle cx="13" cy="9" r="2.5" fill="none" stroke="white" stroke-width="1.5"/>
        <path d="M2 3 L4 5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <ellipse cx="9" cy="3.5" rx="2.5" ry="1" fill="white"/>
      </g>
    </svg>
  `;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

/**
 * Create a marker icon based on vehicle type
 * Green for live GPS, amber for warehouse fallback
 */
function createVehicleIcon(hasLiveLocation: boolean, vehicleType?: string): string {
  const color = hasLiveLocation ? '#22c55e' : '#f59e0b'; // green-500 or amber-500
  const size = 28;

  if (vehicleType === 'motorcycle') {
    return createMotorcycleIcon(color, size);
  }
  return createCarIcon(color, size);
}

// Helper to check valid coordinates (not 0,0 which is invalid)
const isValidCoord = (lat: number | undefined, lng: number | undefined) =>
  lat != null && lng != null && !(lat === 0 && lng === 0);

interface SelectedDriver {
  driver_id: number;
  name: string | null;
  vehicle_info: string | null;
  vehicle_type: string | null;
  warehouse_name?: string | null;
  hasLiveLocation: boolean;
  is_available: boolean;
}

export function MiniMapView() {
  const [mapError, setMapError] = useState<string | null>(null);
  const [MapComponents, setMapComponents] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<SelectedDriver | null>(null);

  // Fetch both drivers (with warehouse) AND live locations, then merge
  const { data: driversWithLocation, isLoading, error } = useQuery({
    queryKey: ['drivers-with-location-mini'],
    queryFn: async () => {
      // Fetch online drivers and locations in parallel
      const [driversResponse, locationsResponse] = await Promise.all([
        driverService.getAll({ size: 50, status: 'online' }), // Only online drivers
        driverService.getLocations().catch(() => []),
      ]);

      console.log('[MiniMapView] Drivers fetched:', driversResponse.items?.length || 0);
      console.log('[MiniMapView] Live locations fetched:', locationsResponse?.length || 0);

      // Create location lookup object (avoid using Map to prevent conflict with Google Maps)
      const locationLookup: Record<number, any> = {};
      (locationsResponse || []).forEach((loc: any) => {
        locationLookup[Number(loc.driver_id)] = loc;
      });

      // Merge drivers with their locations (live GPS or warehouse fallback)
      const merged = (driversResponse.items || [])
        .map((driver: any) => {
          const liveLocation = locationLookup[Number(driver.id)];
          const warehouseLat = driver.warehouse?.latitude;
          const warehouseLng = driver.warehouse?.longitude;

          const hasValidLive = liveLocation && isValidCoord(liveLocation.latitude, liveLocation.longitude);
          const hasValidWarehouse = isValidCoord(warehouseLat, warehouseLng);

          return {
            driver_id: driver.id,
            latitude: hasValidLive ? liveLocation.latitude : (hasValidWarehouse ? warehouseLat : null),
            longitude: hasValidLive ? liveLocation.longitude : (hasValidWarehouse ? warehouseLng : null),
            vehicle_info: driver.vehicle_info,
            vehicle_type: driver.vehicle_type,
            name: driver.user?.full_name,
            warehouse_name: driver.warehouse?.name,
            is_available: driver.is_available,
            hasLiveLocation: hasValidLive,
          };
        })
        .filter((d: any) => d.latitude != null && d.longitude != null);

      console.log('[MiniMapView] Drivers with valid coords:', merged.length);
      return merged;
    },
    refetchInterval: 10000,
  });

  // Alias for backward compatibility
  const drivers = driversWithLocation;

  // Log error if any
  useEffect(() => {
    if (error) {
      console.error('[MiniMapView] Error fetching locations:', error);
    }
  }, [error]);

  // Dynamically load Google Maps to catch errors
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) {
      setMapError('No API key configured');
      return;
    }

    import('@vis.gl/react-google-maps')
      .then((module) => {
        setMapComponents(module);
      })
      .catch((_err) => {
        setMapError('Failed to load map library');
      });
  }, []);

  // Show fallback with driver list if map unavailable
  if (!GOOGLE_MAPS_KEY || mapError) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3 text-slate-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs">Map requires valid Google Maps API key</span>
        </div>
        <div className="text-sm font-medium text-slate-700 mb-2">
          Drivers ({drivers?.length || 0})
        </div>
        {drivers?.slice(0, 5).map((driver: any) => (
          <div key={driver.driver_id} className="flex items-center gap-2 p-2 bg-white rounded mb-1 shadow-sm">
            <MapPin className={`h-4 w-4 ${driver.hasLiveLocation ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span className="text-sm text-slate-700">{driver.name || driver.vehicle_info || `Driver ${driver.driver_id}`}</span>
            <span className="text-xs text-slate-400 ml-auto">
              {driver.hasLiveLocation ? '🟢 GPS' : '🟡 Warehouse'}
            </span>
          </div>
        ))}
        {(!drivers || drivers.length === 0) && (
          <div className="text-sm text-slate-400 text-center py-4">No drivers with location</div>
        )}
      </div>
    );
  }

  if (!MapComponents) {
    return (
      <div className="h-full w-full bg-slate-100 rounded-lg flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const { APIProvider, Map, Marker } = MapComponents;

  return (
    <div className="h-full w-full relative">
      <APIProvider apiKey={GOOGLE_MAPS_KEY}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={10}
          gestureHandling="cooperative"
          disableDefaultUI={true}
          className="w-full h-full"
        >
          {drivers?.map((driver: any) => {
             const lat = Number(driver.latitude);
             const lng = Number(driver.longitude);
             const icon = createVehicleIcon(driver.hasLiveLocation, driver.vehicle_type);
             const locationInfo = driver.hasLiveLocation ? 'GPS' : 'Warehouse';
             const title = `${driver.name || driver.vehicle_info || `Driver ${driver.driver_id}`} (${locationInfo})`;

             return (
               <Marker
                 key={driver.driver_id}
                 position={{ lat, lng }}
                 title={title}
                 icon={icon}
                 onClick={() => setSelectedDriver({
                   driver_id: driver.driver_id,
                   name: driver.name,
                   vehicle_info: driver.vehicle_info,
                   vehicle_type: driver.vehicle_type,
                   warehouse_name: driver.warehouse_name,
                   hasLiveLocation: driver.hasLiveLocation,
                   is_available: driver.is_available,
                 })}
               />
             );
           })}
        </Map>
      </APIProvider>

      {/* Selected Driver Info Panel */}
      {selectedDriver && (
        <DriverDetailsPanel
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
        />
      )}

      {isLoading && (
        <div className="absolute top-2 right-2 bg-white/80 p-1.5 rounded text-xs flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Updating...
        </div>
      )}
    </div>
  );
}

/**
 * Driver Details Panel - compact info panel for MiniMapView
 */
function DriverDetailsPanel({ driver, onClose }: { driver: SelectedDriver; onClose: () => void }) {
  // Fetch driver stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['driver-stats', driver.driver_id],
    queryFn: () => driverService.getStats(driver.driver_id),
    staleTime: 30000,
  });

  return (
    <div className="absolute bottom-2 left-2 right-2 bg-white rounded-lg shadow-lg p-3 z-10 border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {driver.vehicle_type === 'motorcycle' ? (
            <Bike className="h-4 w-4 text-slate-600" />
          ) : (
            <Car className="h-4 w-4 text-slate-600" />
          )}
          <span className="font-semibold text-sm text-slate-800 truncate">
            {driver.name || driver.vehicle_info || `Driver ${driver.driver_id}`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
        >
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          driver.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {driver.is_available ? 'Available' : 'Busy'}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          driver.hasLiveLocation ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {driver.hasLiveLocation ? '📍 GPS' : '🏢 Warehouse'}
        </span>
      </div>

      {/* Info row */}
      {driver.warehouse_name && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
          <Warehouse className="h-3 w-3" />
          <span>{driver.warehouse_name}</span>
        </div>
      )}

      {/* Stats */}
      {statsLoading ? (
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading stats...
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">{stats.orders_assigned}</div>
            <div className="text-[10px] text-slate-500">Assigned</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-600">{stats.orders_delivered}</div>
            <div className="text-[10px] text-slate-500">Delivered</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-600">
              {stats.online_duration_minutes != null
                ? stats.online_duration_minutes >= 60
                  ? `${Math.floor(stats.online_duration_minutes / 60)}h`
                  : `${stats.online_duration_minutes}m`
                : '-'}
            </div>
            <div className="text-[10px] text-slate-500">Online</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
