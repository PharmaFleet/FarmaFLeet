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

interface ReturnOrderDialogProps {
    orderId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (orderId: number, reason: string) => void;
    isPending?: boolean;
}

export function ReturnOrderDialog({ orderId, open, onOpenChange, onConfirm, isPending }: ReturnOrderDialogProps) {
    const [reason, setReason] = useState("");

    const handleReturn = () => {
        if (orderId && reason.trim()) {
            onConfirm(orderId, reason.trim());
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
                        Return Order
                    </DialogTitle>
                    <DialogDescription>
                        Mark this delivered order as returned.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                            The order will be marked as returned. A reason is required to track return requests.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="return-reason">Return Reason (Required)</Label>
                        <Textarea
                            id="return-reason"
                            placeholder="Enter the reason for returning this order..."
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
                        Return Order
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
