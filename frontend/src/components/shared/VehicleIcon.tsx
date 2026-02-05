import { Car, Bike } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VehicleIconProps {
  vehicleType?: string;
  className?: string;
  size?: number;
}

export function VehicleIcon({ vehicleType, className, size = 16 }: VehicleIconProps) {
  if (vehicleType === 'motorcycle') {
    return <Bike className={cn("text-orange-500", className)} size={size} />;
  }
  return <Car className={cn("text-blue-500", className)} size={size} />;
}
