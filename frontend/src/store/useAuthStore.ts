import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  role: string;
  full_name: string;
  // Add other user fields as needed
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (user: User, token: string, refreshToken: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, token, refreshToken) => set({ 
        user, 
        token, 
        refreshToken, 
        isAuthenticated: true 
      }),
      
      setToken: (token) => set({ token }),
      
      logout: () => set({ 
        user: null, 
        token: null, 
        refreshToken: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'pharmafleet-auth', // key in localStorage
      partialize: (state) => ({ 
        token: state.token, 
        refreshToken: state.refreshToken, 
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }), // Persist important fields
    }
  )
);
