import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { driverService } from '@/services/driverService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Filter, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DriversPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', page, search],
    queryFn: () => driverService.getAll({ 
        page, 
        limit: 10,
        search: search || undefined
    }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-slate-900">Drivers</h2>
           <p className="text-slate-500">Manage fleet and driver availability.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Driver
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
            <Input 
                placeholder="Search drivers..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
            />
        </div>
        <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                ))
            ) : data?.items?.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No drivers found.
                    </TableCell>
                </TableRow>
            ) : (
                data?.items?.map((driver) => (
                    <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                            {driver.user?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                            <Badge 
                                variant={driver.is_available ? "default" : "secondary"}
                                className={driver.is_available ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border-0"}
                            >
                                {driver.is_available ? "Available" : "Offline"}
                            </Badge>
                        </TableCell>
                        <TableCell>{driver.vehicle_info || 'N/A'}</TableCell>
                        <TableCell>{driver.warehouse_id ? `Warehouse #${driver.warehouse_id}` : 'Unassigned'}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 text-slate-500">
                                <Phone className="h-3 w-3" />
                                <span className="text-xs">
                                     {driver.user?.email} 
                                     {/* Normally would have phone number here */}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                                    <DropdownMenuItem>Delivery History</DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <MapPin className="mr-2 h-4 w-4" />
                                        Locate on Map
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
      
       {/* Pagination Controls */}
       <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((old) => Math.max(old - 1, 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span className="text-sm text-slate-600">
            Page {page} of {data?.pages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((old) => (data?.pages && old < data.pages ? old + 1 : old))}
          disabled={!data || page === data.pages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
