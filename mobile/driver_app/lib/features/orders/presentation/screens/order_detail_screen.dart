import 'package:driver_app/features/orders/domain/entities/order_entity.dart';
import 'package:driver_app/features/orders/presentation/bloc/orders_bloc.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';

class OrderDetailScreen extends StatelessWidget {
  final int orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Order #$orderId')),
      body: BlocBuilder<OrdersBloc, OrdersState>(
        builder: (context, state) {
          if (state is! OrdersLoaded) {
            return const Center(child: CircularProgressIndicator());
          }

          final order = state.orders.firstWhere(
            (o) => o.id == orderId,
            orElse: () => throw Exception('Order not found'),
          );

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildInfoCard(order),
                const SizedBox(height: 16),
                _buildCustomerCard(order, context),
                const SizedBox(height: 16),
                _buildActionButtons(order, context),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildInfoCard(OrderEntity order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              order.salesOrderNumber ?? '#${order.id}',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _infoRow(
              Icons.monetization_on,
              'Amount',
              'KWD ${order.totalAmount.toStringAsFixed(3)}',
            ),
            _infoRow(Icons.payment, 'Payment', order.paymentMethod),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomerCard(OrderEntity order, BuildContext context) {
    final customerName = order.customerInfo['name'] as String?;
    final customerPhone = order.customerInfo['phone'] as String?;
    final deliveryAddress = order.customerInfo['address'] as String?;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Customer',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _infoRow(Icons.person, 'Name', customerName ?? 'No Customer'),
            if (customerPhone != null) ...[
              const SizedBox(height: 8),
              InkWell(
                onTap: () => _launchPhone(customerPhone),
                child: _infoRow(
                  Icons.phone,
                  'Phone',
                  customerPhone,
                  isLink: true,
                ),
              ),
            ],
            if (deliveryAddress != null) ...[
              const SizedBox(height: 8),
              _infoRow(Icons.location_on, 'Address', deliveryAddress),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(OrderEntity order, BuildContext context) {
    final bloc = context.read<OrdersBloc>();
    final status = order.status.toUpperCase();

    // Different actions based on order status
    if (status == 'ASSIGNED') {
      return _actionButton(
        context,
        'Accept & Pick Up',
        Icons.check,
        Colors.blue,
        () => bloc.add(OrderStatusUpdateRequested(order.id, 'picked_up')),
      );
    } else if (status == 'PICKED_UP') {
      return _actionButton(
        context,
        'Start Delivery',
        Icons.local_shipping,
        Colors.purple,
        () => bloc.add(OrderStatusUpdateRequested(order.id, 'in_transit')),
      );
    } else if (status == 'IN_TRANSIT') {
      final latitude = order.customerInfo['latitude'] as double?;
      final longitude = order.customerInfo['longitude'] as double?;
      return Column(
        children: [
          _actionButton(
            context,
            'Navigate to Customer',
            Icons.navigation,
            Colors.teal,
            () => _launchMaps(latitude, longitude),
          ),
          const SizedBox(height: 12),
          _actionButton(
            context,
            'Complete Delivery',
            Icons.done_all,
            Colors.green,
            () => bloc.add(OrderStatusUpdateRequested(order.id, 'delivered')),
          ),
        ],
      );
    } else if (status == 'DELIVERED') {
      return const Center(
        child: Chip(
          label: Text('Delivery Completed'),
          backgroundColor: Colors.green,
          labelStyle: TextStyle(color: Colors.white),
        ),
      );
    } else {
      return const SizedBox.shrink();
    }
  }

  Widget _actionButton(
    BuildContext context,
    String label,
    IconData icon,
    Color color,
    VoidCallback onPressed,
  ) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  Widget _infoRow(
    IconData icon,
    String label,
    String value, {
    bool isLink = false,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.grey),
        const SizedBox(width: 8),
        Text('$label: ', style: const TextStyle(color: Colors.grey)),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: isLink ? Colors.blue : null,
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _launchPhone(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _launchMaps(double? lat, double? lng) async {
    if (lat == null || lng == null) {
      return;
    }
    final uri = Uri.parse('google.navigation:q=$lat,$lng&mode=d');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}
