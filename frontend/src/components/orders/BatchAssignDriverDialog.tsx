import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Search } from 'lucide-react';
import { useAvailableDrivers } from '@/hooks/useDrivers';
import { useBatchAssign } from '@/hooks/useBatchAssign';

interface BatchAssignDriverDialogProps {
    orderIds: number[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function BatchAssignDriverDialog({ orderIds, open, onOpenChange, onSuccess }: BatchAssignDriverDialogProps) {
    const [selectedDriverId, setSelectedDriverId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    
    const { drivers, isLoading: isLoadingDrivers } = useAvailableDrivers();
    
    // Filter drivers based on search query
    const filteredDrivers = useMemo(() => {
        if (!searchQuery.trim()) return drivers;
        const query = searchQuery.toLowerCase();
        return drivers.filter((driver) => 
            driver.user?.full_name?.toLowerCase().includes(query) ||
            driver.user?.email?.toLowerCase().includes(query) ||
            driver.vehicle_info?.toLowerCase().includes(query) ||
            driver.warehouse?.name?.toLowerCase().includes(query)
        );
    }, [drivers, searchQuery]);
    
    const { mutate, isPending } = useBatchAssign({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
            setSelectedDriverId(""); // Reset selection
            setSearchQuery(""); // Reset search
        }
    });

    const handleAssign = () => {
        if (selectedDriverId) {
            mutate({ 
                orderIds, 
                driverId: parseInt(selectedDriverId) 
            });
        }
    };

    // Reset search when dialog closes
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setSearchQuery("");
            setSelectedDriverId("");
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        Batch Assign Orders
                    </DialogTitle>
                    <DialogDescription>
                        Assign <span className="font-semibold text-foreground">{orderIds.length}</span> selected order(s) to a single driver.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <p className="text-sm text-emerald-800">
                            <span className="font-medium">{orderIds.length}</span> orders will be assigned to the selected driver.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="driver">Select Driver</Label>
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, vehicle, or warehouse..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 mb-2"
                            />
                        </div>
                        <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                            <SelectTrigger id="driver">
                                <SelectValue placeholder="Choose a driver..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {isLoadingDrivers ? (
                                    <SelectItem value="loading" disabled>Loading drivers...</SelectItem>
                                ) : filteredDrivers.length === 0 ? (
                                    <SelectItem value="no-results" disabled>No drivers match "{searchQuery}"</SelectItem>
                                ) : (
                                    filteredDrivers.map((driver) => (
                                        <SelectItem key={driver.id} value={driver.id.toString()}>
                                            {driver.user?.full_name} ({driver.is_available ? 'Available' : 'Busy'})
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {searchQuery && (
                            <p className="text-xs text-muted-foreground">
                                Showing {filteredDrivers.length} of {drivers.length} drivers
                            </p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                    <Button 
                        onClick={handleAssign} 
                        disabled={!selectedDriverId || isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign {orderIds.length} Order(s)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

