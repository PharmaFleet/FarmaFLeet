import { useQuery } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Kuwait City center
const DEFAULT_CENTER = { lat: 29.3759, lng: 47.9774 };

/**
 * Create a motorcycle marker icon as a data URL
 * Green for live GPS, amber for warehouse fallback
 */
function createMotorcycleIcon(hasLiveLocation: boolean): string {
  const color = hasLiveLocation ? '#22c55e' : '#f59e0b'; // green-500 or amber-500
  const size = 28;

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

// Helper to check valid coordinates (not 0,0 which is invalid)
const isValidCoord = (lat: number | undefined, lng: number | undefined) =>
  lat != null && lng != null && !(lat === 0 && lng === 0);

export function MiniMapView() {
  const [mapError, setMapError] = useState<string | null>(null);
  const [MapComponents, setMapComponents] = useState<any>(null);

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
            name: driver.user?.full_name,
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
             const icon = createMotorcycleIcon(driver.hasLiveLocation);
             const locationInfo = driver.hasLiveLocation ? 'GPS' : 'Warehouse';
             const title = `${driver.name || driver.vehicle_info || `Driver ${driver.driver_id}`} (${locationInfo})`;

             return (
               <Marker
                 key={driver.driver_id}
                 position={{ lat, lng }}
                 title={title}
                 icon={icon}
               />
             );
           })}
        </Map>
      </APIProvider>
      {isLoading && (
        <div className="absolute top-2 right-2 bg-white/80 p-1.5 rounded text-xs flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Updating...
        </div>
      )}
    </div>
  );
}
