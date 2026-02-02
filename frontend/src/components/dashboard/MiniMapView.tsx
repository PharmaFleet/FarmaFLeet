import { useQuery } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Kuwait City center
const DEFAULT_CENTER = { lat: 29.3759, lng: 47.9774 };

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
      // Fetch drivers and locations in parallel
      const [driversResponse, locationsResponse] = await Promise.all([
        driverService.getAll({ size: 50 }), // Get up to 50 drivers
        driverService.getLocations().catch(() => []),
      ]);

      console.log('[MiniMapView] Drivers fetched:', driversResponse.items?.length || 0);
      console.log('[MiniMapView] Live locations fetched:', locationsResponse?.length || 0);

      // Create location lookup map
      const locationMap = new Map(
        (locationsResponse || []).map((loc: any) => [Number(loc.driver_id), loc])
      );

      // Merge drivers with their locations (live GPS or warehouse fallback)
      const merged = (driversResponse.items || [])
        .map((driver: any) => {
          const liveLocation = locationMap.get(Number(driver.id));
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

  // Log which markers are being rendered
  console.log('[MiniMapView] Rendering markers for drivers:', drivers?.length || 0);

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

             console.log(`[MiniMapView] Rendering marker for driver ${driver.driver_id} at (${lat}, ${lng})`);

             return (
               <Marker
                 key={driver.driver_id}
                 position={{ lat, lng }}
                 title={driver.name || driver.vehicle_info || `Driver ${driver.driver_id}`}
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
