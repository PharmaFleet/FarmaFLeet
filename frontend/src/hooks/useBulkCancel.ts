import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { useToast } from '@/components/ui/use-toast';

interface UseBulkCancelOptions {
  onSuccess?: (cancelledCount: number) => void;
  onError?: (error: unknown) => void;
}

export function useBulkCancel({ onSuccess, onError }: UseBulkCancelOptions = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ orderIds, reason }: { orderIds: number[], reason?: string }) => {
      return orderService.batchCancel(orderIds, reason);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      const errorCount = data.errors?.length || 0;
      if (errorCount > 0) {
        toast({
          title: "Batch Cancel Completed",
          description: `Cancelled ${data.cancelled} order(s). ${errorCount} order(s) could not be cancelled.`,
          duration: 4000,
        });
      } else {
        toast({
          title: "Orders Cancelled",
          description: `Successfully cancelled ${data.cancelled} order(s).`,
          duration: 3000,
        });
      }

      onSuccess?.(data.cancelled);
    },
    onError: (error) => {
      toast({
        title: "Cancel Failed",
        description: "Could not cancel orders. Please try again.",
        variant: "destructive"
      });
      onError?.(error);
    }
  });
}
