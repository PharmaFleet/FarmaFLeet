import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { usePayments } from './hooks/usePayments';
import { PaymentFilters } from './components/PaymentFilters';
import { PaymentTable } from './components/PaymentTable';

export default function PaymentsPage() {
  const {
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
  } = usePayments();

  return (
    <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
           <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Payments</h2>
           <p className="text-muted-foreground mt-1">Track collections, reconcile transactions, and monitor financial health.</p>
        </div>
        <Button variant="outline" className="shadow-sm border-border" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4 text-emerald-600" />
            Export Report
        </Button>
      </div>

      {/* Grid Container */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-300">
        <PaymentFilters 
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            methodFilter={methodFilter}
            setMethodFilter={setMethodFilter}
        />

        <PaymentTable 
            data={data}
            isLoading={isLoading}
            verifyPayment={verifyPayment}
        />
      </div>
      
       {/* Pagination Controls */}
       <div className="flex items-center justify-between px-2">
        <p className="text-xs text-muted-foreground">
            Audit trail of financial collections
        </p>
        <div className="flex items-center space-x-4">
            <span className="text-xs font-medium text-muted-foreground">
                Page {page} of {data?.pages || 1}
            </span>
            <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={() => setPage((old: number) => Math.max(old - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={() => setPage((old: number) => (data?.pages && old < data.pages ? old + 1 : old))}
                  disabled={!data || page === data.pages}
                >
                  Next
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
