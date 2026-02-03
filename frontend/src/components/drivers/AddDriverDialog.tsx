import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
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
import { useToast } from '@/components/ui/use-toast';

interface AddDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDriverDialog({ open, onOpenChange }: AddDriverDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
      full_name: '',
      email: '',
      password: '',
      vehicle_info: '',
      biometric_id: '',
      warehouse_id: '1',
      is_available: true
  });

  const handleChange = (field: string, value: string | boolean | number) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          vehicle_info: formData.vehicle_info,
          biometric_id: formData.biometric_id,
          warehouse_id: parseInt(formData.warehouse_id),
          is_available: formData.is_available
      };

      if (!payload.email || !payload.full_name || !payload.password || !payload.vehicle_info) {
          throw new Error("Missing required fields");
      }

      return driverService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: "Driver added",
        description: "The driver has been successfully added.",
      });
      onOpenChange(false);
      setFormData({
          full_name: '',
          email: '',
          password: '',
          vehicle_info: '',
          biometric_id: '',
          warehouse_id: '1',
          is_available: true
      });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            </div>

            <div className="grid grid-cols-2 gap-6 pt-2 border-t border-border">
                <div className="space-y-2">
                    <Label htmlFor="wh_id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Warehouse</Label>
                    <Input 
                        id="wh_id"
                        type="number"
                        placeholder="1" 
                        value={formData.warehouse_id}
                        onChange={(e) => handleChange('warehouse_id', e.target.value)}
                        className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                        required
                    />
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
