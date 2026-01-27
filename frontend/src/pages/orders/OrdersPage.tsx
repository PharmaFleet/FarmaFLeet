import { useState, useRef } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AssignDriverDialog } from '@/components/orders/AssignDriverDialog';
import { CreateOrderDialog } from '@/components/orders/CreateOrderDialog';
import { MoreHorizontal, Plus, Download, Filter, Truck, Search, AlertOctagon } from 'lucide-react';
import { OrderStatus } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

import { useNavigate } from 'react-router-dom';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter] = useState<OrderStatus | ''>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; driverId?: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, search, statusFilter],
    queryFn: () => orderService.getAll({ 
        page, 
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined
    }),
    placeholderData: keepPreviousData,
  });

  const importMutation = useMutation({
    mutationFn: orderService.importExcel,
    onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        toast({
            title: "Import Successful",
            description: `Created: ${data.created}, Errors: ${data.errors.length}`,
            variant: data.errors.length > 0 ? "destructive" : "default"
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error: any) => {
        const msg = error.response?.data?.detail || "Could not upload file.";
        toast({
            title: "Import Failed",
            description: msg,
            variant: "destructive"
        });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          importMutation.mutate(e.target.files[0]);
      }
  };

  const handleAssignClick = (orderId: number, driverId?: number) => {
      setSelectedOrder({ id: orderId, driverId });
  };

  return (
    <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
      
      {selectedOrder && (
          <AssignDriverDialog 
            orderId={selectedOrder.id}
            currentDriverId={selectedOrder.driverId}
            open={!!selectedOrder}
            onOpenChange={(open) => !open && setSelectedOrder(null)}
          />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
           <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Orders</h2>
           <p className="text-slate-500 mt-1">Manage and track your delivery operations in real-time.</p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" className="shadow-sm border-slate-200" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
                <Download className="mr-2 h-4 w-4 text-emerald-600" />
                {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Order
            </Button>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
      />

      {/* Grid Container for filters and table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50/50 p-6 border-b border-slate-200">
            <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search orders, customers, phone..." 
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
                  <TableHead className="w-[140px]">Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right pr-8">Amount</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                            <TableCell><div className="h-4 w-24 bg-slate-100 rounded" /></TableCell>
                            <TableCell><div className="h-4 w-32 bg-slate-100 rounded" /></TableCell>
                            <TableCell><div className="h-4 w-20 bg-slate-100 rounded" /></TableCell>
                            <TableCell><div className="h-4 w-24 bg-slate-100 rounded" /></TableCell>
                            <TableCell><div className="h-4 w-24 bg-slate-100 rounded" /></TableCell>
                            <TableCell><div className="h-4 w-20 bg-slate-100 rounded ml-auto" /></TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    ))
                ) : data?.items?.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-40 text-center text-slate-400 italic">
                            No orders found matching your criteria.
                        </TableCell>
                    </TableRow>
                ) : (
                    data?.items?.map((order) => (
                        <TableRow key={order.id} className="group hover:bg-emerald-50/30 transition-colors">
                            <TableCell className="font-mono text-xs text-slate-500 group-hover:text-emerald-700">
                                {order.sales_order_number}
                            </TableCell>
                                    <TableCell>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-900">{order.customer_info?.name || 'Guest'}</span>
                                        {(!order.customer_info?.address || !order.customer_info?.phone) && (
                                            <div title="Missing Address or Phone" className="text-amber-500 cursor-help">
                                                <AlertOctagon className="h-3 w-3" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-500">{order.customer_info?.phone || 'No phone'}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge 
                                    className={cn(
                                        "font-medium px-2.5 py-0.5 rounded-full border-0 shadow-sm",
                                        order.status === 'DELIVERED' ? "bg-emerald-100 text-emerald-800" : 
                                        order.status === 'CANCELLED' ? "bg-rose-100 text-rose-800" : 
                                        order.status === 'FAILED' ? "bg-amber-100 text-amber-800" : 
                                        "bg-slate-100 text-slate-700"
                                    )}
                                >
                                    {order.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600">
                                <span className="text-sm">WH-{order.warehouse_id}</span>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                        <Truck className="h-3 w-3 text-slate-500" />
                                    </div>
                                    <span className="text-sm text-slate-600">
                                        {order.driver?.user?.full_name || 'Unassigned'}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right pr-8">
                                <span className="font-bold text-slate-900">{order.total_amount.toFixed(3)} KWD</span>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-white shadow-sm border border-transparent hover:border-slate-200">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 shadow-xl">
                                        <DropdownMenuLabel>Order Management</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => navigate(`/orders/${order.id}`)}>View Details</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAssignClick(order.id, order.driver_id)}>Assign Driver</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-rose-600" onClick={() => alert(`Cancelling ID ${order.id}`)}>Cancel Order</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
        </div>
      </div>

      {/* Footer / Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-slate-400">
            Showing {data?.items?.length || 0} of {data?.total || 0} orders
        </p>
        <div className="flex items-center space-x-4">
            <span className="text-xs font-medium text-slate-500">
                Page {page} / {data?.pages || 1}
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
