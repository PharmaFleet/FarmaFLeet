import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
import { warehouseService } from '@/services/warehouseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Driver } from '@/types';

interface EditDriverDialogProps {
  driver: Driver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDriverDialog({ driver, open, onOpenChange }: EditDriverDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    vehicle_info: driver.vehicle_info || '',
    vehicle_type: driver.vehicle_type || 'car',
    biometric_id: driver.biometric_id || '',
    warehouse_id: driver.warehouse_id?.toString() || '',
    is_available: driver.is_available ?? true,
    user_full_name: driver.user?.full_name || '',
    user_phone: driver.user?.phone || '',
  });

  // Reset form when driver changes or dialog opens
  useEffect(() => {
    if (open && driver) {
      setFormData({
        vehicle_info: driver.vehicle_info || '',
        vehicle_type: driver.vehicle_type || 'car',
        biometric_id: driver.biometric_id || '',
        warehouse_id: driver.warehouse_id?.toString() || '',
        is_available: driver.is_available ?? true,
        user_full_name: driver.user?.full_name || '',
        user_phone: driver.user?.phone || '',
      });
    }
  }, [open, driver]);

  // Fetch warehouses for dropdown
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseService.getAll,
  });

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      const payload = {
        vehicle_info: formData.vehicle_info || null,
        vehicle_type: formData.vehicle_type || null,
        biometric_id: formData.biometric_id || null,
        warehouse_id: formData.warehouse_id ? parseInt(formData.warehouse_id) : null,
        is_available: formData.is_available,
        user_full_name: formData.user_full_name || undefined,
        user_phone: formData.user_phone || undefined,
      };
      return driverService.update(driver.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver', driver.id] });
      toast({
        title: "Driver updated",
        description: "The driver details have been successfully updated.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (error.message || "Failed to update driver");

      toast({
        variant: "destructive",
        title: "Update Error",
        description: message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-3xl p-0 overflow-hidden bg-card">
        <DialogHeader className="p-8 bg-muted/50 border-b border-border">
          <DialogTitle className="text-2xl font-black text-foreground">Edit Driver</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Update driver information and assignment details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Driver Info Section */}
          <div className="space-y-4">
            {/* Email (read-only) */}
            <div className="p-4 bg-muted rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">Email</p>
              <p className="text-sm text-muted-foreground">{driver.user?.email || 'N/A'}</p>
            </div>

            {/* Editable Name and Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user_full_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Driver Name
                </Label>
                <Input
                  id="user_full_name"
                  placeholder="Enter driver name"
                  value={formData.user_full_name}
                  onChange={(e) => handleChange('user_full_name', e.target.value)}
                  className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user_phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Phone Number
                </Label>
                <Input
                  id="user_phone"
                  type="tel"
                  placeholder="+965-XXXX-XXXX"
                  value={formData.user_phone}
                  onChange={(e) => handleChange('user_phone', e.target.value)}
                  className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_info" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Vehicle Info
                </Label>
                <Input
                  id="vehicle_info"
                  placeholder="KW 1234"
                  value={formData.vehicle_info}
                  onChange={(e) => handleChange('vehicle_info', e.target.value)}
                  className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="biometric_id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Biometric ID
                </Label>
                <Input
                  id="biometric_id"
                  placeholder="BIO-12345"
                  value={formData.biometric_id}
                  onChange={(e) => handleChange('biometric_id', e.target.value)}
                  className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Vehicle Type
              </Label>
              <Select
                value={formData.vehicle_type}
                onValueChange={(value) => handleChange('vehicle_type', value)}
              >
                <SelectTrigger className="bg-muted border-border h-11 rounded-xl">
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse_id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Assigned Warehouse
              </Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(value) => handleChange('warehouse_id', value)}
              >
                <SelectTrigger className="bg-muted border-border h-11 rounded-xl">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh: any) => (
                    <SelectItem key={wh.id} value={wh.id.toString()}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
              <div>
                <Label htmlFor="is_available" className="text-sm font-semibold text-foreground">
                  Available for Deliveries
                </Label>
                <p className="text-xs text-muted-foreground">Driver can receive new order assignments</p>
              </div>
              <Switch
                id="is_available"
                checked={formData.is_available}
                onCheckedChange={(checked) => handleChange('is_available', checked)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 font-bold transition-all hover:scale-[1.02]"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
