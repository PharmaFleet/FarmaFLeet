import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
// Assuming types are available globally or we can use any for now, but ideally import correctly.
// Since I don't see exact type definitions readily available in the previous view, I'll use any for the data prop items initially or infer structure.
// Actually I saw PaymentSchema in backend, frontend probably has an interface. 
// I'll assume `any` for `data` for now to avoid compilation errors if I guess the interface path wrong, 
// OR I can inline the interface based on usage in PaymentsPage.tsx.

interface Payment {
  id: number;
  transaction_id?: string;
  order_id: number;
  driver_name?: string;
  driver_id?: number;
  amount: number;
  method: string;
  verified_at?: string;
  collected_at?: string;
  created_at?: string;
}

interface PaymentTableProps {
  data: any; // Using any to be safe with React Query data structure { items: [], total: ... }
  isLoading: boolean;
  verifyPayment: (id: number) => void;
}

export function PaymentTable({ data, isLoading, verifyPayment }: PaymentTableProps) {
  return (
    <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead>Transaction ID</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                [...Array(6)].map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                         <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                         <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
                         <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                         <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                         <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                         <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                         <TableCell><div className="h-4 w-32 bg-muted rounded" /></TableCell>
                    </TableRow>
                ))
            ) : data?.items?.length === 0 ? (
                <TableRow>
                     <TableCell colSpan={7} className="h-40 text-center text-muted-foreground italic">No payments found.</TableCell>
                </TableRow>
            ) : (
                data?.items?.map((payment: Payment) => (
                    <TableRow key={payment.id} className="group hover:bg-emerald-50/30 transition-colors">
                        <TableCell className="font-mono text-xs text-muted-foreground group-hover:text-emerald-700">
                            {payment.transaction_id || `TX-${payment.id}`}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">#{payment.order_id}</TableCell>
                        <TableCell className="text-muted-foreground">
                            {payment.driver_name || `Driver #${payment.driver_id}`}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">{payment.amount.toFixed(3)} KWD</TableCell>
                        <TableCell>
                            <span className="text-sm text-muted-foreground">{payment.method}</span>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Badge 
                                    className={cn(
                                        "font-medium px-2.5 py-0.5 rounded-full border-0 shadow-sm",
                                        payment.verified_at ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                    )}
                                >
                                    {payment.verified_at ? "VERIFIED" : "PENDING"}
                                </Badge>
                                {!payment.verified_at && (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 w-6 p-0 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-full"
                                        title="Verify Payment"
                                        onClick={() => verifyPayment(payment.id)}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                            {new Date(payment.collected_at || payment.created_at || '').toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </TableCell>
                    </TableRow>
                ))
            )}
          </TableBody>
        </Table>
    </div>
  );
}
