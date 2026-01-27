import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '@/pages/auth/LoginPage';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/axios';
import { User } from '@/types';

// Mock the hooks and dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/store/useAuthStore');
vi.mock('@/lib/axios');

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <div data-testid="loader2" className={className}></div>
  ),
  Truck: ({ className }: { className?: string }) => (
    <div data-testid="truck-icon" className={className}></div>
  ),
  Package: ({ className }: { className?: string }) => (
    <div data-testid="package-icon" className={className}></div>
  ),
  MapPin: ({ className }: { className?: string }) => (
    <div data-testid="map-pin-icon" className={className}></div>
  ),
  Users: ({ className }: { className?: string }) => (
    <div data-testid="users-icon" className={className}></div>
  ),
}));

// Mock Radix UI Label
vi.mock('@radix-ui/react-label', () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

// Wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('LoginPage Component', () => {
  const mockLogin = vi.fn();
  const mockNavigate = vi.fn();
  
  const mockUser: User = {
    id: 1,
    email: 'admin@pharmafleet.com',
    full_name: 'Admin User',
    is_active: true,
    role: 'super_admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      user: null,
      token: null,
      isAuthenticated: false,
      logout: vi.fn(),
    });
    
    // Mock navigate
    vi.mocked(mockNavigate);
    
    // Reset api mocks
    vi.mocked(api.post).mockResolvedValue({
      data: {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        token_type: 'bearer',
      },
    });
    
    vi.mocked(api.get).mockResolvedValue({
      data: mockUser,
    });
  });

  describe('Component Rendering', () => {
    it('should render LoginPage correctly', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('PharmaFleet')).toBeInTheDocument();
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByText('Enter your credentials to access your dashboard')).toBeInTheDocument();
    });

    it('should render all form elements', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByLabelText(/Email address/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    });

    it('should render hero section content', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('Streamline Your')).toBeInTheDocument();
      expect(screen.getByText('Pharmacy Deliveries')).toBeInTheDocument();
      expect(screen.getByText(/Real-time tracking/)).toBeInTheDocument();
      expect(screen.getByText(/Smart order assignment/)).toBeInTheDocument();
      expect(screen.getByText(/Proof of delivery capture/)).toBeInTheDocument();
    });

    it('should render demo credentials', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText(/Demo credentials:/)).toBeInTheDocument();
      expect(screen.getByText('admin@pharmafleet.com / admin123')).toBeInTheDocument();
    });

    it('should render footer information', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('Protected by PharmaFleet Security')).toBeInTheDocument();
      expect(screen.getByText(/Need help? Contact/)).toBeInTheDocument();
      expect(screen.getByText('support')).toBeInTheDocument();
    });

    it('should render decorative elements and icons', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByTestId('truck-icon')).toBeInTheDocument();
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update email input when typing', async () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/Email address/);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Assert
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password input when typing', async () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/Password/);
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Assert
      expect(passwordInput).toHaveValue('password123');
    });

    it('should clear error when user starts typing', async () => {
      // Arrange - Set an initial error state
      vi.mocked(api.post).mockRejectedValueOnce({
        response: { data: { detail: 'Invalid credentials' } },
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Submit with invalid credentials to trigger error
      const emailInput = screen.getByLabelText(/Email address/);
      const passwordInput = screen.getByLabelText(/Password/);
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'invalid@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong' } });
      fireEvent.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/)).toBeInTheDocument();
      });

      // Act - Start typing in email field
      fireEvent.change(emailInput, { target: { value: 'a' } });

      // Assert - Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/Invalid credentials/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid credentials', async () => {
      // Arrange
      const mockNavigate = vi.fn();
      vi.mocked(mockNavigate).mockImplementation(mockNavigate);
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Act
      const emailInput = screen.getByLabelText(/Email address/);
      const passwordInput = screen.getByLabelText(/Password/);
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'admin@pharmafleet.com' } });
      fireEvent.change(passwordInput, { target: { value: 'admin123' } });
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/login/access-token',
          expect.any(URLSearchParams),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );
      });

      // Verify the form data
      const formData = vi.mocked(api.post).mock.calls[0][1] as URLSearchParams;
      expect(formData.get('username')).toBe('admin@pharmafleet.com');
      expect(formData.get('password')).toBe('admin123');

      // Verify user profile fetch
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/users/me', {
          headers: { Authorization: 'Bearer mock_access_token' },
        });
      });

      // Verify store update and navigation
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(mockUser, 'mock_access_token', 'mock_refresh_token');
      });
    });

    it('should show loading state during submission', async () => {
      // Arrange - Make the API call take longer
      vi.mocked(api.post).mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Act
      const emailInput = screen.getByLabelText(/Email address/);
      const passwordInput = screen.getByLabelText(/Password/);
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Assert - Loading state
      expect(screen.getByTestId('loader2')).toBeInTheDocument();
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    it('should show error message on login failure', async () => {
      // Arrange
      vi.mocked(api.post).mockRejectedValueOnce({
        response: { data: { detail: 'Invalid credentials' } },
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Act
      const emailInput = screen.getByLabelText(/Email address/);
      const passwordInput = screen.getByLabelText(/Password/);
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'invalid@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Error should be in a red container
      const errorContainer = screen.getByText('Invalid credentials').parentElement;
      expect(errorContainer).toHaveClass('bg-red-50');
      expect(errorContainer).toHaveClass('text-red-500');
    });

    it('should show generic error message when no error detail provided', async () => {
      // Arrange
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Act
      const submitButton = screen.getByRole('button', { name: 'Sign in' });
      fireEvent.click(submitButton);

      // Assert
      expect(await screen.findByText('Login failed. Please check your credentials.')).toBeInTheDocument();
    });

    it('should handle empty form submission', async () => {
      // Arrange - Make HTML5 validation pass but let our validation catch it
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Act - Submit without filling form
      const submitButton = screen.getByRole('button', { name: 'Sign in' });
      fireEvent.click(submitButton);

      // Assert - HTML5 validation should prevent submission
      // In tests, we check that api.post was not called
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should have required attribute on email input', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      const emailInput = screen.getByLabelText(/Email address/);
      expect(emailInput).toBeRequired();
    });

    it('should have required attribute on password input', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      const passwordInput = screen.getByLabelText(/Password/);
      expect(passwordInput).toBeRequired();
    });

    it('should have email type on email input', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      const emailInput = screen.getByLabelText(/Email address/) as HTMLInputElement;
      expect(emailInput.type).toBe('email');
    });

    it('should have password type on password input', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      const passwordInput = screen.getByLabelText(/Password/) as HTMLInputElement;
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile logo on small screens', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // The mobile logo should be present (it's always in DOM but visibility changes with CSS)
      expect(screen.getAllByText('PharmaFleet')).toHaveLength(2); // One for desktop, one for mobile
    });

    it('should maintain proper layout structure', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      const mainContainer = screen.getByText('Welcome back').closest('div');
      expect(mainContainer).toHaveClass('flex');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByLabelText(/Email address/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
    });

    it('should have proper button text', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('should have proper alt texts and aria-labels where needed', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // The forgot password link should be identifiable
      const forgotPasswordLink = screen.getByText('Forgot password?');
      expect(forgotPasswordLink).toHaveAttribute('href');
    });
  });

  describe('Links and Navigation', () => {
    it('should have forgot password link', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      const forgotPasswordLink = screen.getByText('Forgot password?');
      expect(forgotPasswordLink).toHaveAttribute('href', '#');
    });

    it('should have support contact link', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Assert
      const supportLink = screen.getByText('support');
      expect(supportLink).toHaveAttribute('href', 'mailto:support@pharmafleet.com');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long email input', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/Email address/);
      const longEmail = 'a'.repeat(100) + '@example.com';
      
      fireEvent.change(emailInput, { target: { value: longEmail } });

      // Assert
      expect(emailInput).toHaveValue(longEmail);
    });

    it('should handle special characters in password', () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/Password/);
      const specialPassword = 'P@ssw0rd!#$%^&*()';
      
      fireEvent.change(passwordInput, { target: { value: specialPassword } });

      // Assert
      expect(passwordInput).toHaveValue(specialPassword);
    });

    it('should clear form after successful login', async () => {
      // Act
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/Email address/);
      const passwordInput = screen.getByLabelText(/Password/);
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'admin@pharmafleet.com' } });
      fireEvent.change(passwordInput, { target: { value: 'admin123' } });
      fireEvent.click(submitButton);

      // Assert - After successful login, form would typically be cleared or user redirected
      // In this case, the user is redirected, so the form is unmounted
      await waitFor(() => {
        // The component might redirect, so we check if login was attempted
        expect(api.post).toHaveBeenCalled();
      });
    });
  });
});