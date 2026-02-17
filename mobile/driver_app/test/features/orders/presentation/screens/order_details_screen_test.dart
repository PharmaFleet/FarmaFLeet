import 'package:driver_app/features/orders/domain/entities/order_entity.dart';
import 'package:driver_app/features/orders/domain/repositories/order_repository.dart';
import 'package:driver_app/features/orders/presentation/screens/order_details_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';

/// Tests for OrderDetailsScreen
///
/// Covers:
/// - AppBar shows SO# when salesOrderNumber exists
/// - AppBar falls back to "Order #ID" when salesOrderNumber is null
/// - Return order button visible only for DELIVERED orders
/// - Return dialog has reason text field

final sl = GetIt.instance;

class MockOrderRepository implements OrderRepository {
  final OrderEntity? orderToReturn;
  bool returnOrderCalled = false;
  String? lastReturnReason;

  MockOrderRepository({this.orderToReturn});

  @override
  Future<OrderEntity> getOrderDetails(int id) async {
    if (orderToReturn != null) return orderToReturn!;
    throw Exception('Order not found');
  }

  @override
  Future<List<OrderEntity>> getOrders({String? statusFilter}) async => [];

  @override
  Future<void> updateOrderStatus(int id, String status,
      {String? notes}) async {}

  @override
  Future<String> uploadFile(String filePath) async => 'http://example.com/photo.jpg';

  @override
  Future<void> submitProofOfDelivery(
      int id, String photoUrl, String? signatureUrl) async {}

  @override
  Future<Map<String, dynamic>> batchPickupOrders(List<int> orderIds) async =>
      {'updated_count': orderIds.length};

  @override
  Future<Map<String, dynamic>> batchDeliveryOrders(
          List<int> orderIds, List<Map<String, dynamic>>? proofs) async =>
      {'updated_count': orderIds.length};

  @override
  Future<void> returnOrder(int id, String reason) async {
    returnOrderCalled = true;
    lastReturnReason = reason;
  }

  @override
  Future<void> updatePaymentMethod(int id, String method) async {}
}

Widget buildTestWidget(Widget child) {
  return ScreenUtilInit(
    designSize: const Size(375, 812),
    minTextAdapt: true,
    builder: (context, _) => MaterialApp(
      home: child,
    ),
  );
}

