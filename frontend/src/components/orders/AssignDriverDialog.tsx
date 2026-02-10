import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
import { orderService } from '@/services/orderService';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { VehicleIcon } from '@/components/shared/VehicleIcon';

interface AssignDriverDialogProps {
    orderId: number;
    currentDriverId?: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AssignDriverDialog({ orderId, currentDriverId, open, onOpenChange }: AssignDriverDialogProps) {
    const [selectedDriverId, setSelectedDriverId] = useState<string>(currentDriverId?.toString() || "");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: drivers, isLoading: isLoadingDrivers } = useQuery({
        queryKey: ['available-drivers'],
        queryFn: () => driverService.getAll({ size: 500, active_only: true }),
    });

    // Reset state when dialog closes
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setSelectedDriverId("");
        }
        onOpenChange(isOpen);
    };

    const mutation = useMutation({
        mutationFn: (driverId: number) => orderService.assignDriver(orderId, driverId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast({
                title: "Driver Assigned",
                description: "The order has been successfully assigned.",
            });
            onOpenChange(false);
        },
        onError: () => {
             toast({
                title: "Assignment Failed",
                description: "Could not assign driver. Please try again.",
                variant: "destructive"
            });
        }
    });

    const handleAssign = () => {
        if (selectedDriverId) {
            mutation.mutate(parseInt(selectedDriverId));
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Driver</DialogTitle>
                    <DialogDescription>
                        Select a driver for Order #{orderId}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="driver">Driver</Label>
                        <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                            <SelectTrigger id="driver">
                                <SelectValue placeholder="Select a driver" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingDrivers ? (
                                    <SelectItem value="loading" disabled>Loading drivers...</SelectItem>
                                ) : (
                                    drivers?.items?.map((driver) => (
                                        <SelectItem key={driver.id} value={driver.id.toString()}>
                                            <span className="flex items-center gap-2">
                                                <VehicleIcon vehicleType={driver.vehicle_type} size={14} />
                                                {driver.user?.full_name} ({driver.is_available ? 'Available' : 'Busy'})
                                            </span>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={!selectedDriverId || mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
