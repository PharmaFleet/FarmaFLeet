import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { AssignDriverDialog } from '@/components/orders/AssignDriverDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MoreHorizontal, Plus, FileUp, Filter, Truck } from 'lucide-react';
import { OrderStatus } from '@/types';

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

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

  const [selectedOrder, setSelectedOrder] = useState<{ id: number; driverId?: number } | null>(null);

  const handleAssignClick = (orderId: number, driverId?: number) => {
      setSelectedOrder({ id: orderId, driverId });
  };

  return (
    <div className="space-y-6">
      {selectedOrder && (
          <AssignDriverDialog 
            orderId={selectedOrder.id}
            currentDriverId={selectedOrder.driverId}
            open={!!selectedOrder}
            onOpenChange={(open) => !open && setSelectedOrder(null)}
          />
      )}
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-slate-900">Orders</h2>
           <p className="text-slate-500">Manage and track delivery orders.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline">
                <FileUp className="mr-2 h-4 w-4" />
                Import
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Order
            </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
            <Input 
                placeholder="Search orders..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
            />
        </div>
        <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
        </Button>
        {/* Placeholder for more filters */}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                // Skeleton loading state
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-16 bg-slate-100 rounded animate-pulse ml-auto" /></TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                ))
            ) : data?.items?.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No results.
                    </TableCell>
                </TableRow>
            ) : (
                data?.items?.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.sales_order_number}</TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-medium">{order.customer_info?.name || 'Unknown'}</span>
                                <span className="text-xs text-slate-500">{order.customer_info?.phone}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>{order.warehouse?.name || order.warehouse_id}</TableCell>
                        <TableCell>
                            {order.driver ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-1 rounded-full w-fit">
                                    <Truck className="h-3 w-3" />
                                    {order.driver.user?.full_name || `Driver #${order.driver.id}`}
                                </span>
                            ) : (
                                <span className="text-slate-400 italic text-xs">Unassigned</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                            {order.total_amount.toFixed(3)} KWD
                        </TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAssignClick(order.id, order.driver_id)}>
                                        Assign Driver
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">Cancel Order</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
