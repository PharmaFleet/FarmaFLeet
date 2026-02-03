import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
import { orderService } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Phone, Mail, Truck, MapPin, Calendar, CircleUser, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { EditDriverDialog } from '@/components/drivers/EditDriverDialog';

export default function DriverDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const driverId = Number(id);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const { data: driver, isLoading: isLoadingDriver } = useQuery({
        queryKey: ['driver', driverId],
        queryFn: () => driverService.getById(driverId),
        enabled: !!driverId
    });

    const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
        queryKey: ['orders', 'driver', driverId],
        queryFn: () => orderService.getAll({ driver_id: driverId, limit: 5 }),
        enabled: !!driverId
    });

    if (isLoadingDriver) return <div className="p-8">Loading driver profile...</div>;
    if (!driver) return <div className="p-8">Driver not found</div>;

    return (
        <div className="space-y-6 p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/drivers')}>
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                            {driver.user?.full_name}
                            <Badge className={driver.is_available ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-muted-foreground"}>
                                {driver.is_available ? "Available" : "Offline"}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">Driver ID: #{driver.id}</p>
                    </div>
                </div>
                <Button
                    onClick={() => setEditDialogOpen(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
                >
                    <Pencil className="h-4 w-4" />
                    Edit Driver
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <CircleUser className="h-4 w-4 text-emerald-600" />
                            Contact & Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground/70" />
                            <span className="text-sm text-foreground">{driver.user?.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground/70" />
                            <span className="text-sm text-foreground">{driver.user?.phone || 'No phone'}</span>
                        </div>
                        <div className="pt-4 border-t border-border mt-4">
                            <div className="flex items-center gap-3">
                                <Truck className="h-4 w-4 text-muted-foreground/70" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Vehicle</p>
                                    <p className="text-sm font-medium text-foreground">{driver.vehicle_info || 'Not assigned'}</p>
                                </div>
                            </div>
                        </div>
                         <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground/70" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Warehouse</p>
                                    <p className="text-sm font-medium text-foreground">{driver.warehouse?.code || `WH-${driver.warehouse_id}`}</p>
                                </div>
                        </div>
                    </CardContent>
                </Card>

                {/* History Card */}
                <Card className="col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                         <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar className="h-4 w-4 text-emerald-600" />
                            Recent Deliveries
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/orders?driver_id=${driverId}`)}>
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingOrders ? (
                                    <TableRow><TableCell colSpan={4}>Loading history...</TableCell></TableRow>
                                ) : ordersData?.items?.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center italic text-muted-foreground">No recent orders</TableCell></TableRow>
                                ) : (
                                    ordersData?.items?.map(order => (
                                        <TableRow key={order.id} className="cursor-pointer hover:bg-muted" onClick={() => navigate(`/orders/${order.id}`)}>
                                            <TableCell className="font-mono text-xs">{order.sales_order_number}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {order.created_at ? format(new Date(order.created_at), 'MMM d, p') : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {order.total_amount?.toFixed(3)} KWD
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Driver Dialog */}
            <EditDriverDialog
                driver={driver}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
            />
        </div>
    );
}
