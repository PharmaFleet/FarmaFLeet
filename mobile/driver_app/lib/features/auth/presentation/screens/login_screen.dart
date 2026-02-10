import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/app_buttons.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../bloc/auth_bloc.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isPasswordVisible = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onLoginPressed() {
    if (_formKey.currentState!.validate()) {
      context.read<AuthBloc>().add(
            AuthLoginRequested(
              _emailController.text.trim(),
              _passwordController.text,
            ),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            context.go('/home');
          } else if (state is AuthFailure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          final isLoading = state is AuthLoading;

          return SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: 24.w),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(height: 80.h),
                    
                    // Logo / Icon
                    Center(
                      child: Container(
                        padding: EdgeInsets.all(20.w),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.local_shipping_rounded,
                          size: 64.sp,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    SizedBox(height: 32.h),

                    // Title
                    Text(
                      'Welcome Back',
                      style: AppTypography.lightTheme.displayMedium,
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: 8.h),
                    Text(
                      'Sign in to define your route',
                      style: AppTypography.lightTheme.bodyLarge?.copyWith(
                        color: AppColors.textSecondaryLight,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: 48.h),

                    // Inputs
                    AppTextField(
                      controller: _emailController,
                      label: 'Email',
                      hint: 'driver@example.com',
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your email';
                        }
                        if (!value.contains('@')) {
                          return 'Please enter a valid email';
                        }
                        return null;
                      },
                    ),
                    SizedBox(height: 24.h),
                    AppTextField(
                      controller: _passwordController,
                      label: 'Password',
                      hint: '••••••••',
                      obscureText: !_isPasswordVisible,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _isPasswordVisible
                              ? Icons.visibility
                              : Icons.visibility_off,
                          color: AppColors.textSecondaryLight,
                        ),
                        onPressed: () {
                          setState(() {
                            _isPasswordVisible = !_isPasswordVisible;
                          });
                        },
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your password';
                        }
                        if (value.length < 5) {
                          return 'Password must be at least 5 characters';
                        }
                        return null;
                      },
                    ),
                    
                    SizedBox(height: 40.h),

                    // Actions
                    PrimaryButton(
                      text: 'Sign In',
                      onPressed: _onLoginPressed,
                      isLoading: isLoading,
                    ),
                    SizedBox(height: 16.h),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
