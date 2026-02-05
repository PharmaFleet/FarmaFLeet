import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';

interface CancelOrderDialogProps {
    orderId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (orderId: number, reason?: string) => void;
    isPending?: boolean;
}

export function CancelOrderDialog({ orderId, open, onOpenChange, onConfirm, isPending }: CancelOrderDialogProps) {
    const [reason, setReason] = useState("");

    const handleCancel = () => {
        if (orderId) {
            onConfirm(orderId, reason.trim() || undefined);
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setReason("");
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Cancel Order
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to cancel this order?
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            The order will be marked as cancelled. This action can be reversed by changing the order status.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="cancel-reason">Cancellation Reason (Optional)</Label>
                        <Textarea
                            id="cancel-reason"
                            placeholder="Enter a reason for cancelling this order..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Go Back
                    </Button>
                    <Button
                        onClick={handleCancel}
                        disabled={isPending}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Cancel Order
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
