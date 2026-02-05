import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { useToast } from '@/components/ui/use-toast';

interface UseBulkReturnOptions {
  onSuccess?: (returnedCount: number) => void;
  onError?: (error: unknown) => void;
}

export function useBulkReturn({ onSuccess, onError }: UseBulkReturnOptions = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ orderIds, reason }: { orderIds: number[], reason: string }) => {
      return orderService.batchReturn(orderIds, reason);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      const errorCount = data.errors?.length || 0;
      if (errorCount > 0) {
        toast({
          title: "Batch Return Completed",
          description: `Returned ${data.returned} order(s). ${errorCount} order(s) could not be returned.`,
          duration: 4000,
        });
      } else {
        toast({
          title: "Orders Returned",
          description: `Successfully returned ${data.returned} order(s).`,
          duration: 3000,
        });
      }

      onSuccess?.(data.returned);
    },
    onError: (error) => {
      toast({
        title: "Return Failed",
        description: "Could not return orders. Please try again.",
        variant: "destructive"
      });
      onError?.(error);
    }
  });
}
