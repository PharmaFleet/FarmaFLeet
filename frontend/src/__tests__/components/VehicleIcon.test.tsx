/**
 * Test Suite for VehicleIcon Component
 * =====================================
 * Tests for the VehicleIcon shared component that renders
 * Car or Bike icons based on vehicleType prop.
 *
 * Covers:
 * - Default rendering (Car icon with blue color)
 * - vehicleType="car" rendering
 * - vehicleType="motorcycle" rendering (Bike icon with orange color)
 * - Unknown vehicleType fallback to Car
 * - Custom className application
 * - Custom size prop
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { VehicleIcon } from '@/components/shared/VehicleIcon';

describe('VehicleIcon Component', () => {
  describe('Default Rendering', () => {
    it('renders Car icon by default (no vehicleType)', () => {
      const { container } = render(<VehicleIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('text-blue-500');
    });

    it('renders Car icon for vehicleType="car"', () => {
      const { container } = render(<VehicleIcon vehicleType="car" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('text-blue-500');
    });
  });

  describe('Motorcycle Rendering', () => {
    it('renders Bike icon for vehicleType="motorcycle"', () => {
      const { container } = render(<VehicleIcon vehicleType="motorcycle" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('text-orange-500');
    });
  });

  describe('Unknown Vehicle Type', () => {
    it('renders Car icon for unknown vehicleType', () => {
      const { container } = render(<VehicleIcon vehicleType="truck" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('text-blue-500');
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(<VehicleIcon className="custom-class" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('custom-class');
      // Should still have the default color class
      expect(svg).toHaveClass('text-blue-500');
    });

    it('uses custom size', () => {
      const { container } = render(<VehicleIcon size={24} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });
  });
});
