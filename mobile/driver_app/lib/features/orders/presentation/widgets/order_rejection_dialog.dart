import 'package:driver_app/features/orders/presentation/bloc/orders_bloc.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class OrderRejectionDialog extends StatefulWidget {
  final int orderId;

  const OrderRejectionDialog({super.key, required this.orderId});

  @override
  State<OrderRejectionDialog> createState() => _OrderRejectionDialogState();
}

class _OrderRejectionDialogState extends State<OrderRejectionDialog> {
  final _reasonController = TextEditingController();
  String? _selectedReason;
  bool _isSubmitting = false;

  final List<String> _reasons = [
    'Customer not available',
    'Wrong address',
    'Customer refused delivery',
    'Unable to reach location',
    'Order damaged',
    'Other',
  ];

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _submitRejection() async {
    if (_selectedReason == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select a reason')));
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      context.read<OrdersBloc>().add(
        OrderStatusUpdateRequested(widget.orderId, 'cancelled'),
      );

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Reject Order'),
      content: SingleChildScrollView(
        child: RadioGroup<String>(
          groupValue: _selectedReason,
          onChanged: (value) {
            setState(() => _selectedReason = value);
          },
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Please select a reason for rejection:',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              ...List.generate(_reasons.length, (index) {
                final reason = _reasons[index];
                return ListTile(
                  title: Text(reason),
                  leading: Radio<String>(value: reason),
                  onTap: () {
                    setState(() => _selectedReason = reason);
                  },
                  contentPadding: EdgeInsets.zero,
                );
              }),
              if (_selectedReason == 'Other') ...[
                const SizedBox(height: 8),
                TextField(
                  controller: _reasonController,
                  decoration: const InputDecoration(
                    labelText: 'Specify reason',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitRejection,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
          ),
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Reject Order'),
        ),
      ],
    );
  }
}

Future<bool?> showOrderRejectionDialog(BuildContext context, int orderId) {
  return showDialog<bool>(
    context: context,
    builder: (context) => OrderRejectionDialog(orderId: orderId),
  );
}
