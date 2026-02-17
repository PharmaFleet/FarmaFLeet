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
                _buildPickupSection(context, order),
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

  Widget _buildPickupSection(BuildContext context, OrderEntity order) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pickupLabel = order.warehouseCode != null && order.warehouseName != null
        ? "${order.warehouseCode} - ${order.warehouseName}"
        : order.warehouseName ?? order.warehouseCode ?? 'N/A';

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
            "Pickup Location",
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
          SizedBox(height: 8.h),
          Row(
            children: [
              Icon(Icons.warehouse, color: AppColors.info, size: 20),
              SizedBox(width: 8.w),
              Expanded(
                child: Text(
                  pickupLabel,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          if (order.status.toLowerCase() == 'assigned') ...[
            SizedBox(height: 12.h),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.info,
                  side: BorderSide(color: AppColors.info.withValues(alpha: 0.5)),
                ),
                onPressed: () {
                  // Open Google Maps to warehouse - uses warehouseId as fallback
                  final query = Uri.encodeComponent(pickupLabel);
                  launchUrl(Uri.parse('https://www.google.com/maps/search/?api=1&query=$query'));
                },
                icon: const Icon(Icons.directions),
                label: const Text("Navigate to Pickup"),
              ),
            ),
          ],
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
    final status = order.status.toLowerCase();
    final terminalStatuses = {'cancelled', 'rejected', 'returned'};
    final isPaymentEditable = !terminalStatuses.contains(status);

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
           isPaymentEditable
             ? InkWell(
                 onTap: () => _showPaymentMethodPicker(context, order),
                 borderRadius: BorderRadius.circular(8.r),
                 child: Padding(
                   padding: EdgeInsets.symmetric(vertical: 4.h),
                   child: Row(
                     mainAxisAlignment: MainAxisAlignment.spaceBetween,
                     children: [
                       Text(
                         "Payment Method",
                         style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                           color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                         ),
                       ),
                       Row(
                         children: [
                           Text(
                             order.paymentMethod,
                             style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                               color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                               fontWeight: FontWeight.w600,
                             ),
                           ),
                           SizedBox(width: 4.w),
                           Icon(Icons.edit, size: 16, color: AppColors.primary),
                         ],
                       ),
                     ],
                   ),
                 ),
               )
             : InfoRow(label: "Payment Method", value: order.paymentMethod),
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

  void _showPaymentMethodPicker(BuildContext context, OrderEntity order) {
    final methods = ['CASH', 'COD', 'KNET', 'LINK', 'CREDIT_CARD'];
    final labels = {
      'CASH': 'Cash',
      'COD': 'Cash on Delivery',
      'KNET': 'KNET',
      'LINK': 'Payment Link',
      'CREDIT_CARD': 'Credit Card',
    };
    final icons = {
      'CASH': Icons.money,
      'COD': Icons.local_atm,
      'KNET': Icons.credit_card,
      'LINK': Icons.link,
      'CREDIT_CARD': Icons.credit_score,
    };

    showModalBottomSheet(
      context: context,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 16.h),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16.w),
                  child: Text(
                    "Select Payment Method",
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                SizedBox(height: 8.h),
                ...methods.map((method) {
                  final isSelected = order.paymentMethod.toUpperCase() == method;
                  return ListTile(
                    leading: Icon(
                      icons[method] ?? Icons.payment,
                      color: isSelected ? AppColors.primary : null,
                    ),
                    title: Text(
                      labels[method] ?? method,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? AppColors.primary : null,
                      ),
                    ),
                    trailing: isSelected
                        ? const Icon(Icons.check_circle, color: AppColors.primary)
                        : null,
                    onTap: () async {
                      Navigator.pop(sheetContext);
                      if (!isSelected) {
                        await _updatePaymentMethod(order, method);
                      }
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _updatePaymentMethod(OrderEntity order, String method) async {
    try {
      await di.sl<OrderRepository>().updatePaymentMethod(order.id, method);
      setState(() {
        _loadOrder();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Payment method updated to $method")),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Failed to update payment method: $e")),
        );
      }
    }
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
