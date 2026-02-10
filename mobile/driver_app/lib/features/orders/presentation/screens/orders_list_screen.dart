import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection_container.dart' as di;
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/skeleton_order_card.dart';
import '../../domain/entities/order_entity.dart';
import '../bloc/orders_bloc.dart';
import '../widgets/order_card.dart';

/// Enum representing the three order tab types
enum OrderTabType {
  assigned,  // status == 'assigned'
  active,    // status in ['picked_up', 'in_transit', 'out_for_delivery']
  history,   // terminal statuses: delivered, cancelled, rejected, returned
}

class OrdersListScreen extends StatelessWidget {
  const OrdersListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => di.sl<OrdersBloc>()..add(const FetchOrders(statusFilter: null)), // Fetch all orders
      child: const OrdersListView(),
    );
  }
}

class OrdersListView extends StatefulWidget {
  const OrdersListView({super.key});

  @override
  State<OrdersListView> createState() => _OrdersListViewState();
}

class _OrdersListViewState extends State<OrdersListView> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Selection mode state
  bool _isSelectionMode = false;
  final Set<int> _selectedOrderIds = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
  }

  void _onTabChanged() {
    // Clear selection when switching tabs
    if (_tabController.indexIsChanging) {
      setState(() {
        _isSelectionMode = false;
        _selectedOrderIds.clear();
      });
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _toggleSelectionMode() {
    setState(() {
      _isSelectionMode = !_isSelectionMode;
      if (!_isSelectionMode) {
        _selectedOrderIds.clear();
      }
    });
  }

  void _toggleOrderSelection(int orderId) {
    setState(() {
      if (_selectedOrderIds.contains(orderId)) {
        _selectedOrderIds.remove(orderId);
        if (_selectedOrderIds.isEmpty) {
          _isSelectionMode = false;
        }
      } else {
        _selectedOrderIds.add(orderId);
      }
    });
  }

  void _onLongPressOrder(int orderId) {
    if (!_isSelectionMode) {
      setState(() {
        _isSelectionMode = true;
        _selectedOrderIds.add(orderId);
      });
    }
  }

  OrderTabType get _currentTabType {
    switch (_tabController.index) {
      case 0:
        return OrderTabType.assigned;
      case 1:
        return OrderTabType.active;
      case 2:
        return OrderTabType.history;
      default:
        return OrderTabType.assigned;
    }
  }

  void _onBatchPickup() {
    if (_selectedOrderIds.isEmpty) {
      return;
    }
    context.read<OrdersBloc>().add(BatchPickupRequested(_selectedOrderIds.toList()));
    setState(() {
      _isSelectionMode = false;
      _selectedOrderIds.clear();
    });
  }

  void _onBatchDelivery() {
    if (_selectedOrderIds.isEmpty) {
      return;
    }
    context.read<OrdersBloc>().add(BatchDeliveryRequested(_selectedOrderIds.toList()));
    setState(() {
      _isSelectionMode = false;
      _selectedOrderIds.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<OrdersBloc, OrdersState>(
      listener: (context, state) {
        if (state is BatchPickupSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${state.count} orders picked up successfully')),
          );
          context.read<OrdersBloc>().add(const RefreshOrders(statusFilter: null));
        } else if (state is BatchPickupFailure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Batch pickup failed: ${state.message}')),
          );
        } else if (state is BatchDeliverySuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${state.count} orders delivered successfully')),
          );
          context.read<OrdersBloc>().add(const RefreshOrders(statusFilter: null));
        } else if (state is BatchDeliveryFailure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Batch delivery failed: ${state.message}')),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text("My Orders"),
          actions: [
            // Selection mode toggle button (only show for Assigned and Active tabs)
            if (_tabController.index != 2)
              IconButton(
                icon: Icon(_isSelectionMode ? Icons.close : Icons.checklist),
                onPressed: _toggleSelectionMode,
                tooltip: _isSelectionMode ? 'Cancel selection' : 'Select multiple',
              ),
          ],
          bottom: TabBar(
            controller: _tabController,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textSecondaryLight,
            indicatorColor: AppColors.primary,
            tabs: const [
              Tab(text: "Assigned"),
              Tab(text: "Active"),
              Tab(text: "History"),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            _OrderListBuilder(
              tabType: OrderTabType.assigned,
              isSelectionMode: _isSelectionMode,
              selectedOrderIds: _selectedOrderIds,
              onToggleSelection: _toggleOrderSelection,
              onLongPress: _onLongPressOrder,
            ),
            _OrderListBuilder(
              tabType: OrderTabType.active,
              isSelectionMode: _isSelectionMode,
              selectedOrderIds: _selectedOrderIds,
              onToggleSelection: _toggleOrderSelection,
              onLongPress: _onLongPressOrder,
            ),
            _OrderListBuilder(
              tabType: OrderTabType.history,
              isSelectionMode: false,
              selectedOrderIds: const {},
              onToggleSelection: (_) {},
              onLongPress: (_) {},
            ),
          ],
        ),
        floatingActionButton: _buildFloatingActionButton(),
      ),
    );
  }

  Widget? _buildFloatingActionButton() {
    if (!_isSelectionMode || _selectedOrderIds.isEmpty) {
      return null;
    }

    final currentTab = _currentTabType;

    if (currentTab == OrderTabType.assigned) {
      return FloatingActionButton.extended(
        onPressed: _onBatchPickup,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.local_shipping),
        label: Text('Pickup Selected (${_selectedOrderIds.length})'),
      );
    } else if (currentTab == OrderTabType.active) {
      return FloatingActionButton.extended(
        onPressed: _onBatchDelivery,
        backgroundColor: AppColors.success,
        icon: const Icon(Icons.check_circle),
        label: Text('Deliver Selected (${_selectedOrderIds.length})'),
      );
    }

    return null;
  }
}

