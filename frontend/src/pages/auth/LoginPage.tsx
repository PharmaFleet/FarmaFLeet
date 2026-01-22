import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@radix-ui/react-label'; // Need to install or use primitive
import { Loader2, Truck } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call for now (Replace with real API later)
    setTimeout(() => {
        // Mock success
        login(
          { id: 1, email: 'admin@pharmafleet.com', role: 'admin', full_name: 'System Admin' },
          'mock-jwt-token',
          'mock-refresh-token'
        );
        navigate('/');
        setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-1 text-center pb-8 border-b bg-white rounded-t-lg">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
              <Truck className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Sign in to PharmaFleet</CardTitle>
          <CardDescription>Enter your credentials to access the dashboard</CardDescription>
        </CardHeader>
        <CardContent className="pt-8 bg-white rounded-b-lg">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@company.com" required />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="#" className="text-xs text-emerald-600 hover:text-emerald-500 font-medium">Forgot password?</a>
                </div>
              <Input id="password" type="password" required />
            </div>
            
            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4 bg-slate-50 rounded-b-lg text-xs text-slate-500">
           Protected by PharmaFleet Security
        </CardFooter>
      </Card>
    </div>
  );
}
