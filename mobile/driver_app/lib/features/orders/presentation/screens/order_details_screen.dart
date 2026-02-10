import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart'; // For calls/maps

import '../../../../core/di/injection_container.dart' as di;
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/info_row.dart';
import '../../domain/entities/order_entity.dart';
import '../../domain/repositories/order_repository.dart';

class OrderDetailsScreen extends StatefulWidget {
  final String orderId;

  const OrderDetailsScreen({super.key, required this.orderId});

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  late Future<OrderEntity> _orderFuture;
  OrderEntity? _order;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  void _loadOrder() {
    final id = int.tryParse(widget.orderId) ?? 0;
    _orderFuture = di.sl<OrderRepository>().getOrderDetails(id).then((order) {
      if (mounted) {
        setState(() {
          _order = order;
        });
      }
      return order;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_order?.salesOrderNumber ?? "Order #${widget.orderId}"),
      ),
      body: FutureBuilder<OrderEntity>(
        future: _orderFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                   const Text("Error loading order", style: TextStyle(color: AppColors.error)),
                   SizedBox(height: 8.h),
                   ElevatedButton(
                     onPressed: () {
                       setState(() {
                         _loadOrder();
                       });
                     },
                     child: const Text("Retry"),
                   )
                ],
              ),
            );
          } else if (!snapshot.hasData) {
            return const Center(child: Text("Order not found"));
          }

          final order = snapshot.data!;
          return SingleChildScrollView(
            padding: EdgeInsets.all(16.w),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildStatusSection(context, order),
                SizedBox(height: 16.h),
                _buildCustomerSection(context, order),
                SizedBox(height: 16.h),
                _buildOrderItemsSection(context, order),
                SizedBox(height: 24.h),
                _buildActionButtons(context, order),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusSection(BuildContext context, OrderEntity order) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Status",
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
          SizedBox(height: 8.h),
          Row(
            children: [
              const Icon(Icons.info_outline, color: AppColors.primary),
              SizedBox(width: 8.w),
              Text(
                order.status.toUpperCase(),
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ],
          ),
          SizedBox(height: 8.h),
          InfoRow(label: "Order Date", value: order.createdAt.toString().split('.')[0]),
        ],
      ),
    );
  }

  Widget _buildCustomerSection(BuildContext context, OrderEntity order) {
    final customer = order.customerInfo;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Customer Info",
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
          SizedBox(height: 12.h),
          InfoRow(label: "Name", value: customer['name'] ?? 'No Customer', isBold: true),
          InfoRow(label: "Phone", value: customer['phone'] ?? 'N/A'),
          SizedBox(height: 8.h),
          Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          SizedBox(height: 8.h),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.location_on, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight, size: 20),
              SizedBox(width: 8.w),
              Expanded(
                child: Text(
                  customer['address'] ?? 'No Address Provided',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOrderItemsSection(BuildContext context, OrderEntity order) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Payment & Total",
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
           SizedBox(height: 12.h),
           InfoRow(label: "Payment Method", value: order.paymentMethod),
           Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight),
           InfoRow(
             label: "Total Amount",
             value: "KWD ${order.totalAmount.toStringAsFixed(3)}",
             isBold: true,
             valueColor: AppColors.primary,
           )
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, OrderEntity order) {
    // Defines available actions based on status
    final status = order.status.toLowerCase();

    if (status == 'cancelled' || status == 'rejected' || status == 'returned') {
       return const SizedBox.shrink();
    }

    if (status == 'delivered') {
      return SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.orange[700],
            side: BorderSide(color: Colors.orange[300]!),
            padding: EdgeInsets.symmetric(vertical: 16.h),
          ),
          onPressed: () => _showReturnDialog(context, order),
          icon: const Icon(Icons.assignment_return),
          label: const Text("Return Order"),
        ),
      );
    }

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                   final phone = order.customerInfo['phone'];
                   if (phone != null) {
                     launchUrl(Uri.parse('tel:$phone'));
                   }
                },
                icon: const Icon(Icons.call),
                label: const Text("Call"),
              ),
            ),
            SizedBox(width: 16.w),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {
                   // Navigate logic (placeholder)
                },
                icon: const Icon(Icons.navigation),
                label: const Text("Navigate"),
              ),
            ),
          ],
        ),
        SizedBox(height: 16.h),
        _buildStatusActionButton(context, order),
      ],
    );
  }

  Widget _buildStatusActionButton(BuildContext context, OrderEntity order) {
    final status = order.status.toLowerCase();
    String label;
    String nextStatus;
    Color color = AppColors.primary;

    if (status == 'assigned') {
      label = "Pick Up Order";
      nextStatus = 'picked_up';
    } else if (status == 'picked_up') {
      label = "Start Delivery";
      nextStatus = 'out_for_delivery';
    } else if (status == 'out_for_delivery') {
      label = "Complete Delivery";
      nextStatus = 'delivered'; 
      color = AppColors.success;
      // Change action to open POD dialog
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: color,
            padding: EdgeInsets.symmetric(vertical: 16.h),
          ),
          onPressed: () => _showPODDialog(context, order),
          child: Text(label),
        ),
      );
    } else {
      return const SizedBox.shrink();
    }

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          padding: EdgeInsets.symmetric(vertical: 16.h),
        ),
        onPressed: () => _updateStatus(order, nextStatus),
        child: Text(label),
      ),
    );
  }

  Future<void> _showPODDialog(BuildContext context, OrderEntity order) async {
    final picker = ImagePicker();
    XFile? photo;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text("Proof of Delivery"),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (photo != null)
                    Image.file(
                      File(photo!.path),
                      height: 200.h,
                      fit: BoxFit.cover,
                    )
                  else
                    Container(
                      height: 200.h,
                      color: Colors.grey[200],
                      child: const Center(child: Text("No Photo Selected")),
                    ),
                  SizedBox(height: 16.h),
                  ElevatedButton.icon(
                    onPressed: () async {
                      final picked = await picker.pickImage(
                        source: ImageSource.camera,
                        imageQuality: 50,
                      );
                      if (picked != null) {
                        setState(() {
                          photo = picked;
                        });
                      }
                    },
                    icon: const Icon(Icons.camera_alt),
                    label: const Text("Take Photo"),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text("Cancel"),
                ),
                ElevatedButton(
                  onPressed: photo == null
                      ? null
                      : () {
                          Navigator.pop(dialogContext); // Close dialog
                          _submitPOD(order, photo!);
                        },
                  child: const Text("Complete"),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _submitPOD(OrderEntity order, XFile photo) async {
    try {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Uploading Proof of Delivery...")),
        );
      }

      final repo = di.sl<OrderRepository>();
      
      // 1. Upload Photo
      final photoUrl = await repo.uploadFile(photo.path);
      
      // 2. Submit POD and Update Status
      await repo.submitProofOfDelivery(order.id, photoUrl, null);

      setState(() {
        _loadOrder();
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Order Delivered Successfully!")),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Failed to submit POD: $e")),
        );
      }
    }
  }

  Future<void> _showReturnDialog(BuildContext context, OrderEntity order) async {
    final reasonController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text("Return Order"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text("Please enter the reason for returning this order."),
              SizedBox(height: 12.h),
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(
                  labelText: "Return Reason",
                  hintText: "Enter reason...",
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text("Cancel"),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange[700]),
              onPressed: () {
                if (reasonController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Please enter a reason")),
                  );
                  return;
                }
                Navigator.pop(dialogContext, true);
              },
              child: const Text("Return Order"),
            ),
          ],
        );
      },
    );

    if (confirmed == true && reasonController.text.trim().isNotEmpty) {
      try {
        await di.sl<OrderRepository>().returnOrder(order.id, reasonController.text.trim());
        setState(() {
          _loadOrder();
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Order marked as returned")),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("Failed to return order: $e")),
          );
        }
      }
    }
    reasonController.dispose();
  }

  Future<void> _updateStatus(OrderEntity order, String newStatus) async {
    try {
      await di.sl<OrderRepository>().updateOrderStatus(order.id, newStatus);
      // Reload on success
      setState(() {
        _loadOrder();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Order updated to $newStatus")),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Failed to update status: $e")),
        );
      }
    }
  }
}
