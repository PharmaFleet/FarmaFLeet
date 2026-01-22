import { useQuery } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

// Kuwait City center
const DEFAULT_CENTER = { lat: 29.3759, lng: 47.9774 };

export function MiniMapView() {
  const [mapError, setMapError] = useState<string | null>(null);
  const [MapComponents, setMapComponents] = useState<any>(null);

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['driver-locations-mini'],
    queryFn: driverService.getAllOnline,
    refetchInterval: 15000,
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
        {drivers?.slice(0, 5).map((driver) => (
          <div key={driver.id} className="flex items-center gap-2 p-2 bg-white rounded mb-1 shadow-sm">
            <MapPin className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-slate-700">{driver.user?.full_name || 'Driver'}</span>
            <span className="text-xs text-slate-400 ml-auto">
              {driver.is_available ? '🟢 Online' : '⚫ Busy'}
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
          {drivers?.map((driver) => {
            const lat = driver.warehouse?.latitude || DEFAULT_CENTER.lat + (driver.id * 0.01);
            const lng = driver.warehouse?.longitude || DEFAULT_CENTER.lng + (driver.id * 0.01);
            return (
              <Marker
                key={driver.id}
                position={{ lat, lng }}
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
