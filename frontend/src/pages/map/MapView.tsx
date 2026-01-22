import { useState, useCallback } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { useQuery } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
import { Driver } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

export default function MapView() {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Poll for driver locations every 10 seconds
  const { data: drivers, isLoading } = useQuery({
    queryKey: ['driver-locations'],
    queryFn: driverService.getAllOnline, // Assuming this returns Driver[] with lat/lng populated or warehouse data
    refetchInterval: 10000,
  });

  const handleMarkerClick = useCallback((driver: Driver) => {
    setSelectedDriver(driver);
  }, []);

  if (!GOOGLE_MAPS_KEY) {
      return (
          <div className="flex items-center justify-center h-[calc(100vh-100px)] text-slate-500">
              Please configure VITE_GOOGLE_MAPS_KEY in .env
          </div>
      )
  }

  // Fallback center (Kuwait City approx)
  const defaultCenter = { lat: 29.3759, lng: 47.9774 };

  return (
    <div className="h-[calc(100vh-100px)] w-full rounded-xl overflow-hidden shadow-sm border relative">
       {/* Sidebar Overlay for Driver List (Desktop) - optional, keeping it simple for now */}
       
       <APIProvider apiKey={GOOGLE_MAPS_KEY}>
          <Map
             defaultCenter={defaultCenter}
             defaultZoom={11}
             gestureHandling={'greedy'}
             disableDefaultUI={false}
             className="w-full h-full"
          >
             {/* Render Drivers */}
             {drivers?.map((driver) => {
                 // Mocking location if missing for demo purposes, relying on warehouse/mock
                 // In real app, driver should have current_location: { lat, lng }
                 // Let's assume warehouse location for now if no realtime
                 const lat = driver.warehouse?.latitude || defaultCenter.lat + (Math.random() - 0.5) * 0.1;
                 const lng = driver.warehouse?.longitude || defaultCenter.lng + (Math.random() - 0.5) * 0.1;

                 return (
                     <Marker
                        key={driver.id}
                        position={{ lat, lng }}
                        onClick={() => handleMarkerClick(driver)}
                     />
                 )
             })}

             {selectedDriver && (
                <InfoWindow
                   position={{ 
                       lat: selectedDriver.warehouse?.latitude || defaultCenter.lat, // usage of mock
                       lng: selectedDriver.warehouse?.longitude || defaultCenter.lng
                   }} 
                   onCloseClick={() => setSelectedDriver(null)}
                >
                   <div className="p-2 min-w-[200px]">
                       <h3 className="font-bold text-sm">{selectedDriver.user?.full_name}</h3>
                       <div className="flex items-center gap-2 mt-1">
                           <Badge variant={selectedDriver.is_available ? 'default' : 'secondary'}>
                               {selectedDriver.is_available ? 'Online' : 'Busy'}
                           </Badge>
                       </div>
                       <div className="mt-2 text-xs text-slate-500">
                           <p>Vehicle: {selectedDriver.vehicle_info}</p>
                           <p>Phone: {selectedDriver.user?.email}</p>
                       </div>
                       <Button size="sm" className="w-full mt-2 h-7 text-xs">
                           View Details
                       </Button>
                   </div>
                </InfoWindow>
             )}
          </Map>
       </APIProvider>

       {isLoading && (
           <div className="absolute top-4 right-4 bg-white p-2 rounded-md shadow-md flex items-center gap-2 text-xs">
               <Loader2 className="h-3 w-3 animate-spin"/> Updating...
           </div>
       )}
    </div>
  );
}
