import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, AlertOctagon } from 'lucide-react';
import { useBulkDelete } from '@/hooks/useBulkDelete';

interface BatchDeleteDialogProps {
    orderIds: number[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function BatchDeleteDialog({ orderIds, open, onOpenChange, onSuccess }: BatchDeleteDialogProps) {
    const [confirmation, setConfirmation] = useState("");

    const { mutate, isPending } = useBulkDelete({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
            setConfirmation("");
        }
    });

    const isConfirmed = confirmation === "DELETE";

    const handleDelete = () => {
        if (isConfirmed) {
            mutate({ orderIds });
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setConfirmation("");
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-rose-600">
                        <AlertOctagon className="h-5 w-5" />
                        Permanently Delete Orders
                    </DialogTitle>
                    <DialogDescription>
                        You are about to permanently delete <span className="font-semibold text-foreground">{orderIds.length}</span> order(s).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                        <div className="flex gap-3">
                            <Trash2 className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-rose-800">
                                <p className="font-semibold mb-1">This action is irreversible!</p>
                                <p>
                                    All order data, status history, and proof of delivery records
                                    for these {orderIds.length} order(s) will be permanently removed
                                    from the database.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirmation">
                            Type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm
                        </Label>
                        <Input
                            id="confirmation"
                            placeholder="Type DELETE to confirm"
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            className="font-mono"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={!isConfirmed || isPending}
                        variant="destructive"
                        className="bg-rose-600 hover:bg-rose-700"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete {orderIds.length} Order(s)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
