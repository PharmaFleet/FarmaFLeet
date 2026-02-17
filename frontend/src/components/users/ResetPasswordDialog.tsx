import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/types';

interface ResetPasswordDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetPasswordDialog({ user, open, onOpenChange }: ResetPasswordDialogProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetMutation = useMutation({
    mutationFn: () => {
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      return userService.resetPassword(user.id, password);
    },
    onSuccess: () => {
      toast({ title: "Password reset", description: `Password for ${user.email} has been reset.` });
      setPassword('');
      setConfirmPassword('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (error.message || "Failed to reset password");
      toast({ variant: "destructive", title: "Reset Error", description: message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPassword(''); setConfirmPassword(''); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[420px] border-none shadow-2xl rounded-3xl p-0 overflow-hidden bg-card">
        <DialogHeader className="p-8 bg-muted/50 border-b border-border">
          <DialogTitle className="text-2xl font-black text-foreground">Reset Password</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Set a new password for {user.email}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); resetMutation.mutate(); }} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="new_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-muted border-border focus:bg-background h-11 rounded-xl"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm Password</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-muted border-border focus:bg-background h-11 rounded-xl"
              required
              minLength={6}
            />
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={resetMutation.isPending || !password || password !== confirmPassword}
              className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 font-bold transition-all hover:scale-[1.02]"
            >
              {resetMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
