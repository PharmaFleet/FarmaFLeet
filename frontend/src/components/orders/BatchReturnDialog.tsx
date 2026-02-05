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
import { Loader2, RotateCcw } from 'lucide-react';
import { useBulkReturn } from '@/hooks/useBulkReturn';

interface BatchReturnDialogProps {
    orderIds: number[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function BatchReturnDialog({ orderIds, open, onOpenChange, onSuccess }: BatchReturnDialogProps) {
    const [reason, setReason] = useState("");

    const { mutate, isPending } = useBulkReturn({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
            setReason("");
        }
    });

    const handleReturn = () => {
        if (reason.trim()) {
            mutate({
                orderIds,
                reason: reason.trim()
            });
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
                        <RotateCcw className="h-5 w-5 text-orange-500" />
                        Return Orders
                    </DialogTitle>
                    <DialogDescription>
                        You are about to return <span className="font-semibold text-foreground">{orderIds.length}</span> order(s).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                            <span className="font-medium">{orderIds.length}</span> order(s) will be marked as returned.
                            A reason is required to track return requests.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="batch-return-reason">Return Reason (Required)</Label>
                        <Textarea
                            id="batch-return-reason"
                            placeholder="Enter the reason for returning these orders..."
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
                        onClick={handleReturn}
                        disabled={isPending || !reason.trim()}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Return {orderIds.length} Order(s)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
