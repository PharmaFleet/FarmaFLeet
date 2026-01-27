import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@/types';

interface StatusBadgeProps {
  status: OrderStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let className = "";

  switch (status) {
    case OrderStatus.PENDING:
      className = "bg-amber-100 text-amber-800 hover:bg-amber-200";
      break;
    case OrderStatus.ASSIGNED:
      className = "bg-blue-100 text-blue-800 hover:bg-blue-200";
      break;
    case OrderStatus.OUT_FOR_DELIVERY:
      className = "bg-indigo-100 text-indigo-800 hover:bg-indigo-200";
      break;
    case OrderStatus.DELIVERED:
      className = "bg-emerald-100 text-emerald-800 hover:bg-emerald-200";
      break;
    case OrderStatus.FAILED:
    case OrderStatus.CANCELLED:
      break;
    default:
      break;
  }

  return (
    <Badge variant="outline" className={`border-0 ${className}`}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
