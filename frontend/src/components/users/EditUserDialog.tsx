import { useState, useEffect } from 'react';
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
import { User } from '@/types';

interface EditUserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    phone: user.phone || '',
    role: user.role,
  });

  useEffect(() => {
    if (open && user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        role: user.role,
      });
    }
  }, [open, user]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      return userService.update(user.id, {
        full_name: formData.full_name || undefined,
        phone: formData.phone || undefined,
        role: formData.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "User updated", description: "User details have been updated." });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (error.message || "Failed to update user");
      toast({ variant: "destructive", title: "Update Error", description: message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-3xl p-0 overflow-hidden bg-card">
        <DialogHeader className="p-8 bg-muted/50 border-b border-border">
          <DialogTitle className="text-2xl font-black text-foreground">Edit User</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Update user information and role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="p-8 space-y-6">
          <div className="p-4 bg-muted rounded-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">Email</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_full_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
            <Input
              id="edit_full_name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className="bg-muted border-border focus:bg-background h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
            <Input
              id="edit_phone"
              type="tel"
              placeholder="+965-XXXX-XXXX"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="bg-muted border-border focus:bg-background h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_role" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</Label>
            <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
              <SelectTrigger className="bg-muted border-border h-11 rounded-xl">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
                <SelectItem value="dispatcher">Dispatcher</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 font-bold transition-all hover:scale-[1.02]">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
