import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { api } from '@/lib/axios';
import { Warehouse } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ValidationErrors {
  sales_order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount?: string;
}

export function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.get('/warehouses');
      return response.data as Warehouse[];
    },
    enabled: open,
  });

  const [formData, setFormData] = useState({
      sales_order_number: '',
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      total_amount: '0',
      payment_method: 'CASH',
      warehouse_id: '',
      notes: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'sales_order_number':
        if (!value.trim()) return 'Order number is required';
        if (value.length < 3) return 'Order number must be at least 3 characters';
        return undefined;

      case 'customer_name':
        if (!value.trim()) return 'Customer name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        return undefined;

      case 'customer_phone':
        if (!value.trim()) return 'Phone number is required';
        // Kuwait phone number: 8 digits, optionally starting with +965
        const phoneRegex = /^(\+965)?[0-9]{8}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
          return 'Invalid phone number (8 digits, e.g., 12345678)';
        }
        return undefined;

      case 'customer_address':
        if (!value.trim()) return 'Delivery address is required';
        if (value.length < 10) return 'Address must be at least 10 characters';
        return undefined;

      case 'total_amount':
        const amount = parseFloat(value);
        if (isNaN(amount)) return 'Invalid amount';
        if (amount < 0) return 'Amount cannot be negative';
        if (amount > 999999) return 'Amount is too large';
        return undefined;

      default:
        return undefined;
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Real-time validation for touched fields
    if (touched[field]) {
      const error = validateField(field, value);
      setValidationErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData]);
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
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
        warehouse_id: parseInt(formData.warehouse_id),
        notes: formData.notes.trim() || undefined,
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
          warehouse_id: '',
          notes: '',
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

    // Validate all fields before submission
    const errors: ValidationErrors = {};
    let hasErrors = false;

    (Object.keys(formData) as Array<keyof typeof formData>).forEach((field) => {
      if (field !== 'payment_method' && field !== 'warehouse_id') {
        const error = validateField(field, formData[field]);
        if (error) {
          errors[field as keyof ValidationErrors] = error;
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      setValidationErrors(errors);
      setTouched({
        sales_order_number: true,
        customer_name: true,
        customer_phone: true,
        customer_address: true,
        total_amount: true,
      });
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
      });
      return;
    }

    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] border-none shadow-2xl rounded-3xl p-0 overflow-hidden bg-card">
        <DialogHeader className="p-8 bg-muted/50 border-b border-border">
          <DialogTitle className="text-2xl font-black text-foreground">Create New Order</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Register a manual delivery order. All fields are required for routing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
                <Label htmlFor="so_num" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sales Order # <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="so_num"
                    placeholder="e.g. SO-1001"
                    value={formData.sales_order_number}
                    onChange={(e) => handleChange('sales_order_number', e.target.value)}
                    onBlur={() => handleBlur('sales_order_number')}
                    className={`bg-muted border-border focus:bg-background h-11 rounded-xl ${
                      validationErrors.sales_order_number && touched.sales_order_number
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    aria-invalid={!!validationErrors.sales_order_number && touched.sales_order_number}
                    aria-describedby={validationErrors.sales_order_number ? 'so_num-error' : undefined}
                />
                {validationErrors.sales_order_number && touched.sales_order_number && (
                  <p id="so_num-error" className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {validationErrors.sales_order_number}
                  </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="cust_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Customer Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="cust_name"
                        placeholder="John Doe"
                        value={formData.customer_name}
                        onChange={(e) => handleChange('customer_name', e.target.value)}
                        onBlur={() => handleBlur('customer_name')}
                        className={`bg-muted border-border focus:bg-background h-11 rounded-xl ${
                          validationErrors.customer_name && touched.customer_name
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                        }`}
                        aria-invalid={!!validationErrors.customer_name && touched.customer_name}
                    />
                    {validationErrors.customer_name && touched.customer_name && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.customer_name}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cust_phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Phone <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="cust_phone"
                        placeholder="12345678"
                        value={formData.customer_phone}
                        onChange={(e) => handleChange('customer_phone', e.target.value)}
                        onBlur={() => handleBlur('customer_phone')}
                        className={`bg-muted border-border focus:bg-background h-11 rounded-xl ${
                          validationErrors.customer_phone && touched.customer_phone
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                        }`}
                        aria-invalid={!!validationErrors.customer_phone && touched.customer_phone}
                    />
                    {validationErrors.customer_phone && touched.customer_phone && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.customer_phone}</p>
                    )}
                </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Delivery Address <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="address"
                    placeholder="Block 1, Street 2, Building 5..."
                    value={formData.customer_address}
                    onChange={(e) => handleChange('customer_address', e.target.value)}
                    onBlur={() => handleBlur('customer_address')}
                    className={`bg-muted border-border focus:bg-background h-11 rounded-xl ${
                      validationErrors.customer_address && touched.customer_address
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    aria-invalid={!!validationErrors.customer_address && touched.customer_address}
                />
                {validationErrors.customer_address && touched.customer_address && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.customer_address}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Amount (KWD) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="amount"
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.total_amount}
                        onChange={(e) => handleChange('total_amount', e.target.value)}
                        onBlur={() => handleBlur('total_amount')}
                        className={`bg-muted border-border focus:bg-background h-11 rounded-xl ${
                          validationErrors.total_amount && touched.total_amount
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                        }`}
                        aria-invalid={!!validationErrors.total_amount && touched.total_amount}
                    />
                    {validationErrors.total_amount && touched.total_amount && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.total_amount}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment</Label>
                    <Select
                        value={formData.payment_method}
                        onValueChange={(val) => handleChange('payment_method', val)}
                    >
                        <SelectTrigger className="bg-slate-50 border-slate-200 h-11 rounded-xl">
                            <SelectValue placeholder="Method" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border shadow-xl">
                            <SelectItem value="CASH">Cash on Delivery</SelectItem>
                            <SelectItem value="KNET">KNET (Online)</SelectItem>
                            <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Branch / Warehouse <span className="text-red-500">*</span>
                </Label>
                <Select
                    value={formData.warehouse_id}
                    onValueChange={(val) => handleChange('warehouse_id', val)}
                >
                    <SelectTrigger className="bg-muted border-border h-11 rounded-xl">
                        <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-xl">
                        {warehouses?.map((wh) => (
                            <SelectItem key={wh.id} value={String(wh.id)}>
                                {wh.code} - {wh.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Notes (Optional)
                </Label>
                <Textarea
                    id="notes"
                    placeholder="Add any special delivery instructions..."
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={2}
                    className="bg-muted border-border focus:bg-background rounded-xl"
                />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || Object.values(validationErrors).some(e => !!e)}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 text-md font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Order...
                  </span>
                ) : (
                  "Confirm & Create Order"
                )}
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