void main() {
  late MockOrderRepository mockRepo;

  setUp(() {
    // Reset GetIt for each test
    if (sl.isRegistered<OrderRepository>()) {
      sl.unregister<OrderRepository>();
    }
  });

  tearDown(() {
    if (sl.isRegistered<OrderRepository>()) {
      sl.unregister<OrderRepository>();
    }
  });

  group('OrderDetailsScreen - AppBar SO# Display', () {
    testWidgets('AppBar shows salesOrderNumber when available', (tester) async {
      mockRepo = MockOrderRepository(
        orderToReturn: OrderEntity(
          id: 42,
          salesOrderNumber: 'SO-99999',
          customerInfo: {'name': 'Test', 'phone': '123', 'address': 'Addr'},
          paymentMethod: 'CASH',
          totalAmount: 15.0,
          status: 'assigned',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          warehouseId: 1,
        ),
      );
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '42'),
      ));

      // Initially shows fallback while loading
      expect(find.text('Order #42'), findsOneWidget);

      // Wait for future to complete
      await tester.pumpAndSettle();

      // Now should show the SO#
      expect(find.text('SO-99999'), findsOneWidget);
    });

    testWidgets('AppBar shows "Order #ID" when salesOrderNumber is null',
        (tester) async {
      mockRepo = MockOrderRepository(
        orderToReturn: OrderEntity(
          id: 55,
          salesOrderNumber: null,
          customerInfo: {'name': 'Test', 'phone': '123', 'address': 'Addr'},
          paymentMethod: 'CASH',
          totalAmount: 10.0,
          status: 'pending',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          warehouseId: 1,
        ),
      );
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '55'),
      ));
      await tester.pumpAndSettle();

      // Should keep showing "Order #55" since SO# is null
      expect(find.text('Order #55'), findsOneWidget);
    });
  });

  group('OrderDetailsScreen - Return Order Flow', () {
    testWidgets('Return Order button visible for delivered orders',
        (tester) async {
      mockRepo = MockOrderRepository(
        orderToReturn: OrderEntity(
          id: 10,
          salesOrderNumber: 'SO-DELIVERED',
          customerInfo: {
            'name': 'Customer',
            'phone': '999',
            'address': 'Address'
          },
          paymentMethod: 'CASH',
          totalAmount: 20.0,
          status: 'delivered',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          warehouseId: 1,
        ),
      );
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '10'),
      ));
      await tester.pumpAndSettle();

      // Return Order button should be visible for delivered status
      expect(find.text('Return Order'), findsOneWidget);
    });

    testWidgets('Return Order button NOT visible for pending orders',
        (tester) async {
      mockRepo = MockOrderRepository(
        orderToReturn: OrderEntity(
          id: 11,
          salesOrderNumber: 'SO-PENDING',
          customerInfo: {
            'name': 'Customer',
            'phone': '999',
            'address': 'Address'
          },
          paymentMethod: 'CASH',
          totalAmount: 20.0,
          status: 'pending',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          warehouseId: 1,
        ),
      );
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '11'),
      ));
      await tester.pumpAndSettle();

      // Return Order button should NOT be visible for non-delivered status
      expect(find.text('Return Order'), findsNothing);
    });

    testWidgets('Return Order button NOT visible for cancelled orders',
        (tester) async {
      mockRepo = MockOrderRepository(
        orderToReturn: OrderEntity(
          id: 12,
          salesOrderNumber: 'SO-CANCELLED',
          customerInfo: {
            'name': 'Customer',
            'phone': '999',
            'address': 'Address'
          },
          paymentMethod: 'CASH',
          totalAmount: 20.0,
          status: 'cancelled',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          warehouseId: 1,
        ),
      );
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '12'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Return Order'), findsNothing);
    });

    testWidgets('Return dialog opens with reason text field', (tester) async {
      mockRepo = MockOrderRepository(
        orderToReturn: OrderEntity(
          id: 13,
          salesOrderNumber: 'SO-RETURN-TEST',
          customerInfo: {
            'name': 'Customer',
            'phone': '999',
            'address': 'Address'
          },
          paymentMethod: 'CASH',
          totalAmount: 20.0,
          status: 'delivered',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          warehouseId: 1,
        ),
      );
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '13'),
      ));
      await tester.pumpAndSettle();

      // Tap Return Order button to open dialog
      await tester.tap(find.text('Return Order'));
      await tester.pumpAndSettle();

      // Dialog should have title and text field
      // The dialog is an AlertDialog with title "Return Order"
      // and a TextField with label "Return Reason"
      expect(find.text('Return Reason'), findsOneWidget);
      expect(find.text('Enter reason...'), findsOneWidget);
    });

    testWidgets('Return dialog submits reason', (tester) async {
      mockRepo = MockOrderRepository(
        orderToReturn: OrderEntity(
          id: 14,
          salesOrderNumber: 'SO-SUBMIT-TEST',
          customerInfo: {
            'name': 'Customer',
            'phone': '999',
            'address': 'Address'
          },
          paymentMethod: 'CASH',
          totalAmount: 20.0,
          status: 'delivered',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          warehouseId: 1,
        ),
      );
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '14'),
      ));
      await tester.pumpAndSettle();

      // Open return dialog
      await tester.tap(find.text('Return Order'));
      await tester.pumpAndSettle();

      // Type reason
      final textField = find.byType(TextField);
      await tester.enterText(textField, 'Customer refused delivery');
      await tester.pumpAndSettle();

      // Find and tap the "Return Order" button inside the dialog
      // There are two "Return Order" texts - the button label in dialog actions
      final returnButtons = find.text('Return Order');
      // The dialog's ElevatedButton is the last one
      await tester.tap(returnButtons.last);
      await tester.pumpAndSettle();

      // Verify the repository was called with the reason
      expect(mockRepo.returnOrderCalled, isTrue);
      expect(mockRepo.lastReturnReason, 'Customer refused delivery');
    });
  });

  group('OrderDetailsScreen - Error Handling', () {
    testWidgets('shows error message when order fails to load',
        (tester) async {
      mockRepo = MockOrderRepository(orderToReturn: null);
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '999'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Error loading order'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });

  group('OrderDetailsScreen - Status Action Buttons', () {
    testWidgets('shows Pick Up Order for assigned status', (tester) async {
      mockRepo = MockOrderRepository(
        orderToReturn: OrderEntity(
          id: 20,
          salesOrderNumber: 'SO-ASSIGNED',
          customerInfo: {
            'name': 'Customer',
            'phone': '999',
            'address': 'Address'
          },
          paymentMethod: 'CASH',
          totalAmount: 20.0,
          status: 'assigned',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          warehouseId: 1,
        ),
      );
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '20'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Pick Up Order'), findsOneWidget);
    });

    testWidgets('shows Start Delivery for picked_up status', (tester) async {
      mockRepo = MockOrderRepository(
        orderToReturn: OrderEntity(
          id: 21,
          salesOrderNumber: 'SO-PICKEDUP',
          customerInfo: {
            'name': 'Customer',
            'phone': '999',
            'address': 'Address'
          },
          paymentMethod: 'CASH',
          totalAmount: 20.0,
          status: 'picked_up',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          warehouseId: 1,
        ),
      );
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '21'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Start Delivery'), findsOneWidget);
    });

    testWidgets('shows Complete Delivery for out_for_delivery status',
        (tester) async {
      mockRepo = MockOrderRepository(
        orderToReturn: OrderEntity(
          id: 22,
          salesOrderNumber: 'SO-OFD',
          customerInfo: {
            'name': 'Customer',
            'phone': '999',
            'address': 'Address'
          },
          paymentMethod: 'CASH',
          totalAmount: 20.0,
          status: 'out_for_delivery',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          warehouseId: 1,
        ),
      );
      sl.registerSingleton<OrderRepository>(mockRepo);

      await tester.pumpWidget(buildTestWidget(
        const OrderDetailsScreen(orderId: '22'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Complete Delivery'), findsOneWidget);
    });
  });
}
