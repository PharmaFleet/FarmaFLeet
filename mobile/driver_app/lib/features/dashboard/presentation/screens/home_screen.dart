import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection_container.dart' as di;
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../bloc/dashboard_bloc.dart';
import '../widgets/map_widget.dart';
import '../widgets/status_toggle.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => di.sl<DashboardBloc>()..add(DashboardInit()),
      child: const DashboardView(),
    );
  }
}

class DashboardView extends StatelessWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text("Dashboard"),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          Container(
            margin: EdgeInsets.only(right: 16.w),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                 BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 5,
                 )
              ]
            ),
            child: IconButton(
              icon: const Icon(Icons.person, color: Colors.black),
              onPressed: () => context.push('/profile'),
            ),
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            BlocBuilder<AuthBloc, AuthState>(
              builder: (context, state) {
                final userName = state is AuthAuthenticated
                    ? state.user.fullName ?? 'Driver'
                    : 'Driver';
                return DrawerHeader(
                  decoration: const BoxDecoration(color: Colors.blue),
                  child: Text(userName, style: const TextStyle(color: Colors.white, fontSize: 24)),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.list_alt),
              title: const Text('My Orders'),
              onTap: () {
                context.pop(); // Close drawer
                context.push('/orders');
              },
            ),
             ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Logout'),
              onTap: () {
                context.read<AuthBloc>().add(AuthLogoutRequested());
              },
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          // Map Background
          BlocBuilder<DashboardBloc, DashboardState>(
            buildWhen: (previous, current) => previous.currentLocation != current.currentLocation,
            builder: (context, state) {
              return MapWidget(
                initialLocation: state.currentLocation,
                markers: const {}, // Add markers logic later
              );
            },
          ),
          
          // Floating Status Toggle
          Positioned(
            bottom: 40.h,
            left: 0,
            right: 0,
            child: Center(
              child: BlocConsumer<DashboardBloc, DashboardState>(
                listener: (context, state) {
                  if (state.status == DriverStatus.error) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(state.errorMessage ?? 'Error updating status')),
                    );
                  }
                },
                builder: (context, state) {
                  return StatusToggle(
                    isAvailable: state.isAvailable,
                    isLoading: state.status == DriverStatus.loading,
                    onToggle: (val) {
                      context.read<DashboardBloc>().add(DashboardStatusToggled(val));
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
