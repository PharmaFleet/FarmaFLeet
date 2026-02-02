import { useState, useRef } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { BatchAssignDriverDialog } from '@/components/orders/BatchAssignDriverDialog';
import { BatchCancelDialog } from '@/components/orders/BatchCancelDialog';
import { BatchDeleteDialog } from '@/components/orders/BatchDeleteDialog';
import { MoreHorizontal, Plus, Download, Truck, Search, AlertOctagon, Users, XCircle, Trash2 } from 'lucide-react';
import { OrderStatus } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; driverId?: number } | null>(null);
  
  // Multi-select state
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [batchAssignOpen, setBatchAssignOpen] = useState(false);
  const [batchCancelOpen, setBatchCancelOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, search, statusFilter, showArchived],
    queryFn: () => orderService.getAll({ 
        page, 
        limit: 10,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        include_archived: showArchived
    }),
    placeholderData: keepPreviousData,
  });

  // Mutations with Optimistic Updates
  const cancelMutation = useMutation({
    mutationFn: (id: number) => orderService.cancelOrder(id),
    // Optimistic update: immediately show cancelled status
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      
      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData(['orders', page, search, statusFilter, showArchived]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(
        ['orders', page, search, statusFilter, showArchived],
        (old: { items: Array<{ id: number; status: string }>; total: number; pages: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map(order => 
              order.id === id ? { ...order, status: OrderStatus.CANCELLED } : order
            ),
          };
        }
      );
      
      // Return context with the snapshot
      return { previousOrders };
    },
    onSuccess: () => {
      toast({ title: "Order cancelled successfully" });
    },
    onError: (_err, _id, context) => {
      // Roll back on error
      if (context?.previousOrders) {
        queryClient.setQueryData(
          ['orders', page, search, statusFilter, showArchived],
          context.previousOrders
        );
      }
      toast({ title: "Failed to cancel order", variant: "destructive" });
    },
    onSettled: () => {
      // Refetch to ensure server state is synced
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => orderService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: "Order deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete order", variant: "destructive" });
    }
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => orderService.importExcel(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: "Orders imported successfully" });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: () => {
      toast({ title: "Import failed", description: "Could not import orders.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      importMutation.mutate(e.target.files[0]);
    }
  };

  const handleCancelOrder = (id: number) => {
    if (confirm("Are you sure you want to cancel this order?")) {
      cancelMutation.mutate(id);
    }
  };

  const handleDeleteOrder = (id: number) => {
    if (confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAssignClick = (orderId: number, currentDriverId?: number) => {
    setSelectedOrder({ id: orderId, driverId: currentDriverId });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.items) {
      const allIds = new Set(data.items.map(o => o.id));
      setSelectedOrders(allIds);
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedOrders(newSelected);
  };

  const tabs = [
    { value: 'ALL', label: 'All Orders' },
    { value: OrderStatus.PENDING, label: 'Unassigned / Pending' },
    { value: OrderStatus.ASSIGNED, label: 'Assigned' },
    { value: OrderStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery' },
    { value: OrderStatus.DELIVERED, label: 'Delivered' },
    { value: OrderStatus.CANCELLED, label: 'Cancelled' },
  ];

  const isAllSelected = data?.items?.length ? data.items.every(o => selectedOrders.has(o.id)) : false;
  const isSomeSelected = selectedOrders.size > 0;

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

      <BatchAssignDriverDialog
        orderIds={Array.from(selectedOrders)}
        open={batchAssignOpen}
        onOpenChange={setBatchAssignOpen}
        onSuccess={() => setSelectedOrders(new Set())}
      />

      <BatchCancelDialog
        orderIds={Array.from(selectedOrders)}
        open={batchCancelOpen}
        onOpenChange={setBatchCancelOpen}
        onSuccess={() => setSelectedOrders(new Set())}
      />

      <BatchDeleteDialog
        orderIds={Array.from(selectedOrders)}
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        onSuccess={() => setSelectedOrders(new Set())}
      />

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

      {isSomeSelected && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">{selectedOrders.size} order(s) selected</p>
              <p className="text-sm text-emerald-700">Select a driver to assign all at once</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedOrders(new Set())}>
              Clear Selection
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
              onClick={() => setBatchCancelOpen(true)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400"
                onClick={() => setBatchDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setBatchAssignOpen(true)}
            >
              <Users className="mr-2 h-4 w-4" />
              Assign Selected ({selectedOrders.size})
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                  setStatusFilter(tab.value as OrderStatus | 'ALL');
                  setPage(1);
              }}
              className={cn(
                statusFilter === tab.value
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
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
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                "transition-all",
                showArchived 
                  ? "bg-amber-500 hover:bg-amber-600 text-white" 
                  : "border-slate-200 hover:border-amber-300 hover:bg-amber-50"
              )}
            >
              {showArchived ? "📦 Showing Archived" : "📦 View Archive"}
            </Button>
        </div>

        <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all orders"
                    />
                  </TableHead>
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
                            <TableCell><div className="h-4 w-4 bg-slate-100 rounded" /></TableCell>
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
                        <TableCell colSpan={8} className="h-40 text-center text-slate-400 italic">
                            No orders found matching your criteria.
                        </TableCell>
                    </TableRow>
                ) : (
                    data?.items?.map((order) => (
                        <TableRow key={order.id} className={cn(
                          "group hover:bg-emerald-50/30 transition-colors",
                          selectedOrders.has(order.id) && "bg-emerald-50/50"
                        )}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedOrders.has(order.id)}
                                onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                                aria-label={`Select order ${order.sales_order_number}`}
                              />
                            </TableCell>
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
                                        order.status === OrderStatus.DELIVERED ? "bg-emerald-100 text-emerald-800" : 
                                        order.status === OrderStatus.CANCELLED ? "bg-rose-100 text-rose-800" : 
                                        order.status === OrderStatus.FAILED || order.status === OrderStatus.REJECTED ? "bg-amber-100 text-amber-800" : 
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
                                    <DropdownMenuContent align="end" className="w-52 shadow-xl">
                                        <DropdownMenuLabel>Order Management</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => navigate(`/orders/${order.id}`)}>View Details</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAssignClick(order.id, order.driver_id)}>Assign Driver</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-amber-600" 
                                          onClick={() => handleCancelOrder(order.id)}
                                          disabled={order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED}
                                        >
                                          <XCircle className="mr-2 h-4 w-4" />
                                          Cancel Order
                                        </DropdownMenuItem>
                                        {isAdmin && (
                                          <DropdownMenuItem 
                                            className="text-rose-600 focus:text-rose-700 focus:bg-rose-50" 
                                            onClick={() => handleDeleteOrder(order.id)}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Permanently
                                          </DropdownMenuItem>
                                        )}
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
