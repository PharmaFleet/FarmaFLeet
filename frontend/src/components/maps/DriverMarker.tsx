import React, { memo, useMemo } from 'react';
import { Marker, Pin } from '@vis.gl/react-google-maps';
import { DriverWithLocation, DriverMapStatus } from '@/stores/driversStore';

interface DriverMarkerProps {
  driver: DriverWithLocation;
  isSelected: boolean;
  onClick: (driver: DriverWithLocation) => void;
}

/**
 * Status color mapping for driver markers
 */
const STATUS_COLORS: Record<DriverMapStatus, { background: string; border: string; glyph: string }> = {
  [DriverMapStatus.ONLINE]: {
    background: '#22c55e', // green-500
    border: '#16a34a', // green-600
    glyph: '#ffffff',
  },
  [DriverMapStatus.OFFLINE]: {
    background: '#6b7280', // gray-500
    border: '#4b5563', // gray-600
    glyph: '#ffffff',
  },
  [DriverMapStatus.BUSY]: {
    background: '#ef4444', // red-500
    border: '#dc2626', // red-600
    glyph: '#ffffff',
  },
  [DriverMapStatus.ON_BREAK]: {
    background: '#eab308', // yellow-500
    border: '#ca8a04', // yellow-600
    glyph: '#ffffff',
  },
};

/**
 * Custom comparison function for React.memo
 * Only re-render if position, status, or selection state changes
 */
function areEqual(prevProps: DriverMarkerProps, nextProps: DriverMarkerProps): boolean {
  const prevDriver = prevProps.driver;
  const nextDriver = nextProps.driver;

  // Check if position changed
  if (prevDriver.latitude !== nextDriver.latitude || 
      prevDriver.longitude !== nextDriver.longitude) {
    return false;
  }

  // Check if status changed
  if (prevDriver.status !== nextDriver.status) {
    return false;
  }

  // Check if selection state changed
  if (prevProps.isSelected !== nextProps.isSelected) {
    return false;
  }

  // Check if heading changed (for rotation)
  if (prevDriver.heading !== nextDriver.heading) {
    return false;
  }

  return true;
}

/**
 * Driver Marker Component
 * 
 * Displays a driver as a pin on the map with status-based coloring.
 * Memoized for performance with custom comparison function.
 * 
 * Features:
 * - Status color mapping (online=green, offline=gray, busy=red, on_break=yellow)
 * - Pin scaling based on selection state
 * - Click handler for selection
 * - Heading indicator for driver direction
 */
export const DriverMarker = memo(function DriverMarker({
  driver,
  isSelected,
  onClick,
}: DriverMarkerProps): JSX.Element | null {
  // Skip rendering if no valid position
  if (!driver.latitude || !driver.longitude) {
    return null;
  }

  const colors = STATUS_COLORS[driver.status] || STATUS_COLORS[DriverMapStatus.OFFLINE];

  // Calculate scale based on selection state
  const scale = isSelected ? 1.3 : 1;

  // Memoize position to prevent unnecessary re-renders
  const position = useMemo(
    () => ({ lat: driver.latitude!, lng: driver.longitude! }),
    [driver.latitude, driver.longitude]
  );

  // Custom glyph showing driver initial or icon
  const glyph = useMemo(() => {
    const initial = driver.user?.full_name?.charAt(0).toUpperCase() || 
                    driver.user?.email?.charAt(0).toUpperCase() || 
                    'D';
    return initial;
  }, [driver.user?.full_name, driver.user?.email]);

  const handleClick = () => {
    onClick(driver);
  };

  return (
    <Marker
      position={position}
      onClick={handleClick}
      title={`${driver.user?.full_name || 'Driver'} - ${driver.status}`}
    >
      <Pin
        background={colors.background}
        borderColor={colors.border}
        glyphColor={colors.glyph}
        scale={scale}
        glyph={glyph}
      />
    </Marker>
  );
}, areEqual);

export default DriverMarker;
