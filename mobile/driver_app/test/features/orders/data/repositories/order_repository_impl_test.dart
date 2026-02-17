import 'package:dio/dio.dart';
import 'package:driver_app/features/orders/data/repositories/order_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';

/// Tests for OrderRepositoryImpl - updatePaymentMethod (Task 2)
/// and returnOrder.
///
/// Uses a fake DioHttpClientAdapter to avoid mockito code generation.

/// Simple fake adapter that returns pre-configured responses.
class _FakeAdapter implements HttpClientAdapter {
  RequestOptions? lastRequest;
  Object? lastRequestData;
  late Response<dynamic> Function(RequestOptions) handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequest = options;
    lastRequestData = options.data;
    final response = handler(options);

    if (response.statusCode != null && response.statusCode! >= 400) {
      throw DioException(
        response: response,
        requestOptions: options,
        type: DioExceptionType.badResponse,
      );
    }

    return ResponseBody.fromString(
      '', // We don't parse the body in these tests
      response.statusCode ?? 200,
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late Dio dio;
  late _FakeAdapter fakeAdapter;
  late OrderRepositoryImpl repo;

  setUp(() {
    dio = Dio(BaseOptions(baseUrl: 'http://test.local/api/v1'));
    fakeAdapter = _FakeAdapter();
    dio.httpClientAdapter = fakeAdapter;
    repo = OrderRepositoryImpl(dio);
  });

  group('updatePaymentMethod (Task 2)', () {
    test('calls PATCH /orders/{id}/payment-method with correct data', () async {
      fakeAdapter.handler = (options) => Response(
            data: {'msg': 'Payment method updated', 'payment_method': 'KNET'},
            statusCode: 200,
            requestOptions: options,
          );

      await repo.updatePaymentMethod(42, 'KNET');

      expect(fakeAdapter.lastRequest?.path,
          contains('/orders/42/payment-method'));
      expect(fakeAdapter.lastRequest?.method, 'PATCH');
      expect(fakeAdapter.lastRequestData, {'payment_method': 'KNET'});
    });

    test('throws on DioException with 401', () async {
      fakeAdapter.handler = (options) => Response(
            statusCode: 401,
            requestOptions: options,
          );

      expect(
        () => repo.updatePaymentMethod(1, 'CASH'),
        throwsA(isA<Exception>().having(
          (e) => e.toString(),
          'message',
          contains('Unauthorized'),
        )),
      );
    });

    test('throws on general exception with wrapped message', () async {
      // Force an error by setting a handler that throws a non-Dio exception
      fakeAdapter.handler = (_) => throw Exception('Network error');

      expect(
        () => repo.updatePaymentMethod(1, 'COD'),
        throwsA(isA<Exception>().having(
          (e) => e.toString(),
          'message',
          contains('Failed to update payment method'),
        )),
      );
    });
  });

  group('returnOrder', () {
    test('calls POST /orders/{id}/return with reason', () async {
      fakeAdapter.handler = (options) => Response(
            data: {'msg': 'Order returned'},
            statusCode: 200,
            requestOptions: options,
          );

      await repo.returnOrder(10, 'Customer refused');

      expect(fakeAdapter.lastRequest?.path,
          contains('/orders/10/return'));
      expect(fakeAdapter.lastRequest?.method, 'POST');
      expect(fakeAdapter.lastRequestData, {'reason': 'Customer refused'});
    });

    test('throws Unauthorized on 401', () async {
      fakeAdapter.handler = (options) => Response(
            statusCode: 401,
            requestOptions: options,
          );

      expect(
        () => repo.returnOrder(5, 'Wrong address'),
        throwsA(isA<Exception>().having(
          (e) => e.toString(),
          'message',
          contains('Unauthorized'),
        )),
      );
    });
  });
}
