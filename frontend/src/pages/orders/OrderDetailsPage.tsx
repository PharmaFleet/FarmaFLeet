import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin, Phone, User, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils'; // Assuming utils exists

export default function OrderDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const orderId = Number(id);

    const { data: order, isLoading, error } = useQuery({
        queryKey: ['order', orderId],
        queryFn: () => orderService.getById(orderId),
        enabled: !!orderId
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

    return (
        <div className="space-y-6 p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            Order {order.sales_order_number}
                            <Badge className={cn(
                                "text-sm px-2.5 py-0.5 rounded-full border-0",
                                order.status === 'DELIVERED' ? "bg-emerald-100 text-emerald-800" : 
                                order.status === 'CANCELLED' ? "bg-rose-100 text-rose-800" : 
                                order.status === 'ASSIGNED' ? "bg-blue-100 text-blue-800" :
                                "bg-slate-100 text-slate-700"
                            )}>{order.status}</Badge>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Created on {order.created_at ? format(new Date(order.created_at), 'PPP p') : 'Unknown date'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Actions can go here e.g. Assign, Cancel */}
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
                                <label className="text-xs text-slate-500 uppercase font-semibold">Name</label>
                                <p className="text-slate-900 font-medium">{order.customer_info?.name || 'Guest'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-semibold">Phone</label>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    <p className="text-slate-900 font-mono">{order.customer_info?.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-slate-500 uppercase font-semibold">Address</label>
                                <div className="flex items-start gap-2 mt-1">
                                    <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                    <p className="text-slate-900">
                                        {order.customer_info?.address || 'No address provided'}
                                        {order.customer_info?.area && <span className="text-slate-500 block text-sm">{order.customer_info.area}</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
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
                            <label className="text-xs text-slate-500 uppercase font-semibold">Driver</label>
                            <p className="text-slate-900 font-medium">{order.driver?.user?.full_name || 'Unassigned'}</p>
                         </div>
                         <div>
                            <label className="text-xs text-slate-500 uppercase font-semibold">Warehouse</label>
                            <p className="text-slate-900">WH-{order.warehouse_id}</p>
                         </div>
                         <div className="pt-4 border-t border-slate-100">
                             <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                                 <span className="text-sm text-slate-600 font-medium">Total Amount</span>
                                 <span className="text-lg font-bold text-slate-900">{order.total_amount?.toFixed(3)} KWD</span>
                             </div>
                         </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
