import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { useToast } from '@/components/ui/use-toast';

interface UseBatchAssignOptions {
  onSuccess?: (assignedCount: number) => void;
  onError?: (error: unknown) => void;
}

export function useBatchAssign({ onSuccess, onError }: UseBatchAssignOptions = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ orderIds, driverId }: { orderIds: number[], driverId: number }) => {
      const assignments = orderIds.map(orderId => ({
        order_id: orderId,
        driver_id: driverId
      }));
      return orderService.batchAssign(assignments);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Also invalidate available drivers to reflect busy status if necessary
      queryClient.invalidateQueries({ queryKey: ['available-drivers'] });
      
      toast({
        title: "Batch Assignment Complete",
        description: `Successfully assigned ${data.assigned} order(s) to driver.`,
        duration: 3000,
      });
      
      onSuccess?.(data.assigned);
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: "Could not assign orders. Please try again.",
        variant: "destructive"
      });
      onError?.(error);
    }
  });
}
