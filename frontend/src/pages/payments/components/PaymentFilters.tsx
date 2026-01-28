import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface PaymentFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  methodFilter: string;
  setMethodFilter: (value: string) => void;
}

export function PaymentFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  methodFilter,
  setMethodFilter
}: PaymentFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50/50 p-6 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Search transaction, order #, or driver..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 border-slate-200 focus:ring-emerald-500/20"
            />
        </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-white border-slate-200">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="VERIFIED">Verified</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[150px] bg-white border-slate-200">
                    <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Methods</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="KNET">Knet</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>
  );
}
