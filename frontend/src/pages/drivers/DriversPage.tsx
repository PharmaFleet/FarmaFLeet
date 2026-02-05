import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { MoreHorizontal, Plus, MapPin, Phone, Search, Truck, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AddDriverDialog } from '@/components/drivers/AddDriverDialog';
import { EditDriverDialog } from '@/components/drivers/EditDriverDialog';
import { cn } from '@/lib/utils';
import { Driver } from '@/types';
import { VehicleIcon } from '@/components/shared/VehicleIcon';

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

import { warehouseService } from '@/services/warehouseService';

export default function DriversPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const handleEditDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setEditOpen(true);
  };

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseService.getAll,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', page, search, statusFilter, warehouseFilter],
    queryFn: () => driverService.getAll({ 
        page, 
        limit: 10,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        warehouse_id: warehouseFilter === 'ALL' ? undefined : Number(warehouseFilter)
    }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
      <AddDriverDialog open={addOpen} onOpenChange={setAddOpen} />
      {selectedDriver && (
        <EditDriverDialog
          driver={selectedDriver}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
           <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Drivers</h2>
           <p className="text-muted-foreground mt-1">Manage fleet productivity and driver availability status.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Driver
        </Button>
      </div>

      {/* Grid Container */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-300">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-muted/50 p-6 border-b border-border">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search drivers by name, ID or vehicle..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 border-border focus:ring-emerald-500/20"
                />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-card border-border">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="w-[160px] bg-card border-border">
                        <SelectValue placeholder="Warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Warehouses</SelectItem>
                         {warehouses?.map((w: any) => (
                             <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                         ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead>Driver Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                            <TableCell><div className="h-4 w-32 bg-muted rounded" /></TableCell>
                            <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                            <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                            <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                            <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    ))
                ) : data?.items?.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic">
                            No drivers found.
                        </TableCell>
                    </TableRow>
                ) : (
                    data?.items?.map((driver) => (
                        <TableRow key={driver.id} className="group hover:bg-emerald-50/30 transition-colors">
                            <TableCell className="font-semibold text-foreground">
                                <div className="flex items-center gap-2">
                                    <VehicleIcon vehicleType={driver.vehicle_type} size={16} />
                                    {driver.user?.full_name || 'Unknown Driver'}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge 
                                    className={cn(
                                        "font-medium px-2.5 py-0.5 rounded-full border-0 shadow-sm",
                                        driver.is_available ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {driver.is_available ? "Available" : "Offline"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Truck className="h-3 w-3 text-muted-foreground" />
                                    {driver.vehicle_info || 'N/A'}
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {driver.warehouse?.name || (driver.warehouse_id ? `Warehouse #${driver.warehouse_id}` : 'Unassigned')}
                            </TableCell>
                            <TableCell>
                                {driver.user?.phone ? (
                                     <a href={`tel:${driver.user.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-emerald-600 transition-colors">
                                         <Phone className="h-3 w-3" />
                                         <span className="text-xs font-medium">{driver.user.phone}</span>
                                     </a>
                                ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground/50">
                                        <Phone className="h-3 w-3" />
                                        <span className="text-xs">N/A</span>
                                    </div>
                                )}
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-muted shadow-sm border border-transparent hover:border-border">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 shadow-xl">
                                        <DropdownMenuLabel>Driver Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => navigate(`/drivers/${driver.id}`)}>View Profile</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleEditDriver(driver)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit Driver
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate(`/drivers/${driver.id}`)}>Delivery History</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => navigate(`/map?driverId=${driver.id}`)}>
                                            <MapPin className="mr-2 h-4 w-4 text-emerald-600" />
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
      </div>
      
       {/* Pagination Controls */}
       <div className="flex items-center justify-between px-2">
        <p className="text-xs text-muted-foreground">
            Total {data?.total || 0} drivers managed
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
                  onClick={() => setPage((old) => Math.max(old - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={() => setPage((old) => (data?.pages && old < data.pages ? old + 1 : old))}
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
