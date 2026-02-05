import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin, Phone, User, Truck, UserPlus, XCircle, Archive, ArchiveRestore, Clock, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { OrderStatus } from '@/types';
import { AssignDriverDialog } from '@/components/orders/AssignDriverDialog';
import { CancelOrderDialog } from '@/components/orders/CancelOrderDialog';
import { ReturnOrderDialog } from '@/components/orders/ReturnOrderDialog';
import { useToast } from '@/components/ui/use-toast';

export default function OrderDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const orderId = Number(id);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);

    const { data: order, isLoading, error } = useQuery({
        queryKey: ['order', orderId],
        queryFn: () => orderService.getById(orderId),
        enabled: !!orderId
    });

    const archiveMutation = useMutation({
        mutationFn: () => orderService.archiveOrder(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', orderId] });
            toast({ title: "Order archived" });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Failed to archive order" });
        },
    });

    const unarchiveMutation = useMutation({
        mutationFn: () => orderService.unarchiveOrder(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', orderId] });
            toast({ title: "Order restored from archive" });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Failed to unarchive order" });
        },
    });

    const cancelMutation = useMutation({
        mutationFn: (reason: string) => orderService.cancelOrder(orderId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', orderId] });
            setCancelDialogOpen(false);
            toast({ title: "Order cancelled" });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Failed to cancel order" });
        },
    });

    const returnMutation = useMutation({
        mutationFn: (reason: string) => orderService.returnOrder(orderId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', orderId] });
            setReturnDialogOpen(false);
            toast({ title: "Order marked as returned" });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Failed to return order" });
        },
    });

    if (isLoading) return <div className="p-8">Loading order details...</div>;
    if (error || !order) return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-rose-600">Error loading order</h2>
            <Button variant="outline" onClick={() => navigate('/orders')} className="mt-4">
                Back to Orders
            </Button>
        </div>
    );

    const isTerminal = order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED || order.status === OrderStatus.RETURNED;

    return (
        <div className="space-y-6 p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                            Order {order.sales_order_number}
                            <Badge className={cn(
                                "text-sm px-2.5 py-0.5 rounded-full border-0",
                                order.status === OrderStatus.DELIVERED ? "bg-emerald-100 text-emerald-800" :
                                order.status === OrderStatus.CANCELLED ? "bg-rose-100 text-rose-800" :
                                order.status === OrderStatus.ASSIGNED ? "bg-blue-100 text-blue-800" :
                                order.status === OrderStatus.PICKED_UP ? "bg-violet-100 text-violet-800" :
                                order.status === OrderStatus.IN_TRANSIT ? "bg-amber-100 text-amber-800" :
                                order.status === OrderStatus.OUT_FOR_DELIVERY ? "bg-orange-100 text-orange-800" :
                                order.status === OrderStatus.RETURNED ? "bg-orange-100 text-orange-800" :
                                "bg-muted text-muted-foreground"
                            )}>{order.status}</Badge>
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Created on {order.created_at ? format(new Date(order.created_at), 'PPP p') : 'Unknown date'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isTerminal && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAssignDialogOpen(true)}
                            className="gap-1.5"
                        >
                            <UserPlus className="h-4 w-4" />
                            {order.driver_id ? 'Reassign' : 'Assign'}
                        </Button>
                    )}
                    {!isTerminal && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelDialogOpen(true)}
                            className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                            <XCircle className="h-4 w-4" />
                            Cancel
                        </Button>
                    )}
                    {order.status === OrderStatus.DELIVERED && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReturnDialogOpen(true)}
                            className="gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Return
                        </Button>
                    )}
                    {order.is_archived ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unarchiveMutation.mutate()}
                            disabled={unarchiveMutation.isPending}
                            className="gap-1.5"
                        >
                            <ArchiveRestore className="h-4 w-4" />
                            Unarchive
                        </Button>
                    ) : isTerminal ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => archiveMutation.mutate()}
                            disabled={archiveMutation.isPending}
                            className="gap-1.5"
                        >
                            <Archive className="h-4 w-4" />
                            Archive
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Customer Info */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <User className="h-4 w-4 text-emerald-600" />
                            Customer Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase font-semibold">Name</label>
                                <p className="text-foreground font-medium">{order.customer_info?.name || 'Guest'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase font-semibold">Phone</label>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-muted-foreground/70" />
                                    <p className="text-foreground font-mono">{order.customer_info?.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-muted-foreground uppercase font-semibold">Address</label>
                                <div className="flex items-start gap-2 mt-1">
                                    <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                    <p className="text-foreground">
                                        {order.customer_info?.address || 'No address provided'}
                                        {order.customer_info?.area && <span className="text-muted-foreground block text-sm">{order.customer_info.area}</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {order.notes && (
                            <div className="pt-3 border-t border-border">
                                <label className="text-xs text-muted-foreground uppercase font-semibold">Notes</label>
                                <p className="text-foreground text-sm mt-1">{order.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Status & Driver */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Truck className="h-4 w-4 text-emerald-600" />
                            Delivery Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div>
                            <label className="text-xs text-muted-foreground uppercase font-semibold">Driver</label>
                            <p className="text-foreground font-medium">{order.driver?.user?.full_name || 'Unassigned'}</p>
                            {order.driver?.user?.phone && (
                                <p className="text-muted-foreground text-sm font-mono">{order.driver.user.phone}</p>
                            )}
                         </div>
                         <div>
                            <label className="text-xs text-muted-foreground uppercase font-semibold">Warehouse</label>
                            <p className="text-foreground">{order.warehouse?.code || `WH-${order.warehouse_id}`}</p>
                         </div>
                         <div className="space-y-2 text-sm">
                            {order.assigned_at && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Assigned</span>
                                    <span className="text-foreground">{format(new Date(order.assigned_at), 'MMM d, HH:mm')}</span>
                                </div>
                            )}
                            {order.picked_up_at && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Picked Up</span>
                                    <span className="text-foreground">{format(new Date(order.picked_up_at), 'MMM d, HH:mm')}</span>
                                </div>
                            )}
                            {order.delivered_at && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Delivered</span>
                                    <span className="text-foreground">{format(new Date(order.delivered_at), 'MMM d, HH:mm')}</span>
                                </div>
                            )}
                            {order.picked_up_at && order.delivered_at && (() => {
                                const diffMs = new Date(order.delivered_at).getTime() - new Date(order.picked_up_at).getTime();
                                if (diffMs <= 0) return null;
                                const h = Math.floor(diffMs / 3600000);
                                const m = Math.floor((diffMs % 3600000) / 60000);
                                return (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Delivery Time</span>
                                        <span className="text-foreground font-mono">{`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`}</span>
                                    </div>
                                );
                            })()}
                         </div>
                         <div className="pt-4 border-t border-border">
                             <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                                 <span className="text-sm text-muted-foreground font-medium">Total Amount</span>
                                 <span className="text-lg font-bold text-foreground">{order.total_amount?.toFixed(3)} KWD</span>
                             </div>
                             <div className="flex justify-between items-center mt-2 px-3">
                                 <span className="text-xs text-muted-foreground">Payment</span>
                                 <span className="text-sm text-foreground">{order.payment_method || 'CASH'}</span>
                             </div>
                             {order.sales_taker && (
                                 <div className="flex justify-between items-center mt-2 px-3">
                                     <span className="text-xs text-muted-foreground">Sales Taker</span>
                                     <span className="text-sm text-foreground">{order.sales_taker}</span>
                                 </div>
                             )}
                         </div>
                    </CardContent>
                </Card>
            </div>

            {/* Status Timeline */}
            {order.status_history && order.status_history.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="h-4 w-4 text-emerald-600" />
                            Status Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            {[...order.status_history]
                                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                .map((entry: any, idx: number, arr: any[]) => (
                                <div key={entry.id || idx} className="flex gap-4 pb-4 last:pb-0">
                                    <div className="flex flex-col items-center">
                                        <div className={cn(
                                            "w-3 h-3 rounded-full shrink-0",
                                            idx === 0 ? "bg-emerald-500" : "bg-muted-foreground/30"
                                        )} />
                                        {idx < arr.length - 1 && (
                                            <div className="w-px h-full bg-border min-h-[24px]" />
                                        )}
                                    </div>
                                    <div className="pb-2">
                                        <p className="text-sm font-medium text-foreground">{entry.status}</p>
                                        {entry.notes && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                                            {entry.timestamp ? format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm:ss') : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Proof of Delivery */}
            {order.proof_of_delivery && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Proof of Delivery</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                {order.proof_of_delivery.photo_url && (
                                    <a href={order.proof_of_delivery.photo_url} target="_blank" rel="noopener noreferrer">
                                        <img
                                            src={order.proof_of_delivery.photo_url}
                                            alt="Delivery photo"
                                            className="rounded-lg border border-border object-cover w-full h-40"
                                        />
                                    </a>
                                )}
                                {order.proof_of_delivery.signature_url && (
                                    <a href={order.proof_of_delivery.signature_url} target="_blank" rel="noopener noreferrer">
                                        <img
                                            src={order.proof_of_delivery.signature_url}
                                            alt="Signature"
                                            className="rounded-lg border border-border bg-white object-contain w-full h-24"
                                        />
                                    </a>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {order.proof_of_delivery.timestamp ? format(new Date(order.proof_of_delivery.timestamp), 'MMM d, HH:mm') : ''}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dialogs */}
            <AssignDriverDialog
                orderId={orderId}
                currentDriverId={order.driver?.id}
                open={assignDialogOpen}
                onOpenChange={setAssignDialogOpen}
            />
            <CancelOrderDialog
                orderId={orderId}
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
                onConfirm={(_id, reason) => cancelMutation.mutate(reason || '')}
                isPending={cancelMutation.isPending}
            />
            <ReturnOrderDialog
                orderId={orderId}
                open={returnDialogOpen}
                onOpenChange={setReturnDialogOpen}
                onConfirm={(_id, reason) => returnMutation.mutate(reason)}
                isPending={returnMutation.isPending}
            />
        </div>
    );
}
