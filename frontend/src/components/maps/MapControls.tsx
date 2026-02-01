import { X, Filter, Route, User, Users, Coffee, CircleOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverWithLocation, DriverMapStatus, MapBounds } from '@/stores/driversStore';

interface MapControlsProps {
  selectedDriver: DriverWithLocation | null;
  onCloseDriverInfo: () => void;
  statusFilter: DriverMapStatus | null;
  onStatusFilterChange: (status: DriverMapStatus | null) => void;
  showRoutes: boolean;
  onToggleRoutes: () => void;
  drivers: DriverWithLocation[];
  filteredDrivers: DriverWithLocation[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

/**
 * Status filter configuration
 */
const STATUS_FILTERS: { status: DriverMapStatus | null; label: string; icon: React.ReactNode; color: string }[] = [
  { status: null, label: 'All', icon: <Users className="h-4 w-4" />, color: 'bg-primary' },
  { status: DriverMapStatus.ONLINE, label: 'Online', icon: <User className="h-4 w-4" />, color: 'bg-green-500' },
  { status: DriverMapStatus.BUSY, label: 'Busy', icon: <CircleOff className="h-4 w-4" />, color: 'bg-red-500' },
  { status: DriverMapStatus.ON_BREAK, label: 'Break', icon: <Coffee className="h-4 w-4" />, color: 'bg-yellow-500' },
  { status: DriverMapStatus.OFFLINE, label: 'Offline', icon: <Users className="h-4 w-4" />, color: 'bg-gray-500' },
];

/**
 * Get status label for display
 */
function getStatusLabel(status: DriverMapStatus): string {
  switch (status) {
    case DriverMapStatus.ONLINE:
      return 'Online';
    case DriverMapStatus.OFFLINE:
      return 'Offline';
    case DriverMapStatus.BUSY:
      return 'On Delivery';
    case DriverMapStatus.ON_BREAK:
      return 'On Break';
    default:
      return 'Unknown';
  }
}

/**
 * Get status badge variant
 */
function getStatusBadgeVariant(status: DriverMapStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case DriverMapStatus.ONLINE:
      return 'default';
    case DriverMapStatus.BUSY:
      return 'destructive';
    case DriverMapStatus.ON_BREAK:
      return 'secondary';
    case DriverMapStatus.OFFLINE:
    default:
      return 'outline';
  }
}

/**
 * Map Controls Component
 * 
 * Provides UI controls for the map:
 * - Status filter buttons
 * - Route visibility toggle
 * - Selected driver info panel
 * - Driver statistics
 */
export function MapControls({
  selectedDriver,
  onCloseDriverInfo,
  statusFilter,
  onStatusFilterChange,
  showRoutes,
  onToggleRoutes,
  drivers,
  filteredDrivers,
  isLoading,
  onRefresh,
}: MapControlsProps): JSX.Element {
  // Count drivers by status
  const statusCounts = {
    [DriverMapStatus.ONLINE]: drivers.filter((d) => d.status === DriverMapStatus.ONLINE).length,
    [DriverMapStatus.BUSY]: drivers.filter((d) => d.status === DriverMapStatus.BUSY).length,
    [DriverMapStatus.ON_BREAK]: drivers.filter((d) => d.status === DriverMapStatus.ON_BREAK).length,
    [DriverMapStatus.OFFLINE]: drivers.filter((d) => d.status === DriverMapStatus.OFFLINE).length,
  };

  return (
    <>
      {/* Filter Controls */}
      <Card className="absolute top-4 left-4 z-10 w-64 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Driver Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => {
              const count = filter.status === null
                ? drivers.length
                : statusCounts[filter.status] || 0;

              return (
                <Button
                  key={filter.label}
                  variant={statusFilter === filter.status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onStatusFilterChange(filter.status)}
                  className="flex items-center gap-1.5 h-8 text-xs"
                >
                  <span className={`w-2 h-2 rounded-full ${filter.color}`} />
                  {filter.label}
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {/* Route Toggle */}
          <div className="pt-2 border-t">
            <Button
              variant={showRoutes ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleRoutes}
              className="w-full flex items-center gap-2 h-8"
            >
              <Route className="h-4 w-4" />
              {showRoutes ? 'Hide Routes' : 'Show Routes'}
            </Button>
          </div>

          {/* Stats */}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Showing:</span>
              <span className="font-medium">
                {filteredDrivers.length} of {drivers.length} drivers
              </span>
            </div>
            {isLoading && (
              <div className="mt-1 text-primary">Updating locations...</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Driver Info Panel */}
      {selectedDriver && (
        <Card className="absolute bottom-4 right-4 z-10 w-72 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Driver Details
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onCloseDriverInfo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm">
                {selectedDriver.user?.full_name || 'Unknown Driver'}
              </h4>
              <p className="text-xs text-muted-foreground">
                {selectedDriver.user?.email}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(selectedDriver.status)}>
                {getStatusLabel(selectedDriver.status)}
              </Badge>
              {selectedDriver.is_available && (
                <Badge variant="outline" className="text-xs">
                  Available
                </Badge>
              )}
            </div>

            {selectedDriver.vehicle_info && (
              <div className="text-xs">
                <span className="text-muted-foreground">Vehicle:</span>{' '}
                <span className="font-medium">{selectedDriver.vehicle_info}</span>
              </div>
            )}

            {selectedDriver.warehouse && (
              <div className="text-xs">
                <span className="text-muted-foreground">Warehouse:</span>{' '}
                <span className="font-medium">{selectedDriver.warehouse.name}</span>
              </div>
            )}

            {selectedDriver.lastUpdated && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Last updated: {new Date(selectedDriver.lastUpdated).toLocaleTimeString()}
              </div>
            )}

            {selectedDriver.currentOrderId && (
              <div className="pt-2">
                <Button size="sm" className="w-full h-8 text-xs">
                  View Active Order #{selectedDriver.currentOrderId}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default MapControls;
