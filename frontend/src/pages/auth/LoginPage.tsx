import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@radix-ui/react-label';
import { Loader2, Truck, Package, MapPin, Users } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      // 1. Get Access Token
      const authResponse = await api.post('/login/access-token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const tokenData = authResponse.data;

      // 2. Get User Profile
      const userResponse = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      // 3. Update Store
      login(userResponse.data, tokenData.access_token, tokenData.refresh_token);
      
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Image & Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        
        {/* Floating cards */}
        <div className="absolute top-6 left-6 w-44 h-28 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-3 transform -rotate-12 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium">Orders</span>
          </div>
          <div className="text-3xl font-bold text-white">2,847</div>
          <div className="text-emerald-200 text-sm">+12% this week</div>
        </div>
        
        <div className="absolute bottom-6 right-6 w-48 h-32 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-3 transform rotate-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium">Active Drivers</span>
          </div>
          <div className="text-3xl font-bold text-white">48</div>
          <div className="text-emerald-200 text-sm">Online now</div>
        </div>
        
        <div className="absolute top-1/4 right-6 w-40 h-24 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-3 transform -rotate-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="text-white text-sm font-medium">Deliveries</span>
          </div>
          <div className="text-2xl font-bold text-white">98.5%</div>
          <div className="text-emerald-200 text-xs">Success rate</div>
        </div>
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <Truck className="h-7 w-7 text-emerald-600" />
              </div>
              <span className="text-white text-3xl font-bold">PharmaFleet</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Streamline Your<br />
              Pharmacy Deliveries
            </h1>
            <p className="text-emerald-100 text-lg max-w-md">
              Real-time tracking, smart route optimization, and comprehensive fleet management for modern pharmacy operations.
            </p>
          </div>
          
          {/* Features list */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>Real-time driver tracking</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>Smart order assignment</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>Proof of delivery capture</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo - only visible on small screens */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <span className="text-foreground text-2xl font-bold">PharmaFleet</span>
            </div>
          </div>

          <Card className="w-full shadow-xl border-0 bg-card">
            <CardHeader className="space-y-1 text-center pb-6">
              <CardTitle className="text-2xl font-bold text-foreground">Welcome back</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 border-border focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                    <a href="#" className="text-sm text-emerald-600 hover:text-emerald-500 font-medium transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-border focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                </div>
                
                {error && (
                  <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
              
              {/* Demo credentials hint */}
              <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                <p className="text-xs text-muted-foreground text-center">
                  <span className="font-medium text-foreground">Demo credentials:</span><br />
                  admin@pharmafleet.com / admin123
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-border py-4 bg-muted/50">
              <p className="text-xs text-muted-foreground">
                Protected by PharmaFleet Security
              </p>
            </CardFooter>
          </Card>
          
          {/* Additional info */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Need help? Contact <a href="mailto:support@pharmafleet.com" className="text-emerald-600 hover:text-emerald-500 font-medium">support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
