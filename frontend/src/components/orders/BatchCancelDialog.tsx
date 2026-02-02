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
import { useBulkCancel } from '@/hooks/useBulkCancel';

interface BatchCancelDialogProps {
    orderIds: number[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function BatchCancelDialog({ orderIds, open, onOpenChange, onSuccess }: BatchCancelDialogProps) {
    const [reason, setReason] = useState("");

    const { mutate, isPending } = useBulkCancel({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
            setReason("");
        }
    });

    const handleCancel = () => {
        mutate({
            orderIds,
            reason: reason.trim() || undefined
        });
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
                        Cancel Orders
                    </DialogTitle>
                    <DialogDescription>
                        You are about to cancel <span className="font-semibold text-slate-900">{orderIds.length}</span> order(s).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                            <span className="font-medium">{orderIds.length}</span> order(s) will be marked as cancelled.
                            This action can be reversed by changing the order status.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Cancellation Reason (Optional)</Label>
                        <Textarea
                            id="reason"
                            placeholder="Enter a reason for cancelling these orders..."
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
                        Cancel {orderIds.length} Order(s)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
