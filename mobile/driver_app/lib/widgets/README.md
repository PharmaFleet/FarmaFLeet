# Widget Component Library

This directory contains the core widget components for the PharmaFleet Driver app. These components are built using the established theme system and follow Material Design 3 principles.

## Available Components

### 1. CardContainer
A versatile card container with consistent padding and border radius.

**Usage:**
```dart
CardContainer(
  child: Column(
    children: [
      Text('Card Title'),
      Text('Card content...'),
    ],
  ),
)
```

**Variants:**
- `CardContainer` - Basic card with shadow
- `BorderedCardContainer` - Card with visible border
- `HighlightedCardContainer` - Card with primary color accent

### 2. StatusBadge
A compact colored badge for status indicators and labels.

**Usage:**
```dart
StatusBadge(
  text: 'Active',
  type: StatusType.success,
)

// Using factory constructors
StatusBadge.orders('Pending', isCompact: true)
StatusBadge.drivers('Available')
StatusBadge.payments('Completed')
```

**Status Types:**
- `success`, `error`, `warning`, `info`, `neutral`
- `orders`, `drivers`, `payments`, `analytics`, `delivery`
- `failed`, `cancelled`

### 3. AppButton
A versatile button component with multiple variants and states.

**Usage:**
```dart
AppButton.primary(
  text: 'Submit',
  onPressed: () => handleSubmit(),
  isLoading: false,
)

// Different variants
AppButton.secondary(text: 'Cancel', onPressed: () {})
AppButton.outline(text: 'Edit', onPressed: {})
AppButton.destructive(text: 'Delete', onPressed: {})
AppButton.ghost(text: 'Link', onPressed: {})
```

**Variants:**
- `primary`, `secondary`, `outline`, `destructive`, `ghost`
- Sizes: `small`, `medium`, `large`
- Supports icons, loading states, full width

### 4. StatCard
A dashboard metric display component.

**Usage:**
```dart
StatCard(
  title: 'Total Orders',
  value: '1,234',
  description: '+12% from last month',
  icon: Icons.shopping_cart,
  trend: '+15%',
  trendType: TrendType.up,
  onTap: () => viewOrderDetails(),
)

// Specialized variants
FinancialStatCard(
  title: 'Revenue',
  amount: 45678.90,
  changeAmount: 1234.56,
  isPositiveChange: true,
)

CountStatCard(
  title: 'Active Drivers',
  count: 42,
  changeCount: 5,
  isPositiveChange: true,
  icon: Icons.person,
  color: AppColors.drivers,
)
```

### 5. MiniMapView
A compact map container for displaying locations and markers.

**Usage:**
```dart
MiniMapView(
  initialPosition: LatLng(37.7749, -122.4194),
  markers: {
    Marker(
      markerId: MarkerId('location'),
      position: LatLng(37.7749, -122.4194),
    ),
  },
  height: 200,
  showZoomControls: false,
)

// Specialized variants
DeliveryMapView(
  destination: LatLng(37.7749, -122.4194),
  currentPosition: currentLocation,
  routePoints: routeCoordinates,
  onDestinationTap: () => showDeliveryDetails(),
)

LocationPinView(
  position: LatLng(37.7749, -122.4194),
  title: 'Delivery Location',
  subtitle: '123 Main St',
  onTap: () => openMaps(),
)
```

### 6. ActivityItem
An item in the Recent Activity feed.

**Usage:**
```dart
ActivityItem(
  title: 'Order #1234 Completed',
  description: 'Delivered to John Doe',
  timestamp: '2 hours ago',
  icon: Icons.check_circle,
  status: 'Completed',
  type: ActivityType.order,
  onTap: () => viewOrderDetails(),
)

// Specialized variants
OrderActivityItem(
  orderId: 'ORD-1234',
  status: 'Delivered',
  customerName: 'John Doe',
  amount: 45.67,
  timestamp: '1 hour ago',
)

PaymentActivityItem(
  amount: 123.45,
  status: 'Completed',
  orderId: 'ORD-5678',
  paymentMethod: 'Credit Card',
  timestamp: '30 minutes ago',
)

DriverActivityItem(
  driverName: 'Sarah Wilson',
  description: 'Started delivery for order #4567',
  status: 'Active',
  timestamp: '10 minutes ago',
)
```

### 7. OrderCard
A list item for displaying orders with status badges and actions.

**Usage:**
```dart
OrderCard(
  orderId: 'ORD-1234',
  customerName: 'John Doe',
  customerAddress: '123 Main St, City, State',
  amount: 45.67,
  status: 'Pending',
  priority: OrderPriority.normal,
  onTap: () => viewOrderDetails(),
  onAccept: () => acceptOrder(),
  onReject: () => rejectOrder(),
)

// Compact variant
OrderCard.compact(
  orderId: 'ORD-5678',
  customerName: 'Jane Smith',
  customerAddress: '456 Oak Ave',
  amount: 78.90,
  status: 'Completed',
  onTap: () => viewOrderDetails(),
)
```

## Theme Integration

All components use the established theme system:

- **Colors**: `AppColors` class for consistent color palette
- **Spacing**: `AppSpacing` class for consistent margins and padding
- **Typography**: `AppTextStyles` class for consistent text styling
- **Border Radius**: `AppSpacing.radius*` for consistent corner rounding

## Accessibility Features

- Semantic labels for screen readers
- Proper focus handling for interactive elements
- High contrast color combinations
- Support for large text scaling
- RTL (Right-to-Left) layout support

## Testing

Each component has comprehensive unit tests covering:
- Widget rendering and styling
- User interactions
- Accessibility features
- Edge cases and error states
- Loading states

Run tests with:
```bash
flutter test test/widgets/
```

## Best Practices

1. **Consistency**: Use the established theme system for all styling
2. **Accessibility**: Always provide semantic labels for interactive elements
3. **Responsive**: Design for different screen sizes and orientations
4. **Performance**: Use `const` constructors where possible
5. **Testing**: Write tests for custom components and variants
6. **Documentation**: Include usage examples in component files

## Component Variants

Many components have factory constructors for common use cases:
- `StatusBadge.orders()`, `StatusBadge.drivers()`, etc.
- `AppButton.primary()`, `AppButton.secondary()`, etc.
- `FinancialStatCard()`, `CountStatCard()` for specific data types
- `OrderActivityItem()`, `PaymentActivityItem()` for specific activity types

## Error Handling

Components handle edge cases gracefully:
- Loading states with skeleton UI
- Error states with fallback content
- Empty states with appropriate messaging
- Network error handling for map components

## Performance Considerations

- Use `const` constructors for static widgets
- Implement proper disposal for animation controllers
- Optimize list rendering with appropriate widgets
- Minimize widget rebuilds with proper state management