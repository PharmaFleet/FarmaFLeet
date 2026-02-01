import 'package:driver_app/features/orders/data/models/order_model.dart';
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

  Widget _buildInfoCard(Order order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              order.orderNumber,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _infoRow(
              Icons.monetization_on,
              'Amount',
              'KWD ${order.totalAmount.toStringAsFixed(3)}',
            ),
            _infoRow(Icons.payment, 'Payment', order.paymentMethod ?? 'N/A'),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomerCard(Order order, BuildContext context) {
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
            _infoRow(Icons.person, 'Name', order.customerName ?? 'N/A'),
            if (order.customerPhone != null) ...[
              const SizedBox(height: 8),
              InkWell(
                onTap: () => _launchPhone(order.customerPhone!),
                child: _infoRow(
                  Icons.phone,
                  'Phone',
                  order.customerPhone!,
                  isLink: true,
                ),
              ),
            ],
            if (order.deliveryAddress != null) ...[
              const SizedBox(height: 8),
              _infoRow(Icons.location_on, 'Address', order.deliveryAddress!),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(Order order, BuildContext context) {
    final bloc = context.read<OrdersBloc>();

    // Different actions based on order status
    switch (order.status) {
      case OrderStatus.assigned:
        return _actionButton(
          context,
          'Accept & Pick Up',
          Icons.check,
          Colors.blue,
          () => bloc.add(OrderStatusUpdateRequested(order.id, 'picked_up')),
        );
      case OrderStatus.pickedUp:
        return _actionButton(
          context,
          'Start Delivery',
          Icons.local_shipping,
          Colors.purple,
          () => bloc.add(OrderStatusUpdateRequested(order.id, 'in_transit')),
        );
      case OrderStatus.inTransit:
        return Column(
          children: [
            _actionButton(
              context,
              'Navigate to Customer',
              Icons.navigation,
              Colors.teal,
              () => _launchMaps(order.latitude, order.longitude),
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
      case OrderStatus.delivered:
        return const Center(
          child: Chip(
            label: Text('Delivery Completed'),
            backgroundColor: Colors.green,
            labelStyle: TextStyle(color: Colors.white),
          ),
        );
      default:
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
    if (lat == null || lng == null) return;
    final uri = Uri.parse('google.navigation:q=$lat,$lng&mode=d');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}
