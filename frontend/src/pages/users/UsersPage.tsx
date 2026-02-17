import { useState } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
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
import { Badge } from '@/components/ui/badge';
import { Filter, UserPlus, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/types';
import { EditUserDialog } from '@/components/users/EditUserDialog';
import { ResetPasswordDialog } from '@/components/users/ResetPasswordDialog';
import { AddUserDialog } from '@/components/users/AddUserDialog';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => userService.getAll({
        page,
        limit: 10,
        search: search || undefined
    }),
    placeholderData: keepPreviousData,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      userService.toggleStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Status updated", description: "User status has been changed." });
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (error.message || "Failed to update status");
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditOpen(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setResetPwOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    toggleStatusMutation.mutate({ id: user.id, isActive: !user.is_active });
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-foreground">User Management</h2>
           <p className="text-muted-foreground">Manage system users and verify roles.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
        </Button>
      </div>

      <div className="flex gap-2 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1 max-w-sm">
            <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
            />
        </div>
        <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                         <TableCell><div className="h-4 w-8 bg-muted rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-32 bg-muted rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-40 bg-muted rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
                         <TableCell></TableCell>
                    </TableRow>
                ))
            ) : data?.items?.length === 0 ? (
                <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center">No users found.</TableCell>
                </TableRow>
            ) : (
                data?.items?.map((user) => (
                    <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs">#{user.id}</TableCell>
                        <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                            <span className="capitalize">{user.role.replace('_', ' ')}</span>
                        </TableCell>
                        <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'secondary'}
                                   className={user.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0' : 'bg-muted text-muted-foreground border-0'}>
                                {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
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
                                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                                      Edit User
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                      Reset Password
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className={user.is_active ? "text-red-600" : "text-emerald-600"}
                                      onClick={() => handleToggleStatus(user)}
                                    >
                                      {user.is_active ? 'Deactivate' : 'Activate'}
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
        <span className="text-sm text-muted-foreground">
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

      {/* Dialogs */}
      {selectedUser && (
        <>
          <EditUserDialog user={selectedUser} open={editOpen} onOpenChange={setEditOpen} />
          <ResetPasswordDialog user={selectedUser} open={resetPwOpen} onOpenChange={setResetPwOpen} />
        </>
      )}
      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
