import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Need to create Tabs
import { useAuthStore } from '@/store/useAuthStore';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
       <div>
           <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
           <p className="text-muted-foreground">Manage your account and preferences.</p>
       </div>

       <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="appearance" disabled>Appearance</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="mt-6 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your profile details here.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" defaultValue={user?.full_name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" defaultValue={user?.email} disabled />
                        </div>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                         <CardTitle>Change Password</CardTitle>
                         <CardDescription>Ensure your account uses a strong password.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid gap-2">
                             <Label htmlFor="current">Current Password</Label>
                             <Input id="current" type="password" />
                         </div>
                         <div className="grid gap-2">
                             <Label htmlFor="new">New Password</Label>
                             <Input id="new" type="password" />
                         </div>
                         <Button variant="secondary">Update Password</Button>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="notifications" className="mt-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>Manage how you receive alerts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                             Notification settings logic will be implemented here.
                        </div>
                    </CardContent>
                 </Card>
            </TabsContent>
       </Tabs>
    </div>
  );
}
