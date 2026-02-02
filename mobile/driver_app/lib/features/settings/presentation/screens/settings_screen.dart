import 'package:driver_app/core/services/local_database_service.dart';
import 'package:driver_app/core/services/sync_service.dart';
import 'package:driver_app/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:driver_app/l10n/app_localizations.dart';
import 'package:driver_app/widgets/widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class SettingsScreen extends StatefulWidget {
  final LocalDatabaseService localDb;
  final SyncService syncService;
  final Function(Locale) onLocaleChange;

  const SettingsScreen({
    super.key,
    required this.localDb,
    required this.syncService,
    required this.onLocaleChange,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late String _currentLocale;
  int _pendingActions = 0;

  @override
  void initState() {
    super.initState();
    _currentLocale =
        widget.localDb.getSetting<String>('locale', defaultValue: 'en') ?? 'en';
    _loadPendingActions();
  }

  void _loadPendingActions() {
    setState(() {
      _pendingActions = widget.syncService.getPendingActionsCount();
    });
  }

  void _changeLocale(String locale) {
    setState(() => _currentLocale = locale);
    widget.localDb.setSetting('locale', locale);
    widget.onLocaleChange(Locale(locale));
  }

  Future<void> _syncNow() async {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Syncing...')));
    await widget.syncService.syncPendingActions();
    _loadPendingActions();
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Sync complete')));
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      context.read<AuthBloc>().add(AuthLogoutRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
      appBar: AppBar(
        title: Text(l10n?.settings ?? 'Settings'),
        centerTitle: true,
        backgroundColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        padding: AppSpacing.paddingMD,
        child: Column(
          children: [
            // Profile Header
            BlocBuilder<AuthBloc, AuthState>(
              builder: (context, authState) {
                String userName = 'Driver';
                String userPhone = '';
                String initials = 'DR';

                if (authState is AuthAuthenticated) {
                  userName = authState.user.fullName ?? 'Driver';
                  userPhone = authState.user.phone ?? '';
                  // Generate initials from name
                  final nameParts = userName.split(' ');
                  if (nameParts.length >= 2) {
                    initials = '${nameParts[0][0]}${nameParts[1][0]}'.toUpperCase();
                  } else if (nameParts.isNotEmpty && nameParts[0].isNotEmpty) {
                    initials = nameParts[0][0].toUpperCase();
                  }
                }

                return CardContainer(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: colorScheme.primaryContainer,
                        child: Text(
                          initials,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: colorScheme.onPrimaryContainer,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            userName,
                            style: AppTextStyles.titleMedium,
                          ),
                          Text(
                            userPhone,
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: AppSpacing.lg),

            // General Settings
            _SettingsGroup(
              title: 'General',
              children: [
                _SettingsTile(
                  title: 'Language',
                  subtitle: _currentLocale == 'en' ? 'English' : 'العربية',
                  icon: Icons.language,
                  onTap: () {
                    _showLanguageDialog();
                  },
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),

            // Sync Settings
            _SettingsGroup(
              title: 'Sync & Data',
              children: [
                _SettingsTile(
                  title: 'Pending Actions',
                  subtitle: '$_pendingActions waiting',
                  icon: Icons.sync,
                  trailing: _pendingActions > 0
                      ? Badge(label: Text('$_pendingActions'))
                      : const Icon(
                          Icons.check_circle,
                          color: Colors.green,
                          size: 20,
                        ),
                ),
                _SettingsTile(
                  title: 'Sync Now',
                  subtitle: 'Force synchronization',
                  icon: Icons.cloud_upload_outlined,
                  onTap: _syncNow,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),

            // Account Settings
            _SettingsGroup(
              title: 'Account',
              children: [
                _SettingsTile(
                  title: 'Logout',
                  subtitle: 'Sign out of your account',
                  icon: Icons.logout,
                  iconColor: colorScheme.error,
                  textColor: colorScheme.error,
                  onTap: _logout,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),

            // App Version
            Text(
              'Version 1.0.0',
              style: AppTextStyles.bodySmall.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }

  void _showLanguageDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Language'),
        content: RadioGroup<String>(
          groupValue: _currentLocale,
          onChanged: (value) {
            if (value != null) {
              _changeLocale(value);
              Navigator.pop(context);
            }
          },
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: const Text('English'),
                leading: const Radio<String>(value: 'en'),
                onTap: () {
                  _changeLocale('en');
                  Navigator.pop(context);
                },
              ),
              ListTile(
                title: const Text('العربية'),
                leading: const Radio<String>(value: 'ar'),
                onTap: () {
                  _changeLocale('ar');
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SettingsGroup({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: AppTextStyles.titleSmall.copyWith(
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
        ),
        CardContainer(
          padding: EdgeInsets.zero,
          child: Column(children: children),
        ),
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final Color? iconColor;
  final Color? textColor;
  final VoidCallback? onTap;
  final Widget? trailing;

  const _SettingsTile({
    required this.title,
    this.subtitle,
    required this.icon,
    this.iconColor,
    this.textColor,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: (iconColor ?? colorScheme.primary).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: iconColor ?? colorScheme.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.bodyLarge.copyWith(
                      color: textColor ?? colorScheme.onSurface,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (trailing != null)
              trailing!
            else if (onTap != null)
              Icon(
                Icons.chevron_right,
                size: 20,
                color: colorScheme.onSurfaceVariant,
              ),
          ],
        ),
      ),
    );
  }
}
