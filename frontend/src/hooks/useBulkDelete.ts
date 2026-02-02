import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { useToast } from '@/components/ui/use-toast';

interface UseBulkDeleteOptions {
  onSuccess?: (deletedCount: number) => void;
  onError?: (error: unknown) => void;
}

export function useBulkDelete({ onSuccess, onError }: UseBulkDeleteOptions = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ orderIds }: { orderIds: number[] }) => {
      return orderService.batchDelete(orderIds);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      const errorCount = data.errors?.length || 0;
      if (errorCount > 0) {
        toast({
          title: "Batch Delete Completed",
          description: `Deleted ${data.deleted} order(s). ${errorCount} order(s) could not be deleted.`,
          duration: 4000,
        });
      } else {
        toast({
          title: "Orders Deleted",
          description: `Permanently deleted ${data.deleted} order(s).`,
          duration: 3000,
        });
      }

      onSuccess?.(data.deleted);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Could not delete orders. Please try again.",
        variant: "destructive"
      });
      onError?.(error);
    }
  });
}
