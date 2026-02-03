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

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // remove listener as we filter client side now
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("My Orders"),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondaryLight,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: "Active"),
            Tab(text: "History"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _OrderListBuilder(isHistory: false),
          _OrderListBuilder(isHistory: true),
        ],
      ),
    );
  }
}

class _OrderListBuilder extends StatelessWidget {
  final bool isHistory;
  const _OrderListBuilder({required this.isHistory});

  bool _shouldShowOrder(OrderEntity order) {
    // Backend statuses are lowercase: pending, assigned, picked_up, delivered, etc.
    final historyStatuses = ['delivered', 'cancelled', 'rejected', 'returned'];
    // Normalize logic just in case, though backend sends lowercase.
    final status = order.status.toLowerCase();
    
    if (isHistory) {
      return historyStatuses.contains(status);
    } else {
      return !historyStatuses.contains(status);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OrdersBloc, OrdersState>(
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
            return const Center(child: Text("No orders found"));
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
                return OrderCard(
                  orderId: order.id,
                  customerName: order.customerInfo['name'] ?? 'No Customer',
                  status: order.status,
                  amount: order.totalAmount,
                  address: order.customerInfo['address'] ?? 'No Address',
                  onTap: () {
                    context.push('/order/${order.id}');
                  },
                ).animate().fadeIn(duration: 400.ms).slideX(begin: 0.2, end: 0);
              },
            ),
          );
        }
        return const Center(child: Text("Initializing..."));
      },
    );
  }
}
