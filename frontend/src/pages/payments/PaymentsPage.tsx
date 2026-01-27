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
import { Download, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  const handleExport = async () => {
      try {
          await paymentService.export();
      } catch (error) {
          console.error("Export failed", error);
          alert("Export failed");
      }
  };

  return (
    <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
           <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Payments</h2>
           <p className="text-slate-500 mt-1">Track collections, reconcile transactions, and monitor financial health.</p>
        </div>
        <Button variant="outline" className="shadow-sm border-slate-200" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4 text-emerald-600" />
            Export Report
        </Button>
      </div>

      {/* Grid Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50/50 p-6 border-b border-slate-200">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search transaction ID or Order #..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 border-slate-200 focus:ring-emerald-500/20"
                />
            </div>
            {/* <Button variant="outline" size="icon" className="shrink-0 bg-white" onClick={() => alert("Filter functionality")}>
                <Filter className="h-4 w-4" />
            </Button> */}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-b">
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
                    [...Array(6)].map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                             <TableCell><div className="h-4 w-24 bg-slate-100 rounded" /></TableCell>
                             <TableCell><div className="h-4 w-16 bg-slate-100 rounded" /></TableCell>
                             <TableCell><div className="h-4 w-20 bg-slate-100 rounded" /></TableCell>
                             <TableCell><div className="h-4 w-20 bg-slate-100 rounded" /></TableCell>
                             <TableCell><div className="h-4 w-20 bg-slate-100 rounded" /></TableCell>
                             <TableCell><div className="h-4 w-32 bg-slate-100 rounded" /></TableCell>
                        </TableRow>
                    ))
                ) : data?.items?.length === 0 ? (
                    <TableRow>
                         <TableCell colSpan={6} className="h-40 text-center text-slate-400 italic">No payments found.</TableCell>
                    </TableRow>
                ) : (
                    data?.items?.map((payment) => (
                        <TableRow key={payment.id} className="group hover:bg-emerald-50/30 transition-colors">
                            <TableCell className="font-mono text-xs text-slate-500 group-hover:text-emerald-700">
                                {payment.transaction_id || `TX-${payment.id}`}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">#{payment.order_id}</TableCell>
                            <TableCell className="font-bold text-slate-900">{payment.amount.toFixed(3)} KWD</TableCell>
                            <TableCell>
                                <span className="text-sm text-slate-600">{payment.method}</span>
                            </TableCell>
                            <TableCell>
                                <Badge 
                                    className={cn(
                                        "font-medium px-2.5 py-0.5 rounded-full border-0 shadow-sm",
                                        payment.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                    )}
                                >
                                    {payment.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs">
                                {new Date(payment.created_at).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </TableCell>
                        </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
        </div>
      </div>
      
       {/* Pagination Controls */}
       <div className="flex items-center justify-between px-2">
        <p className="text-xs text-slate-400">
            Audit trail of financial collections
        </p>
        <div className="flex items-center space-x-4">
            <span className="text-xs font-medium text-slate-500">
                Page {page} of {data?.pages || 1}
            </span>
            <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={() => setPage((old) => Math.max(old - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={() => setPage((old) => (data?.pages && old < data.pages ? old + 1 : old))}
                  disabled={!data || page === data.pages}
                >
                  Next
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
