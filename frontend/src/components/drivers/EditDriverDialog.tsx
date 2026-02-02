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
    biometric_id: driver.biometric_id || '',
    warehouse_id: driver.warehouse_id?.toString() || '',
    is_available: driver.is_available ?? true,
  });

  // Reset form when driver changes or dialog opens
  useEffect(() => {
    if (open && driver) {
      setFormData({
        vehicle_info: driver.vehicle_info || '',
        biometric_id: driver.biometric_id || '',
        warehouse_id: driver.warehouse_id?.toString() || '',
        is_available: driver.is_available ?? true,
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
        biometric_id: formData.biometric_id || null,
        warehouse_id: formData.warehouse_id ? parseInt(formData.warehouse_id) : null,
        is_available: formData.is_available,
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
      <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-3xl p-0 overflow-hidden bg-white">
        <DialogHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
          <DialogTitle className="text-2xl font-black text-slate-900">Edit Driver</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Update driver information and assignment details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Driver Info Section */}
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Driver</p>
              <p className="text-lg font-semibold text-slate-900">{driver.user?.full_name || 'Unknown'}</p>
              <p className="text-sm text-slate-500">{driver.user?.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_info" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Vehicle Info
                </Label>
                <Input
                  id="vehicle_info"
                  placeholder="KW 1234"
                  value={formData.vehicle_info}
                  onChange={(e) => handleChange('vehicle_info', e.target.value)}
                  className="bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="biometric_id" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Biometric ID
                </Label>
                <Input
                  id="biometric_id"
                  placeholder="BIO-12345"
                  value={formData.biometric_id}
                  onChange={(e) => handleChange('biometric_id', e.target.value)}
                  className="bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse_id" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Assigned Warehouse
              </Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(value) => handleChange('warehouse_id', value)}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200 h-11 rounded-xl">
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

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <Label htmlFor="is_available" className="text-sm font-semibold text-slate-700">
                  Available for Deliveries
                </Label>
                <p className="text-xs text-slate-500">Driver can receive new order assignments</p>
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
