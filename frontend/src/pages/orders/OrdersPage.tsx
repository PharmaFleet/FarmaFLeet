import { useState, useRef, useCallback } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { warehouseService, type Warehouse } from '@/services/warehouseService';
import { analyticsService } from '@/services/analyticsService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useColumnResize } from '@/hooks/useColumnResize';
import { useColumnOrder, type ColumnDefinition } from '@/hooks/useColumnOrder';
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
import { CancelOrderDialog } from '@/components/orders/CancelOrderDialog';
import { ReturnOrderDialog } from '@/components/orders/ReturnOrderDialog';
import { BatchReturnDialog } from '@/components/orders/BatchReturnDialog';
import { MoreHorizontal, Plus, Download, Truck, Search, AlertOctagon, Users, XCircle, Trash2, ChevronDown, Filter, X, RotateCcw, GripVertical, Clock, Columns, AlertTriangle } from 'lucide-react';
import { OrderStatus } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PAGE_SIZE_OPTIONS = [10, 50, 100, 1000] as const;

export default function OrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
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
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<number | null>(null);
  const [batchReturnOpen, setBatchReturnOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const debouncedFilters = useDebouncedValue(filters, 500);
  const activeFilterCount = Object.values(filters).filter(v => v.trim()).length;

  // Date range quick-select
  type DateRange = 'today' | 'week' | 'month' | 'all';
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    try {
      return (localStorage.getItem('orders-date-range') as DateRange) || 'today';
    } catch { return 'today'; }
  });

  const getDateRangeFilters = useCallback((range: DateRange): Record<string, string> => {
    const now = new Date();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];
    switch (range) {
      case 'today':
        return { date_from: toDateStr(now), date_field: 'created_at' };
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { date_from: toDateStr(weekAgo), date_field: 'created_at' };
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return { date_from: toDateStr(monthAgo), date_field: 'created_at' };
      }
      case 'all':
        return {};
    }
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
    setPage(1);
    try { localStorage.setItem('orders-date-range', range); } catch { /* ignore */ }
    // Clear manual date filters when using quick-select
    setFilters(f => {
      const next = { ...f };
      delete next.date_from;
      delete next.date_to;
      delete next.date_field;
      return next;
    });
  }, []);

  // Cancel stale orders dialog
  const [cancelStaleOpen, setCancelStaleOpen] = useState(false);
  const [cancelStaleLoading, setCancelStaleLoading] = useState(false);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const { widths: colWidths, onMouseDown: onColResize } = useColumnResize();
  const { orderedColumns, reorderColumns, resetColumnOrder, showAllColumns, toggleAllColumns } = useColumnOrder();

  // DnD sensors for column reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderColumns(active.id as string, over.id as string);
    }
  };

  const ResizeHandle = ({ column }: { column: string }) => (
    <div
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-emerald-400 active:bg-emerald-500 z-10"
      onMouseDown={(e) => onColResize(column, e)}
    />
  );

  const SortableHeader = ({ column, children, className, width, resizeColumn }: {
    column: string; children: React.ReactNode; className?: string;
    width?: number; resizeColumn?: string;
  }) => (
    <TableHead
      className={cn("cursor-pointer select-none hover:bg-muted/80 transition-colors relative", className)}
      onClick={() => handleSort(column)}
      style={width ? { width: `${width}px` } : undefined}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === column && <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
      </div>
      {resizeColumn && <ResizeHandle column={resizeColumn} />}
    </TableHead>
  );

  // Sortable/Draggable table header component
  const SortableTableHead = ({ columnDef }: { columnDef: ColumnDefinition }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: columnDef.id });

    const style: React.CSSProperties = {
      transform: isDragging ? CSS.Transform.toString(transform) : undefined,
      transition: isDragging ? transition : undefined,
      width: `${colWidths[columnDef.resizeKey || columnDef.id]}px`,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 20 : undefined,
      backgroundColor: 'hsl(var(--muted))',
    };

    const handleClick = () => {
      if (columnDef.sortable && columnDef.sortKey) {
        handleSort(columnDef.sortKey);
      }
    };

    // Background styles for all header cells (sticky is now on TableHeader)
    const stickyClass = "bg-muted";

    // Special handling for checkbox column (not draggable)
    if (columnDef.id === 'checkbox') {
      return (
        <TableHead className={cn("relative", stickyClass)} style={{ width: `${colWidths.checkbox}px`, backgroundColor: 'hsl(var(--muted))' }}>
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all orders"
          />
        </TableHead>
      );
    }

    // Special handling for actions column (not draggable)
    if (columnDef.id === 'actions') {
      return (
        <TableHead className={stickyClass} style={{ width: `${colWidths.actions}px`, backgroundColor: 'hsl(var(--muted))' }}></TableHead>
      );
    }

    return (
      <TableHead
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative",
          stickyClass,
          columnDef.sortable && "cursor-pointer select-none hover:bg-muted/80 transition-colors",
          columnDef.className
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-1">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab hover:text-emerald-600 active:cursor-grabbing p-0.5 -ml-1"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/60" />
          </span>
          {columnDef.label}
          {columnDef.sortable && columnDef.sortKey && sortBy === columnDef.sortKey && (
            <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
          )}
        </div>
        {columnDef.resizeKey && <ResizeHandle column={columnDef.resizeKey} />}
      </TableHead>
    );
  };

  // Render cell content based on column id
  const renderCell = (order: any, columnId: string) => {
    switch (columnId) {
      case 'checkbox':
        return (
          <Checkbox
            checked={selectedOrders.has(order.id)}
            onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
            aria-label={`Select order ${order.sales_order_number}`}
          />
        );
      case 'order_number':
        return (
          <span className="font-mono text-xs text-muted-foreground group-hover:text-emerald-700">
            {order.sales_order_number}
          </span>
        );
      case 'customer':
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{order.customer_info?.name || 'Guest'}</span>
              {(!order.customer_info?.address || !order.customer_info?.phone) && (
                <div title="Missing Address or Phone" className="text-amber-500 cursor-help">
                  <AlertOctagon className="h-3 w-3" />
                </div>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">{order.customer_info?.phone || 'No phone'}</span>
          </div>
        );
      case 'address':
        return (
          <div
            className="text-sm text-muted-foreground truncate"
            title={order.customer_info?.address || 'No address'}
          >
            {order.customer_info?.address || <span className="text-muted-foreground/60 italic">No address</span>}
          </div>
        );
      case 'status':
        return (
          <Badge
            className={cn(
              "font-medium px-2.5 py-0.5 rounded-full border-0 shadow-sm",
              order.status === OrderStatus.DELIVERED ? "bg-emerald-100 text-emerald-800" :
              order.status === OrderStatus.CANCELLED ? "bg-rose-100 text-rose-800" :
              order.status === OrderStatus.RETURNED ? "bg-orange-100 text-orange-800" :
              order.status === OrderStatus.FAILED || order.status === OrderStatus.REJECTED ? "bg-amber-100 text-amber-800" :
              "bg-muted text-muted-foreground"
            )}
          >
            {order.status}
          </Badge>
        );
      case 'warehouse':
        return (
          <span className="text-sm text-muted-foreground">{order.warehouse?.code || `WH-${order.warehouse_id}`}</span>
        );
      case 'driver':
        return (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border border-border">
              <Truck className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">
              {order.driver?.user?.full_name || 'Unassigned'}
            </span>
          </div>
        );
      case 'driver_mobile':
        return (
          <span className="text-sm text-muted-foreground font-mono">
            {order.driver?.user?.phone || '-'}
          </span>
        );
      case 'driver_code':
        return (
          <span className="text-sm text-muted-foreground font-mono">
            {order.driver?.code || '-'}
          </span>
        );
      case 'payment':
        return (
          <span className="text-sm text-muted-foreground">
            {order.payment_method || '-'}
          </span>
        );
      case 'sales_taker':
        return (
          <span className="text-sm text-muted-foreground">
            {order.sales_taker || '-'}
          </span>
        );
      case 'amount':
        return (
          <span className="font-bold text-foreground">{order.total_amount.toFixed(3)} KWD</span>
        );
      case 'created':
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {order.created_at ? format(new Date(order.created_at), 'dd/MM HH:mm') : '-'}
          </span>
        );
      case 'assigned':
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {order.assigned_at ? format(new Date(order.assigned_at), 'dd/MM HH:mm') : '-'}
          </span>
        );
      case 'picked_up':
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {order.picked_up_at ? format(new Date(order.picked_up_at), 'dd/MM HH:mm') : '-'}
          </span>
        );
      case 'delivered':
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {order.delivered_at ? format(new Date(order.delivered_at), 'dd/MM HH:mm') : '-'}
          </span>
        );
      case 'delivery_time':
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
            {(() => {
              if (!order.picked_up_at || !order.delivered_at) return '-';
              const diffMs = new Date(order.delivered_at).getTime() - new Date(order.picked_up_at).getTime();
              if (diffMs < 0) return '-';
              const h = Math.floor(diffMs / 3600000);
              const m = Math.floor((diffMs % 3600000) / 60000);
              return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            })()}
          </span>
        );
      case 'actions':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-muted shadow-sm border border-transparent hover:border-border">
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
              <DropdownMenuItem
                className="text-orange-600"
                onClick={() => handleReturnOrder(order.id)}
                disabled={order.status !== OrderStatus.DELIVERED}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Return Order
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
        );
      default:
        return null;
    }
  };

  // Merge date range quick-select with manual filters (manual overrides quick-select)
  const effectiveDateFilters = filters.date_from || filters.date_to
    ? {} // Manual date filters take precedence, they're already in debouncedFilters
    : getDateRangeFilters(dateRange);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, pageSize, debouncedSearch, statusFilter, showArchived, sortBy, sortOrder, debouncedFilters, dateRange],
    queryFn: () => orderService.getAll({
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        include_archived: showArchived,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...effectiveDateFilters,
        ...Object.fromEntries(
            Object.entries(debouncedFilters).filter(([_, v]) => v.trim())
        ),
    }),
    placeholderData: keepPreviousData,
  });

  // Fetch warehouses for filter dropdown
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: warehouseService.getAll,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Mutations with Optimistic Updates
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => orderService.cancelOrder(id, reason),
    // Optimistic update: immediately show cancelled status
    onMutate: async ({ id }: { id: number; reason?: string }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['orders'] });

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData(['orders', page, pageSize, debouncedSearch, statusFilter, showArchived, sortBy, sortOrder, debouncedFilters]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        ['orders', page, pageSize, debouncedSearch, statusFilter, showArchived, sortBy, sortOrder, debouncedFilters],
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
          ['orders', page, pageSize, debouncedSearch, statusFilter, showArchived, sortBy, sortOrder, debouncedFilters],
          context.previousOrders
        );
      }
      const errMsg = (_err as any)?.response?.data?.detail || "Failed to cancel order";
      toast({ title: errMsg, variant: "destructive" });
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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      const created = data?.created ?? 0;
      const errors = data?.errors ?? [];
      if (created > 0 && errors.length === 0) {
        toast({
          title: `${created} orders imported successfully`,
          description: "Showing today's orders. Use date filter to view more.",
        });
        // Switch to today's view to see the new orders
        handleDateRangeChange('today');
        setStatusFilter('ALL');
      } else if (created > 0 && errors.length > 0) {
        toast({ title: `${created} orders imported`, description: `${errors.length} rows had errors. Showing today's orders.`, variant: "default" });
        handleDateRangeChange('today');
      } else if (created === 0 && errors.length > 0) {
        const sample = errors.slice(0, 3).map((e: any) => `Row ${e.row}: ${e.error}`).join('; ');
        toast({ title: "No orders imported", description: `${errors.length} errors. ${sample}`, variant: "destructive" });
      } else {
        toast({ title: "No orders imported", description: "File was empty or all orders already exist", variant: "destructive" });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail || "Could not import orders. Check file format.";
      toast({ title: "Import failed", description: detail, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  // Handlers
  const handleCancelStale = async () => {
    setCancelStaleLoading(true);
    try {
      const result = await analyticsService.batchCancelStale(7);
      toast({ title: `${result.cancelled} stale orders cancelled`, description: result.message });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCancelStaleOpen(false);
    } catch (error: any) {
      toast({ title: "Failed to cancel stale orders", description: error?.response?.data?.detail || "Unknown error", variant: "destructive" });
    } finally {
      setCancelStaleLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      importMutation.mutate(e.target.files[0]);
    }
  };

  const handleCancelOrder = (id: number) => {
    setCancelOrderId(id);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = (id: number, reason?: string) => {
    cancelMutation.mutate({ id, reason }, {
      onSuccess: () => {
        setCancelDialogOpen(false);
        setCancelOrderId(null);
      },
    });
  };

  const returnMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => orderService.returnOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setReturnDialogOpen(false);
      setReturnOrderId(null);
      toast({ title: "Order marked as returned" });
    },
    onError: (_err) => {
      const errMsg = (_err as any)?.response?.data?.detail || "Failed to return order";
      toast({ title: errMsg, variant: "destructive" });
    },
  });

  const handleReturnOrder = (id: number) => {
    setReturnOrderId(id);
    setReturnDialogOpen(true);
  };

  const handleReturnConfirm = (id: number, reason: string) => {
    returnMutation.mutate({ id, reason });
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
    { value: OrderStatus.PICKED_UP, label: 'Picked Up' },
    { value: OrderStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery' },
    { value: OrderStatus.DELIVERED, label: 'Delivered' },
    { value: OrderStatus.RETURNED, label: 'Returned' },
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

      <CancelOrderDialog
        orderId={cancelOrderId}
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) setCancelOrderId(null);
        }}
        onConfirm={handleCancelConfirm}
        isPending={cancelMutation.isPending}
      />

      <ReturnOrderDialog
        orderId={returnOrderId}
        open={returnDialogOpen}
        onOpenChange={(open) => {
          setReturnDialogOpen(open);
          if (!open) setReturnOrderId(null);
        }}
        onConfirm={handleReturnConfirm}
        isPending={returnMutation.isPending}
      />

      <BatchReturnDialog
        orderIds={Array.from(selectedOrders)}
        open={batchReturnOpen}
        onOpenChange={setBatchReturnOpen}
        onSuccess={() => setSelectedOrders(new Set())}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
           <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Orders</h2>
           <p className="text-muted-foreground mt-1">Manage and track your delivery operations in real-time.</p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" className="shadow-sm border-border" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
                <Download className="mr-2 h-4 w-4 text-emerald-600" />
                {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
            <Button variant="outline" className="shadow-sm border-border" onClick={() => orderService.exportOrders({
              status: statusFilter === 'ALL' ? undefined : statusFilter,
              search: debouncedSearch || undefined,
              include_archived: showArchived,
              sort_by: sortBy,
              sort_order: sortOrder,
              ...Object.fromEntries(
                Object.entries(debouncedFilters).filter(([_, v]) => v.trim())
              ),
            })}>
                <Download className="mr-2 h-4 w-4 text-blue-600" />
                Export
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
            <Button
              size="sm"
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400"
              onClick={() => setBatchReturnOpen(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Return
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
      <div className="border-b border-border">
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
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm transition-all duration-300 flex flex-col max-h-[calc(100vh-280px)] overflow-clip">
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-muted/50 p-6 border-b border-border shrink-0">
            <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search orders, customers, phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 border-border focus:ring-emerald-500/20"
                />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "transition-all",
                showFilters
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "border-border hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
              )}
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1.5 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-white text-blue-600">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                "transition-all",
                showArchived
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "border-border hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
              )}
            >
              {showArchived ? "📦 Showing Archived" : "📦 View Archive"}
            </Button>
            <Button
              variant={showAllColumns ? "default" : "outline"}
              size="sm"
              onClick={toggleAllColumns}
              className={cn(
                "transition-all",
                showAllColumns
                  ? "bg-violet-500 hover:bg-violet-600 text-white"
                  : "border-border hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950"
              )}
            >
              <Columns className="mr-1.5 h-3.5 w-3.5" />
              {showAllColumns ? "Essential Columns" : "All Columns"}
            </Button>
            {(dateRange === 'all' || dateRange === 'month') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelStaleOpen(true)}
                className="border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-400"
              >
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                Cancel Stale
              </Button>
            )}
        </div>

        {/* Date Range Quick-Select */}
        <div className="flex items-center gap-1 px-6 py-2 bg-muted/30 border-b border-border shrink-0">
          <Clock className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          <span className="text-xs text-muted-foreground mr-2">Show:</span>
          {([
            { key: 'today' as DateRange, label: 'Today' },
            { key: 'week' as DateRange, label: 'This Week' },
            { key: 'month' as DateRange, label: 'This Month' },
            { key: 'all' as DateRange, label: 'All Time' },
          ]).map(({ key, label }) => (
            <Button
              key={key}
              variant={dateRange === key ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-3 text-xs",
                dateRange === key
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handleDateRangeChange(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
            <div className="border-t border-border bg-muted/30 p-6 space-y-4 shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Customer Name</label>
                        <Input
                            placeholder="Filter by name..."
                            value={filters.customer_name || ''}
                            onChange={(e) => setFilters(f => ({ ...f, customer_name: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Customer Phone</label>
                        <Input
                            placeholder="Filter by phone..."
                            value={filters.customer_phone || ''}
                            onChange={(e) => setFilters(f => ({ ...f, customer_phone: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Address</label>
                        <Input
                            placeholder="Filter by address..."
                            value={filters.customer_address || ''}
                            onChange={(e) => setFilters(f => ({ ...f, customer_address: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Order Number</label>
                        <Input
                            placeholder="Filter by SO#..."
                            value={filters.order_number || ''}
                            onChange={(e) => setFilters(f => ({ ...f, order_number: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Driver Name</label>
                        <Input
                            placeholder="Filter by driver..."
                            value={filters.driver_name || ''}
                            onChange={(e) => setFilters(f => ({ ...f, driver_name: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Driver Code</label>
                        <Input
                            placeholder="Filter by code..."
                            value={filters.driver_code || ''}
                            onChange={(e) => setFilters(f => ({ ...f, driver_code: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Sales Taker</label>
                        <Input
                            placeholder="Filter by sales taker..."
                            value={filters.sales_taker || ''}
                            onChange={(e) => setFilters(f => ({ ...f, sales_taker: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Payment Method</label>
                        <Input
                            placeholder="Filter by payment..."
                            value={filters.payment_method || ''}
                            onChange={(e) => setFilters(f => ({ ...f, payment_method: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Warehouse</label>
                        <select
                            value={filters.warehouse_id || ''}
                            onChange={(e) => setFilters(f => ({ ...f, warehouse_id: e.target.value }))}
                            className="h-8 text-sm w-full rounded-md border border-input bg-background px-3 py-1"
                        >
                            <option value="">All Warehouses</option>
                            {warehouses.map((wh) => (
                                <option key={wh.id} value={wh.id.toString()}>
                                    {wh.code} - {wh.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Date From</label>
                        <Input
                            type="date"
                            value={filters.date_from || ''}
                            onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Date To</label>
                        <Input
                            type="date"
                            value={filters.date_to || ''}
                            onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Date Column</label>
                        <select
                            value={filters.date_field || 'created_at'}
                            onChange={(e) => setFilters(f => ({ ...f, date_field: e.target.value }))}
                            className="h-8 text-sm w-full rounded-md border border-input bg-background px-3 py-1"
                        >
                            <option value="created_at">Created At</option>
                            <option value="assigned_at">Assigned At</option>
                            <option value="picked_up_at">Picked Up At</option>
                            <option value="delivered_at">Delivered At</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setFilters({});
                                setPage(1);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="mr-1 h-3 w-3" />
                            Clear All Filters
                        </Button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-auto min-h-0 relative isolate">
            <Table style={{ tableLayout: 'fixed' }} noWrapper>
              <TableHeader className="sticky top-0 z-20 bg-muted shadow-[0_1px_0_0_hsl(var(--border))]">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={orderedColumns.map(c => c.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <TableRow className="border-b bg-muted [&:hover]:bg-muted">
                      {orderedColumns.map((columnDef) => (
                        <SortableTableHead key={columnDef.id} columnDef={columnDef} />
                      ))}
                    </TableRow>
                  </SortableContext>
                </DndContext>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                            {orderedColumns.map((col) => (
                              <TableCell key={col.id}><div className="h-4 w-16 bg-muted rounded" /></TableCell>
                            ))}
                        </TableRow>
                    ))
                ) : data?.items?.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={orderedColumns.length} className="h-40 text-center text-muted-foreground italic">
                            No orders found matching your criteria.
                        </TableCell>
                    </TableRow>
                ) : (
                    data?.items?.map((order) => (
                        <TableRow key={order.id} className={cn(
                          "group hover:bg-emerald-50/30 transition-colors",
                          selectedOrders.has(order.id) && "bg-emerald-50/50"
                        )}>
                            {orderedColumns.map((col) => (
                              <TableCell
                                key={col.id}
                                className={col.id === 'amount' ? 'text-right pr-8' : undefined}
                              >
                                {renderCell(order, col.id)}
                              </TableCell>
                            ))}
                        </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-muted-foreground">
            Showing {data?.items?.length || 0} of {data?.total || 0} orders
        </p>
        <div className="flex items-center space-x-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-20 justify-between">
                    {pageSize}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-20">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <DropdownMenuItem
                      key={size}
                      onClick={() => {
                        setPageSize(size);
                        setPage(1);
                      }}
                      className={cn(pageSize === size && "bg-muted font-medium")}
                    >
                      {size}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
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

      {/* Cancel Stale Orders Confirmation Dialog */}
      {cancelStaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Cancel Stale Orders</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will cancel all <strong>pending</strong> orders that are older than 7 days.
              Assigned orders with active drivers will not be affected.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCancelStaleOpen(false)} disabled={cancelStaleLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelStale}
                disabled={cancelStaleLoading}
              >
                {cancelStaleLoading ? 'Cancelling...' : 'Yes, Cancel Stale Orders'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