class _OrderListBuilder extends StatelessWidget {
  final OrderTabType tabType;
  final bool isSelectionMode;
  final Set<int> selectedOrderIds;
  final void Function(int) onToggleSelection;
  final void Function(int) onLongPress;

  const _OrderListBuilder({
    required this.tabType,
    required this.isSelectionMode,
    required this.selectedOrderIds,
    required this.onToggleSelection,
    required this.onLongPress,
  });

  bool _shouldShowOrder(OrderEntity order) {
    // Backend statuses are lowercase: pending, assigned, picked_up, delivered, etc.
    final status = order.status.toLowerCase();

    switch (tabType) {
      case OrderTabType.assigned:
        return status == 'assigned';
      case OrderTabType.active:
        return ['picked_up', 'in_transit', 'out_for_delivery'].contains(status);
      case OrderTabType.history:
        return ['delivered', 'cancelled', 'rejected', 'returned'].contains(status);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OrdersBloc, OrdersState>(
      buildWhen: (previous, current) {
        // Rebuild for loading, error, and loaded states
        // Don't rebuild for batch operation states (handled by BlocListener)
        return current is OrdersLoading ||
               current is OrdersError ||
               current is OrdersLoaded;
      },
      builder: (context, state) {
        if (state is OrdersLoading) {
          return ListView.builder(
            padding: EdgeInsets.symmetric(vertical: 16.h),
            itemCount: 5,
            itemBuilder: (context, index) => const SkeletonOrderCard(),
          );
        } else if (state is OrdersError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text("Error: ${state.message}", style: const TextStyle(color: Colors.red)),
                SizedBox(height: 16.h),
                ElevatedButton(
                  onPressed: () {
                     context.read<OrdersBloc>().add(const RefreshOrders(statusFilter: null));
                  },
                  child: const Text("Retry"),
                )
              ],
            ),
          );
        } else if (state is OrdersLoaded) {
          final filteredOrders = state.orders.where(_shouldShowOrder).toList();

          if (filteredOrders.isEmpty) {
            return Center(
              child: Text(_getEmptyMessage()),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
               context.read<OrdersBloc>().add(const RefreshOrders(statusFilter: null));
            },
            child: ListView.builder(
              padding: EdgeInsets.symmetric(vertical: 16.h),
              itemCount: filteredOrders.length,
              itemBuilder: (context, index) {
                final order = filteredOrders[index];
                final isSelected = selectedOrderIds.contains(order.id);

                return _buildOrderItem(context, order, isSelected);
              },
            ),
          );
        }
        return const Center(child: Text("Initializing..."));
      },
    );
  }

  String _getEmptyMessage() {
    switch (tabType) {
      case OrderTabType.assigned:
        return "No assigned orders";
      case OrderTabType.active:
        return "No active deliveries";
      case OrderTabType.history:
        return "No delivery history";
    }
  }

  Widget _buildOrderItem(BuildContext context, OrderEntity order, bool isSelected) {
    final orderCard = OrderCard(
      orderId: order.id,
      salesOrderNumber: order.salesOrderNumber,
      customerName: order.customerInfo['name'] ?? 'No Customer',
      status: order.status,
      amount: order.totalAmount,
      address: order.customerInfo['address'] ?? 'No Address',
      onTap: () {
        if (isSelectionMode) {
          onToggleSelection(order.id);
        } else {
          context.push('/order/${order.id}');
        }
      },
    );

    if (isSelectionMode && tabType != OrderTabType.history) {
      return GestureDetector(
        onLongPress: () => onLongPress(order.id),
        child: Row(
          children: [
            Padding(
              padding: EdgeInsets.only(left: 8.w),
              child: Checkbox(
                value: isSelected,
                onChanged: (_) => onToggleSelection(order.id),
                activeColor: AppColors.primary,
              ),
            ),
            Expanded(child: orderCard),
          ],
        ),
      ).animate().fadeIn(duration: 400.ms).slideX(begin: 0.2, end: 0);
    }

    return GestureDetector(
      onLongPress: tabType != OrderTabType.history ? () => onLongPress(order.id) : null,
      child: orderCard,
    ).animate().fadeIn(duration: 400.ms).slideX(begin: 0.2, end: 0);
  }
}
