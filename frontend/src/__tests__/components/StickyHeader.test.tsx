/**
 * Test Suite for Orders Page Sticky Header Fix (Task 3)
 * =====================================================
 * Verifies that header cells have opaque backgrounds for sticky scrolling.
 */

import { describe, it, expect } from 'vitest';

describe('Orders Page Sticky Header (Task 3)', () => {
  it('TableHeader should have sticky and bg-muted classes', async () => {
    // Read the actual source to verify class presence
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../../pages/orders/OrdersPage.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    // Verify TableHeader has sticky and shadow classes
    expect(source).toContain('sticky top-0 z-20 bg-muted shadow-[0_1px_0_0_hsl(var(--border))]');
  });

  it('TableRow in header should not have hover:bg-transparent', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../../pages/orders/OrdersPage.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    // The header TableRow should NOT have hover:bg-transparent
    // It should use [&:hover]:bg-muted to ensure opacity on hover
    expect(source).not.toContain('hover:bg-transparent');
    expect(source).toContain('[&:hover]:bg-muted');
  });

  it('SortableTableHead style should include inline backgroundColor fallback', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../../pages/orders/OrdersPage.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    // Verify inline backgroundColor fallback on header cells
    expect(source).toContain("backgroundColor: 'hsl(var(--muted))'");
  });

  it('should apply bg-muted class to all header cell types', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../../pages/orders/OrdersPage.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    // The stickyClass variable should be defined as bg-muted
    expect(source).toContain('const stickyClass = "bg-muted"');
  });
});
