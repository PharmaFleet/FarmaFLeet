import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/shared/StatusBadge';
import { OrderStatus } from '../types';

describe('StatusBadge', () => {
  it('renders pending status correctly', () => {
    render(<StatusBadge status={OrderStatus.PENDING} />);
    expect(screen.getByText(/pending/i)).toBeDefined();
  });

  it('renders assigned status correctly', () => {
    render(<StatusBadge status={OrderStatus.ASSIGNED} />);
    expect(screen.getByText(/assigned/i)).toBeDefined();
  });
});
