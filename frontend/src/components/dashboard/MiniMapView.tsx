import { useQuery } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Kuwait City center
const DEFAULT_CENTER = { lat: 29.3759, lng: 47.9774 };

export function MiniMapView() {
  const [mapError, setMapError] = useState<string | null>(null);
  const [MapComponents, setMapComponents] = useState<any>(null);

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['driver-locations-mini'],
    queryFn: driverService.getLocations,
    refetchInterval: 10000,
  });

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
          Online Drivers ({drivers?.length || 0})
        </div>
        {drivers?.slice(0, 5).map((driver: any) => (
          <div key={driver.driver_id || driver.id} className="flex items-center gap-2 p-2 bg-white rounded mb-1 shadow-sm">
            <MapPin className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-slate-700">{driver.vehicle_info || `Driver ${driver.driver_id || driver.id}`}</span>
            <span className="text-xs text-slate-400 ml-auto">
              🟢 Online
            </span>
          </div>
        ))}
        {(!drivers || drivers.length === 0) && (
          <div className="text-sm text-slate-400 text-center py-4">No drivers online</div>
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

  // Custom driver icon - Green circle with white truck
  const driverIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="#10b981" stroke="white" stroke-width="2" />
        <g transform="translate(6, 6)">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M15 18H9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <circle cx="17" cy="18" r="2" stroke="white" stroke-width="2" fill="none"/>
          <circle cx="7" cy="18" r="2" stroke="white" stroke-width="2" fill="none"/>
        </g>
      </svg>
    `),
    scaledSize: { width: 36, height: 36 },
    anchor: { x: 18, y: 18 }
  };

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
             // Ensure valid coordinates
             if (!driver.latitude || !driver.longitude) return null;
             
             const lat = driver.latitude;
             const lng = driver.longitude;
             
             return (
               <Marker
                 key={driver.driver_id}
                 position={{ lat, lng }}
                 icon={driverIcon as any}
                 title={driver.vehicle_info || `Driver ${driver.driver_id}`}
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
