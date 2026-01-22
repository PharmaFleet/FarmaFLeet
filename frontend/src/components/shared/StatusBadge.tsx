import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@/types';

interface StatusBadgeProps {
  status: OrderStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let className = "";

  switch (status) {
    case OrderStatus.PENDING:
      variant = "secondary";
      className = "bg-amber-100 text-amber-800 hover:bg-amber-200";
      break;
    case OrderStatus.ASSIGNED:
      variant = "default";
      className = "bg-blue-100 text-blue-800 hover:bg-blue-200";
      break;
    case OrderStatus.OUT_FOR_DELIVERY:
      variant = "default";
      className = "bg-indigo-100 text-indigo-800 hover:bg-indigo-200";
      break;
    case OrderStatus.DELIVERED:
      variant = "default"; // green usually
      className = "bg-emerald-100 text-emerald-800 hover:bg-emerald-200";
      break;
    case OrderStatus.FAILED:
    case OrderStatus.CANCELLED:
      variant = "destructive";
      break;
    default:
      variant = "outline";
  }

  return (
    <Badge variant="outline" className={`border-0 ${className}`}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
