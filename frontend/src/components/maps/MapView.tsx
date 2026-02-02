import { useEffect, useState, useCallback, useRef } from 'react';
import { Map, useMap } from '@vis.gl/react-google-maps';
import { MapProvider } from './MapProvider';
import { DriverMarker } from './DriverMarker';
import { RouteOverlay } from './RouteOverlay';
import { MapControls } from './MapControls';
import { useDriversStore, DriverWithLocation, MapBounds, DriverMapStatus } from '@/stores/driversStore';
import { useWebSocket } from '@/hooks/useWebSocket';

// Kuwait coordinates as default center
const DEFAULT_CENTER = { lat: 29.3759, lng: 47.9774 };
const DEFAULT_ZOOM = 12;

// Debounce delay for bounds changes
const BOUNDS_DEBOUNCE_MS = 500;

// Polling interval for fallback (10 seconds)
const POLLING_INTERVAL_MS = 10000;

/**
 * Map View Inner Component
 * 
 * Contains the actual map implementation. Wrapped by MapProvider for API initialization.
 */
function MapViewInner(): JSX.Element {
  const map = useMap();
  const {
    drivers,
    selectedDriver,
    isLoading,
    statusFilter,
    showRoutes,
    bounds,
    setDrivers,
    updateDriverLocation,
    setSelectedDriver,
    setStatusFilter,
    setShowRoutes,
    setBounds,
    fetchDrivers,
    getFilteredDrivers,
  } = useDriversStore();

  const [usePolling, setUsePolling] = useState(false);
  const boundsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get filtered drivers based on status
  const filteredDrivers = getFilteredDrivers();

  /**
   * Debounced bounds change handler
   * Waits 500ms after bounds stop changing before updating
   */
  const handleBoundsChanged = useCallback(() => {
    if (!map) return;

    // Clear existing timeout
    if (boundsTimeoutRef.current) {
      clearTimeout(boundsTimeoutRef.current);
    }

    // Set new timeout
    boundsTimeoutRef.current = setTimeout(() => {
      const newBounds = map.getBounds();
      if (newBounds) {
        const ne = newBounds.getNorthEast();
        const sw = newBounds.getSouthWest();
        
        const mapBounds: MapBounds = {
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        };
        
        setBounds(mapBounds);
        
        // Fetch drivers for new bounds
        fetchDrivers();
      }
    }, BOUNDS_DEBOUNCE_MS);
  }, [map, setBounds, fetchDrivers]);

  /**
   * Handle WebSocket messages for real-time driver location updates
   */
  const handleWebSocketMessage = useCallback((message: { type: string; data: unknown }) => {
    switch (message.type) {
      case 'driver_location_update': {
        const locationData = message.data as {
          driver_id: number;
          latitude: number;
          longitude: number;
          heading?: number;
          speed?: number;
          status?: DriverMapStatus;
        };
        
        updateDriverLocation(locationData.driver_id, {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          heading: locationData.heading,
          speed: locationData.speed,
          status: locationData.status,
        });
        break;
      }
      
      case 'driver_status_change': {
        const statusData = message.data as {
          driver_id: number;
          status: DriverMapStatus;
          current_order_id?: number;
        };
        
        updateDriverLocation(statusData.driver_id, {
          status: statusData.status,
          currentOrderId: statusData.current_order_id,
        });
        break;
      }
      
      case 'drivers_list': {
        // Full refresh of drivers list
        const driversList = message.data as DriverWithLocation[];
        setDrivers(driversList);
        break;
      }
      
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }, [updateDriverLocation, setDrivers]);

  /**
   * Handle WebSocket connection errors
   */
  const handleWebSocketError = useCallback(() => {
    console.warn('WebSocket connection failed, switching to polling mode');
    setUsePolling(true);
  }, []);

  // Initialize WebSocket connection
  const { isConnected: wsConnected } = useWebSocket({
    url: '/ws/drivers',
    onMessage: handleWebSocketMessage,
    onError: handleWebSocketError,
    reconnectInterval: 5000,
    maxReconnectAttempts: 3,
  });

  // Fallback polling when WebSocket is not connected
  useEffect(() => {
    // If WebSocket is connected, clear any existing polling
    if (wsConnected && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setUsePolling(false);
      return;
    }

    // Start polling if WebSocket is not connected and polling is enabled
    if (usePolling && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        fetchDrivers();
      }, POLLING_INTERVAL_MS);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [wsConnected, usePolling, fetchDrivers]);

  // Initial fetch on mount
  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (boundsTimeoutRef.current) {
        clearTimeout(boundsTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle driver marker click
   */
  const handleDriverClick = useCallback((driver: DriverWithLocation) => {
    setSelectedDriver(driver);
    
    // Center map on selected driver
    if (map && driver.latitude && driver.longitude) {
      map.panTo({ lat: driver.latitude, lng: driver.longitude });
      map.setZoom(15);
    }
  }, [map, setSelectedDriver]);

  /**
   * Handle closing driver info panel
   */
  const handleCloseDriverInfo = useCallback(() => {
    setSelectedDriver(null);
  }, [setSelectedDriver]);

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = useCallback((status: DriverMapStatus | null) => {
    setStatusFilter(status);
  }, [setStatusFilter]);

  /**
   * Handle route visibility toggle
   */
  const handleToggleRoutes = useCallback(() => {
    setShowRoutes(!showRoutes);
  }, [showRoutes, setShowRoutes]);

  // Map options for performance
  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    renderingType: google.maps.RenderingType.RASTER,
  };

  return (
    <div className="relative w-full h-full min-h-[600px]">
      {/* Map Controls */}
      <MapControls
        selectedDriver={selectedDriver}
        onCloseDriverInfo={handleCloseDriverInfo}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        showRoutes={showRoutes}
        onToggleRoutes={handleToggleRoutes}
        drivers={drivers}
        filteredDrivers={filteredDrivers}
        isLoading={isLoading}
        onRefresh={fetchDrivers}
      />

      {/* Google Map */}
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        onBoundsChanged={handleBoundsChanged}
        gestureHandling="greedy"
        {...mapOptions}
        className="w-full h-full"
      >
        {/* Driver Markers */}
        {filteredDrivers.map((driver) => (
          <DriverMarker
            key={driver.id}
            driver={driver}
            isSelected={selectedDriver?.id === driver.id}
            onClick={handleDriverClick}
          />
        ))}

        {/* Route Overlay */}
        <RouteOverlay drivers={filteredDrivers} visible={showRoutes} />
      </Map>

      {/* Connection Status Indicator */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="flex items-center gap-2 text-xs bg-white/90 px-3 py-1.5 rounded-full shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-green-500' : usePolling ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          />
          <span className="text-muted-foreground">
            {wsConnected ? 'Live Updates' : usePolling ? 'Polling Mode' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Map View Page Component
 * 
 * Full-featured map with:
 * - Real-time driver location tracking via WebSocket
 * - Driver status filtering
 * - Delivery route visualization
 * - Interactive driver selection
 * - Fallback to polling if WebSocket fails
 */
export default function MapViewPage(): JSX.Element {
  return (
    <div className="h-[calc(100vh-64px)] w-full">
      <MapProvider>
        <MapViewInner />
      </MapProvider>
    </div>
  );
}
