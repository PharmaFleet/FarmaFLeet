import { useState } from 'react';
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
import { useToast } from '@/components/ui/use-toast';

interface AddDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialState = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  vehicle_info: '',
  vehicle_type: 'car',
  biometric_id: '',
  warehouse_id: '',
};

export function AddDriverDialog({ open, onOpenChange }: AddDriverDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(initialState);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseService.getAll,
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!formData.email || !formData.full_name || !formData.password || !formData.vehicle_info || !formData.warehouse_id) {
        throw new Error("Missing required fields");
      }

      const payload: any = {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        vehicle_info: formData.vehicle_info,
        vehicle_type: formData.vehicle_type,
        biometric_id: formData.biometric_id,
        warehouse_id: parseInt(formData.warehouse_id),
      };
      if (formData.phone) payload.phone = formData.phone;

      return driverService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: "Driver added",
        description: "The driver has been successfully added.",
      });
      onOpenChange(false);
      setFormData(initialState);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (error.message || "Failed to add driver");

      toast({
        variant: "destructive",
        title: "Database Error",
        description: message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setFormData(initialState); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-3xl p-0 overflow-hidden bg-card">
        <DialogHeader className="p-8 bg-muted/50 border-b border-border">
          <DialogTitle className="text-2xl font-black text-foreground">Add New Driver</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Register a new fleet operator and create their system credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                    <Input
                        id="full_name"
                        placeholder="John Doe"
                        value={formData.full_name}
                        onChange={(e) => handleChange('full_name', e.target.value)}
                        className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="driver@example.com"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Initial Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                    <Input
                        id="phone"
                        type="tel"
                        placeholder="+965-XXXX-XXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-2 border-t border-border">
                <div className="space-y-2">
                    <Label htmlFor="wh_id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Warehouse</Label>
                    <Select value={formData.warehouse_id} onValueChange={(value) => handleChange('warehouse_id', value)}>
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

                <div className="space-y-2">
                    <Label htmlFor="vehicle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle Info</Label>
                    <Input
                        id="vehicle"
                        placeholder="KW 1234"
                        value={formData.vehicle_info}
                        onChange={(e) => handleChange('vehicle_info', e.target.value)}
                        className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="vehicle_type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle Type</Label>
                <Select value={formData.vehicle_type} onValueChange={(value) => handleChange('vehicle_type', value)}>
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
                <Label htmlFor="bio_id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Biometric ID</Label>
                <Input
                    id="bio_id"
                    placeholder="BIO-12345"
                    value={formData.biometric_id}
                    onChange={(e) => handleChange('biometric_id', e.target.value)}
                    className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                    required
                />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={createMutation.isPending} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 text-md font-bold transition-all hover:scale-[1.02]">
                {createMutation.isPending ? "Adding Driver..." : "Register Driver"}
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
