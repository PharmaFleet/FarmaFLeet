import { useState } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services/paymentService';
import { useToast } from '@/components/ui/use-toast';

export function usePayments() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, search, statusFilter, methodFilter],
    queryFn: () => paymentService.getAll({ 
        page, 
        limit: 10, 
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        method: methodFilter === 'ALL' ? undefined : methodFilter
    }),
    placeholderData: keepPreviousData,
  });

  const { mutate: verifyPayment } = useMutation({
      mutationFn: paymentService.verify,
      // Optimistic update: immediately show verified status
      onMutate: async (id: number) => {
          // Cancel any outgoing refetches
          await queryClient.cancelQueries({ queryKey: ['payments'] });
          
          // Snapshot the previous value
          const previousPayments = queryClient.getQueryData(['payments', page, search, statusFilter, methodFilter]);
          
          // Optimistically update to verified status
          queryClient.setQueryData(
            ['payments', page, search, statusFilter, methodFilter],
            (old: { items: Array<{ id: number; status: string }>; total: number; pages: number } | undefined) => {
              if (!old) return old;
              return {
                ...old,
                items: old.items.map(payment => 
                  payment.id === id ? { ...payment, status: 'verified' } : payment
                ),
              };
            }
          );
          
          return { previousPayments };
      },
      onSuccess: () => {
          toast({
              title: "Payment Verified",
              description: "The payment collection has been successfully verified.",
          });
      },
      onError: (_err, _id, context) => {
          // Roll back on error
          if (context?.previousPayments) {
            queryClient.setQueryData(
              ['payments', page, search, statusFilter, methodFilter],
              context.previousPayments
            );
          }
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to verify payment.",
          });
      },
      onSettled: () => {
          // Refetch to ensure server state is synced
          queryClient.invalidateQueries({ queryKey: ['payments'] });
      }
  });

  const handleExport = async () => {
      try {
          await paymentService.export();
      } catch (error) {
          console.error("Export failed", error);
          alert("Export failed");
      }
  };

  return {
    page,
    setPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    methodFilter,
    setMethodFilter,
    data,
    isLoading,
    verifyPayment,
    handleExport
  };
}
