import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService, LoginRequest, LoginResponse } from '@/services/authService';
import { api } from '@/lib/axios';

// Mock the axios instance
vi.mock('@/lib/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear localStorage after each test
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockLoginResponse: LoginResponse = {
        access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
        refresh_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
        token_type: 'bearer',
        user: null, // Will be replaced by getCurrentUser
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        role: 'warehouse_manager',
      };

      vi.mocked(api.post)
        .mockResolvedValueOnce({ data: mockLoginResponse })
        .mockResolvedValueOnce({ data: mockUser }); // For getCurrentUser call

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(api.post).toHaveBeenCalledWith(
        '/login/access-token',
        expect.any(URLSearchParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Verify URLSearchParams contains correct data
      const paramsCall = vi.mocked(api.post).mock.calls[0][1] as URLSearchParams;
      expect(paramsCall.get('username')).toBe(credentials.email);
      expect(paramsCall.get('password')).toBe(credentials.password);

      expect(result).toEqual({
        ...mockLoginResponse,
        user: mockUser,
      });
    });

    it('should handle invalid credentials', async () => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      const error = new Error('Invalid credentials');
      (error as any).response = { status: 401, data: { detail: 'Invalid credentials' } };
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors during login', async () => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      const networkError = new Error('Network error');
      vi.mocked(api.post).mockRejectedValue(networkError);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Network error');
    });

    it('should handle empty credentials', async () => {
      // Arrange
      const credentials: LoginRequest = {
        email: '',
        password: '',
      };

      const error = new Error('Email and password are required');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Email and password are required');
    });

    it('should handle malformed email', async () => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'invalid-email',
        password: 'password123',
      };

      const error = new Error('Invalid email format');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Invalid email format');
    });

    it('should handle user fetch failure after successful login', async () => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockLoginResponse: LoginResponse = {
        access_token: 'token',
        refresh_token: 'refresh',
        token_type: 'bearer',
        user: null,
      };

      vi.mocked(api.post)
        .mockResolvedValueOnce({ data: mockLoginResponse })
        .mockRejectedValueOnce(new Error('Failed to fetch user details'));

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Failed to fetch user details');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Arrange
      const mockResponse = { message: 'Successfully logged out' };
      vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

      // Act
      await authService.logout();

      // Assert
      expect(api.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('should handle logout errors gracefully', async () => {
      // Arrange
      const error = new Error('Logout failed');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.logout()).rejects.toThrow('Logout failed');
    });

    it('should handle network timeout during logout', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      vi.mocked(api.post).mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(authService.logout()).rejects.toThrow('Request timeout');
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user details', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        role: 'warehouse_manager',
        warehouse_id: 1,
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockUser });

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(api.get).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockUser);
    });

    it('should handle unauthorized access', async () => {
      // Arrange
      const error = new Error('Unauthorized');
      (error as any).response = { status: 401, data: { detail: 'Not authenticated' } };
      vi.mocked(api.get).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
    });

    it('should handle token expiration', async () => {
      // Arrange
      const error = new Error('Token has expired');
      (error as any).response = { status: 401, data: { detail: 'Token has expired' } };
      vi.mocked(api.get).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow('Token has expired');
    });

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network error');
      vi.mocked(api.get).mockRejectedValue(networkError);

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow('Network error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null credentials', async () => {
      // Arrange
      const credentials = null as any;
      const error = new Error('Credentials cannot be null');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Credentials cannot be null');
    });

    it('should handle undefined credentials', async () => {
      // Arrange
      const credentials = undefined as any;
      const error = new Error('Credentials are required');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Credentials are required');
    });

    it('should handle very long password', async () => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'a'.repeat(1000), // Very long password
      };

      const error = new Error('Password too long');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Password too long');
    });

    it('should handle special characters in email', async () => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'test+alias@example.com',
        password: 'password123',
      };

      const mockLoginResponse: LoginResponse = {
        access_token: 'token',
        refresh_token: 'refresh',
        token_type: 'bearer',
        user: null,
      };

      const mockUser = {
        id: 1,
        email: credentials.email,
        full_name: 'Test User',
        is_active: true,
        role: 'user',
      };

      vi.mocked(api.post)
        .mockResolvedValueOnce({ data: mockLoginResponse })
        .mockResolvedValueOnce({ data: mockUser });

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.user.email).toBe(credentials.email);
    });

    it('should handle server error responses', async () => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      const serverError = new Error('Internal Server Error');
      (serverError as any).response = { 
        status: 500, 
        data: { 
          detail: 'Internal server error',
          error_code: 'SERVER_ERROR'
        } 
      };
      vi.mocked(api.post).mockRejectedValue(serverError);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Internal Server Error');
    });

    it('should handle concurrent login requests', async () => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockLoginResponse: LoginResponse = {
        access_token: 'token1',
        refresh_token: 'refresh1',
        token_type: 'bearer',
        user: null,
      };

      const mockUser = {
        id: 1,
        email: credentials.email,
        full_name: 'Test User',
        is_active: true,
        role: 'user',
      };

      // Setup mock to handle multiple calls
      vi.mocked(api.post)
        .mockResolvedValue({ data: mockLoginResponse })
        .mockResolvedValue({ data: mockUser });

      // Act - Make multiple concurrent login requests
      const [result1, result2] = await Promise.all([
        authService.login(credentials),
        authService.login({ ...credentials, password: 'different' }),
      ]);

      // Assert
      expect(result1.user).toEqual(mockUser);
      expect(api.post).toHaveBeenCalledTimes(4); // 2 login + 2 getCurrentUser calls
    });
  });
});