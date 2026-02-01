import 'dart:io';
import 'dart:typed_data';

import 'package:driver_app/features/delivery/presentation/widgets/signature_pad.dart';
import 'package:driver_app/features/orders/presentation/bloc/orders_bloc.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

class DeliveryCompletionScreen extends StatefulWidget {
  final int orderId;
  final double totalAmount;
  final String? paymentMethod;

  const DeliveryCompletionScreen({
    super.key,
    required this.orderId,
    required this.totalAmount,
    this.paymentMethod,
  });

  @override
  State<DeliveryCompletionScreen> createState() =>
      _DeliveryCompletionScreenState();
}

class _DeliveryCompletionScreenState extends State<DeliveryCompletionScreen> {
  final _notesController = TextEditingController();
  final _amountController = TextEditingController();

  File? _photo;
  Uint8List? _signature;
  String _selectedPaymentMethod = 'cash';
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedPaymentMethod = widget.paymentMethod ?? 'cash';
    _amountController.text = widget.totalAmount.toStringAsFixed(3);
  }

  @override
  void dispose() {
    _notesController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.camera);
    if (image != null) {
      setState(() {
        _photo = File(image.path);
      });
    }
  }

  void _onSignatureComplete(Uint8List? bytes) {
    setState(() {
      _signature = bytes;
    });
  }

  Future<void> _completeDelivery() async {
    if (_photo == null && _signature == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please provide photo or signature as proof'),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      context.read<OrdersBloc>().add(
        OrderStatusUpdateRequested(widget.orderId, 'delivered'),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Delivery completed successfully!')),
        );
        context.go('/orders');
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
    return Scaffold(
      appBar: AppBar(title: Text('Complete Order #${widget.orderId}')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Payment Section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Payment Collection',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'cash', label: Text('Cash')),
                        ButtonSegment(value: 'knet', label: Text('KNET')),
                        ButtonSegment(value: 'prepaid', label: Text('Prepaid')),
                      ],
                      selected: {_selectedPaymentMethod},
                      onSelectionChanged: (value) {
                        setState(() => _selectedPaymentMethod = value.first);
                      },
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _amountController,
                      decoration: const InputDecoration(
                        labelText: 'Amount Collected (KWD)',
                        border: OutlineInputBorder(),
                        prefixText: 'KWD ',
                      ),
                      keyboardType: TextDecoration.none as TextInputType?,
                      readOnly: _selectedPaymentMethod == 'prepaid',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Photo Section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Proof of Delivery - Photo',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_photo != null)
                      Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.file(
                              _photo!,
                              height: 200,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Positioned(
                            top: 8,
                            right: 8,
                            child: IconButton(
                              icon: const Icon(
                                Icons.close,
                                color: Colors.white,
                              ),
                              onPressed: () => setState(() => _photo = null),
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.black54,
                              ),
                            ),
                          ),
                        ],
                      )
                    else
                      Center(
                        child: ElevatedButton.icon(
                          onPressed: _takePhoto,
                          icon: const Icon(Icons.camera_alt),
                          label: const Text('Take Photo'),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Signature Section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Customer Signature',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (_signature != null)
                          const Icon(Icons.check_circle, color: Colors.green),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SignaturePadWidget(onSigned: _onSignatureComplete),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Notes Section
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Delivery Notes (Optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _completeDelivery,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isSubmitting
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        'Complete Delivery',
                        style: TextStyle(fontSize: 18),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
