import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
      sales_order_number: '',
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      total_amount: '0',
      payment_method: 'CASH',
      warehouse_id: '1'
  });

  const handleChange = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        sales_order_number: formData.sales_order_number,
        customer_info: {
          name: formData.customer_name,
          phone: formData.customer_phone,
          address: formData.customer_address
        },
        total_amount: parseFloat(formData.total_amount),
        payment_method: formData.payment_method,
        warehouse_id: parseInt(formData.warehouse_id)
      };
      
      if (!payload.sales_order_number || !payload.customer_info.name) {
          throw new Error("Missing required fields");
      }
      
      return orderService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "Order created",
        description: "The order has been successfully created.",
      });
      onOpenChange(false);
      setFormData({
          sales_order_number: '',
          customer_name: '',
          customer_phone: '',
          customer_address: '',
          total_amount: '0',
          payment_method: 'CASH',
          warehouse_id: '1'
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || error.response?.data?.detail || "Failed to create order",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] border-none shadow-2xl rounded-3xl p-0 overflow-hidden bg-white">
        <DialogHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
          <DialogTitle className="text-2xl font-black text-slate-900">Create New Order</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Register a manual delivery order. All fields are required for routing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
                <Label htmlFor="so_num" className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales Order #</Label>
                <Input 
                    id="so_num" 
                    placeholder="e.g. SO-1001" 
                    value={formData.sales_order_number}
                    onChange={(e) => handleChange('sales_order_number', e.target.value)}
                    className="bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="cust_name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Name</Label>
                    <Input 
                        id="cust_name"
                        placeholder="John Doe" 
                        value={formData.customer_name}
                        onChange={(e) => handleChange('customer_name', e.target.value)}
                        className="bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cust_phone" className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone</Label>
                    <Input 
                        id="cust_phone"
                        placeholder="12345678" 
                        value={formData.customer_phone}
                        onChange={(e) => handleChange('customer_phone', e.target.value)}
                        className="bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl"
                        required
                    />
                </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-slate-500">Delivery Address</Label>
                <Input 
                    id="address"
                    placeholder="Block 1, Street 2, Building 5..." 
                    value={formData.customer_address}
                    onChange={(e) => handleChange('customer_address', e.target.value)}
                    className="bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount (KWD)</Label>
                    <Input 
                        id="amount"
                        type="number" 
                        step="0.001" 
                        value={formData.total_amount}
                        onChange={(e) => handleChange('total_amount', e.target.value)}
                        className="bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment</Label>
                    <Select 
                        value={formData.payment_method} 
                        onValueChange={(val) => handleChange('payment_method', val)}
                    >
                        <SelectTrigger className="bg-slate-50 border-slate-200 h-11 rounded-xl">
                            <SelectValue placeholder="Method" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                            <SelectItem value="CASH">Cash on Delivery</SelectItem>
                            <SelectItem value="KNET">KNET (Online)</SelectItem>
                            <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={createMutation.isPending} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 text-md font-bold transition-all hover:scale-[1.02]">
                {createMutation.isPending ? "Creating Order..." : "Confirm & Create Order"}
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
