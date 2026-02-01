import { useEffect, useState, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { DriverWithLocation, DriverMapStatus } from '@/stores/driversStore';

interface RouteOverlayProps {
  drivers: DriverWithLocation[];
  visible: boolean;
}

interface RouteData {
  driverId: number;
  polyline: string;
  decodedPath: google.maps.LatLng[];
}

/**
 * Decode an encoded polyline string into LatLng array
 * Based on Google's polyline encoding algorithm
 */
function decodePolyline(encoded: string): google.maps.LatLng[] {
  const points: google.maps.LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push(new google.maps.LatLng(lat * 1e-5, lng * 1e-5));
  }

  return points;
}

/**
 * Get route color based on driver status
 */
function getRouteColor(status: DriverMapStatus): string {
  switch (status) {
    case DriverMapStatus.ONLINE:
      return '#22c55e'; // green-500
    case DriverMapStatus.BUSY:
      return '#ef4444'; // red-500
    case DriverMapStatus.ON_BREAK:
      return '#eab308'; // yellow-500
    case DriverMapStatus.OFFLINE:
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Route Overlay Component
 * 
 * Renders delivery routes as polylines on the map for drivers with active deliveries.
 * Fetches routes from the API and decodes polylines for display.
 * 
 * Features:
 * - Fetch routes for drivers with active deliveries
 * - Decode polylines and render on map
 * - Color routes by driver status
 * - Clean up polylines on unmount
 */
export function RouteOverlay({ drivers, visible }: RouteOverlayProps): null {
  const map = useMap();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Fetch routes for busy drivers
  useEffect(() => {
    const fetchRoutes = async () => {
      // Only fetch routes for drivers who are busy (have active deliveries)
      const busyDrivers = drivers.filter(
        (d) => d.status === DriverMapStatus.BUSY && d.currentOrderId
      );

      if (busyDrivers.length === 0) {
        setRoutes([]);
        return;
      }

      try {
        // Fetch routes for each busy driver
        const routePromises = busyDrivers.map(async (driver) => {
          try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(
              `${baseUrl}/drivers/${driver.id}/route`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
                },
              }
            );

            if (!response.ok) {
              return null;
            }

            const data = await response.json();
            
            if (data.polyline) {
              return {
                driverId: driver.id,
                polyline: data.polyline,
                decodedPath: decodePolyline(data.polyline),
              };
            }
            return null;
          } catch (error) {
            console.error(`Failed to fetch route for driver ${driver.id}:`, error);
            return null;
          }
        });

        const fetchedRoutes = (await Promise.all(routePromises)).filter(
          (r): r is RouteData => r !== null
        );

        setRoutes(fetchedRoutes);
      } catch (error) {
        console.error('Failed to fetch routes:', error);
      }
    };

    fetchRoutes();
  }, [drivers]);

  // Render/clear polylines when routes or visibility changes
  useEffect(() => {
    if (!map) return;

    // Clear existing polylines
    polylinesRef.current.forEach((polyline) => {
      polyline.setMap(null);
    });
    polylinesRef.current = [];

    // Don't render if not visible
    if (!visible) return;

    // Create new polylines
    routes.forEach((route) => {
      const driver = drivers.find((d) => d.id === route.driverId);
      if (!driver) return;

      const polyline = new google.maps.Polyline({
        path: route.decodedPath,
        geodesic: true,
        strokeColor: getRouteColor(driver.status),
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: map,
      });

      polylinesRef.current.push(polyline);
    });

    // Cleanup on unmount
    return () => {
      polylinesRef.current.forEach((polyline) => {
        polyline.setMap(null);
      });
      polylinesRef.current = [];
    };
  }, [map, routes, visible, drivers]);

  // This component doesn't render any React elements directly
  return null;
}

export default RouteOverlay;
