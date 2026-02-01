import 'package:flutter/material.dart';

// Simple localization class (can be replaced with gen-l10n later)
class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static const List<Locale> supportedLocales = [Locale('en'), Locale('ar')];

  bool get isArabic => locale.languageCode == 'ar';

  // English translations
  static const Map<String, String> _enStrings = {
    'appTitle': 'PharmaFleet Driver',
    'login': 'Login',
    'username': 'Username',
    'password': 'Password',
    'home': 'Home',
    'orders': 'Orders',
    'settings': 'Settings',
    'logout': 'Logout',
    'noOrders': 'No orders available',
    'orderDetail': 'Order Details',
    'customer': 'Customer',
    'address': 'Address',
    'amount': 'Amount',
    'status': 'Status',
    'pickUp': 'Pick Up',
    'startDelivery': 'Start Delivery',
    'completeDelivery': 'Complete Delivery',
    'rejectOrder': 'Reject Order',
    'callCustomer': 'Call Customer',
    'navigate': 'Navigate',
    'pendingPayments': 'Pending Payments',
    'deliveryProof': 'Proof of Delivery',
    'signature': 'Signature',
    'takePhoto': 'Take Photo',
    'paymentMethod': 'Payment Method',
    'cash': 'Cash',
    'knet': 'KNET',
    'prepaid': 'Prepaid',
    'notes': 'Notes',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'error': 'Error',
    'success': 'Success',
    'language': 'Language',
    'syncStatus': 'Sync Status',
    'pendingActions': 'Pending Actions',
    'syncNow': 'Sync Now',
    'online': 'Online',
    'offline': 'Offline',
  };

  // Arabic translations
  static const Map<String, String> _arStrings = {
    'appTitle': 'سائق فارما فليت',
    'login': 'تسجيل الدخول',
    'username': 'اسم المستخدم',
    'password': 'كلمة المرور',
    'home': 'الرئيسية',
    'orders': 'الطلبات',
    'settings': 'الإعدادات',
    'logout': 'تسجيل الخروج',
    'noOrders': 'لا توجد طلبات',
    'orderDetail': 'تفاصيل الطلب',
    'customer': 'العميل',
    'address': 'العنوان',
    'amount': 'المبلغ',
    'status': 'الحالة',
    'pickUp': 'استلام',
    'startDelivery': 'بدء التوصيل',
    'completeDelivery': 'إتمام التوصيل',
    'rejectOrder': 'رفض الطلب',
    'callCustomer': 'الاتصال بالعميل',
    'navigate': 'التنقل',
    'pendingPayments': 'المدفوعات المعلقة',
    'deliveryProof': 'إثبات التوصيل',
    'signature': 'التوقيع',
    'takePhoto': 'التقاط صورة',
    'paymentMethod': 'طريقة الدفع',
    'cash': 'نقداً',
    'knet': 'كي نت',
    'prepaid': 'مدفوع مسبقاً',
    'notes': 'ملاحظات',
    'cancel': 'إلغاء',
    'confirm': 'تأكيد',
    'error': 'خطأ',
    'success': 'نجاح',
    'language': 'اللغة',
    'syncStatus': 'حالة المزامنة',
    'pendingActions': 'إجراءات معلقة',
    'syncNow': 'مزامنة الآن',
    'online': 'متصل',
    'offline': 'غير متصل',
  };

  Map<String, String> get _strings =>
      locale.languageCode == 'ar' ? _arStrings : _enStrings;

  String get appTitle => _strings['appTitle']!;
  String get login => _strings['login']!;
  String get username => _strings['username']!;
  String get password => _strings['password']!;
  String get home => _strings['home']!;
  String get orders => _strings['orders']!;
  String get settings => _strings['settings']!;
  String get logout => _strings['logout']!;
  String get noOrders => _strings['noOrders']!;
  String get orderDetail => _strings['orderDetail']!;
  String get customer => _strings['customer']!;
  String get address => _strings['address']!;
  String get amount => _strings['amount']!;
  String get status => _strings['status']!;
  String get pickUp => _strings['pickUp']!;
  String get startDelivery => _strings['startDelivery']!;
  String get completeDelivery => _strings['completeDelivery']!;
  String get rejectOrder => _strings['rejectOrder']!;
  String get callCustomer => _strings['callCustomer']!;
  String get navigate => _strings['navigate']!;
  String get pendingPayments => _strings['pendingPayments']!;
  String get deliveryProof => _strings['deliveryProof']!;
  String get signature => _strings['signature']!;
  String get takePhoto => _strings['takePhoto']!;
  String get paymentMethod => _strings['paymentMethod']!;
  String get cash => _strings['cash']!;
  String get knet => _strings['knet']!;
  String get prepaid => _strings['prepaid']!;
  String get notes => _strings['notes']!;
  String get cancel => _strings['cancel']!;
  String get confirm => _strings['confirm']!;
  String get error => _strings['error']!;
  String get success => _strings['success']!;
  String get language => _strings['language']!;
  String get syncStatus => _strings['syncStatus']!;
  String get pendingActions => _strings['pendingActions']!;
  String get syncNow => _strings['syncNow']!;
  String get online => _strings['online']!;
  String get offline => _strings['offline']!;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return ['en', 'ar'].contains(locale.languageCode);
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}
