import React, { memo, useMemo } from 'react';
import { Marker } from '@vis.gl/react-google-maps';
import { DriverWithLocation, DriverMapStatus } from '@/stores/driversStore';

interface DriverMarkerProps {
  driver: DriverWithLocation;
  isSelected: boolean;
  onClick: (driver: DriverWithLocation) => void;
}

/**
 * Status color mapping for driver markers
 */
const STATUS_COLORS: Record<DriverMapStatus, string> = {
  [DriverMapStatus.ONLINE]: '#22c55e', // green-500
  [DriverMapStatus.OFFLINE]: '#6b7280', // gray-500
  [DriverMapStatus.BUSY]: '#ef4444', // red-500
  [DriverMapStatus.ON_BREAK]: '#eab308', // yellow-500
};

/**
 * Create a motorcycle marker icon as a data URL
 */
function createMarkerIcon(color: string, isSelected: boolean, hasLiveLocation: boolean | undefined): string {
  const size = isSelected ? 40 : 32;
  const opacity = hasLiveLocation === false ? 0.7 : 1;

  // Motorcycle icon SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <!-- Background circle -->
      <circle cx="12" cy="12" r="11" fill="${color}" stroke="white" stroke-width="2" opacity="${opacity}"/>
      <!-- Motorcycle icon (simplified scooter/delivery bike) -->
      <g transform="translate(4, 6)" fill="white">
        <!-- Body -->
        <rect x="3" y="4" width="8" height="3" rx="1"/>
        <!-- Front wheel -->
        <circle cx="3" cy="9" r="2.5" fill="none" stroke="white" stroke-width="1.5"/>
        <!-- Back wheel -->
        <circle cx="13" cy="9" r="2.5" fill="none" stroke="white" stroke-width="1.5"/>
        <!-- Handlebar -->
        <path d="M2 3 L4 5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <!-- Seat -->
        <ellipse cx="9" cy="3.5" rx="2.5" ry="1" fill="white"/>
      </g>
    </svg>
  `;

  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

/**
 * Custom comparison function for React.memo
 * Only re-render if position, status, selection state, or live location flag changes
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

  // Check if live location flag changed
  if (prevDriver.hasLiveLocation !== nextDriver.hasLiveLocation) {
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
  // Skip rendering if no valid position (check for null/undefined, not falsy - 0 is valid)
  if (driver.latitude == null || driver.longitude == null) {
    console.log('[DriverMarker] Skipping driver without coords:', driver.id);
    return null;
  }

  const color = STATUS_COLORS[driver.status] || STATUS_COLORS[DriverMapStatus.OFFLINE];

  // Memoize position to prevent unnecessary re-renders
  const position = useMemo(
    () => ({ lat: driver.latitude!, lng: driver.longitude! }),
    [driver.latitude, driver.longitude]
  );

  // Memoize icon to prevent recreation
  const icon = useMemo(
    () => createMarkerIcon(color, isSelected, driver.hasLiveLocation),
    [color, isSelected, driver.hasLiveLocation]
  );

  const handleClick = () => {
    onClick(driver);
  };

  // Build title with location source info
  const locationInfo = driver.hasLiveLocation ? 'GPS' : 'Warehouse';
  const title = `${driver.user?.full_name || 'Driver'} - ${driver.status} (${locationInfo})`;

  console.log(`[DriverMarker] Rendering marker for driver ${driver.id} at (${position.lat}, ${position.lng})`);

  return (
    <Marker
      position={position}
      onClick={handleClick}
      title={title}
      icon={icon}
    />
  );
}, areEqual);

export default DriverMarker;
