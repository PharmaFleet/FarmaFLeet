import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
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

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialState = {
  email: '',
  full_name: '',
  password: '',
  role: 'dispatcher',
  phone: '',
};

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialState);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!formData.email || !formData.full_name || !formData.password) {
        throw new Error("Email, name, and password are required");
      }
      const payload: any = {
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        role: formData.role,
      };
      if (formData.phone) payload.phone = formData.phone;
      return userService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "User created", description: "The new user has been added." });
      setFormData(initialState);
      onOpenChange(false);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (error.message || "Failed to create user");
      toast({ variant: "destructive", title: "Create Error", description: message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setFormData(initialState); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-3xl p-0 overflow-hidden bg-card">
        <DialogHeader className="p-8 bg-muted/50 border-b border-border">
          <DialogTitle className="text-2xl font-black text-foreground">Add New User</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Create a new system user with role-based access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="add_full_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
            <Input
              id="add_full_name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className="bg-muted border-border focus:bg-background h-11 rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add_email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                id="add_email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input
                id="add_password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="bg-muted border-border focus:bg-background h-11 rounded-xl"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add_role" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                <SelectTrigger className="bg-muted border-border h-11 rounded-xl">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone (Optional)</Label>
              <Input
                id="add_phone"
                type="tel"
                placeholder="+965-XXXX-XXXX"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="bg-muted border-border focus:bg-background h-11 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 text-md font-bold transition-all hover:scale-[1.02]"
            >
              {createMutation.isPending ? "Creating User..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
