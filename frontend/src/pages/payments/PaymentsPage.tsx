import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { paymentService } from '@/services/paymentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Filter, Download } from 'lucide-react';

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, search],
    queryFn: () => paymentService.getAll({ 
        page, 
        limit: 10, 
        search: search || undefined
    }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-slate-900">Payments</h2>
           <p className="text-slate-500">Track collections and reconcile transactions.</p>
        </div>
        <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
        </Button>
      </div>

      <div className="flex gap-2 items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
            <Input 
                placeholder="Search transaction..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
            />
        </div>
        <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                         <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                    </TableRow>
                ))
            ) : data?.items?.length === 0 ? (
                <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center">No payments found.</TableCell>
                </TableRow>
            ) : (
                data?.items?.map((payment) => (
                    <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">{payment.transaction_id || `TX-${payment.id}`}</TableCell>
                        <TableCell>#{payment.order_id}</TableCell>
                        <TableCell className="font-medium">{payment.amount.toFixed(3)} KWD</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>
                            <Badge variant={payment.status === 'COMPLETED' ? 'default' : 'destructive'} 
                                   className={payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                                {payment.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">
                            {new Date(payment.created_at).toLocaleDateString()}
                        </TableCell>
                    </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((old) => Math.max(old - 1, 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span className="text-sm text-slate-600">
            Page {page} of {data?.pages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((old) => (data?.pages && old < data.pages ? old + 1 : old))}
          disabled={!data || page === data.pages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
