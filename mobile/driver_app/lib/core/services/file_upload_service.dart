import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';
import 'package:logger/logger.dart';
import 'package:path_provider/path_provider.dart';

class FileUploadService {
  final Dio _dio;
  final Logger _logger = Logger();
  final ImagePicker _picker = ImagePicker();

  FileUploadService(this._dio);

  Future<File?> pickImage({ImageSource source = ImageSource.camera}) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (image == null) return null;

      return File(image.path);
    } catch (e) {
      _logger.e('Failed to pick image: $e');
      return null;
    }
  }

  Future<File?> compressImage(File file, {int quality = 70}) async {
    try {
      final dir = await getTemporaryDirectory();
      final targetPath =
          '${dir.path}/compressed_${DateTime.now().millisecondsSinceEpoch}.jpg';

      final result = await FlutterImageCompress.compressAndGetFile(
        file.path,
        targetPath,
        quality: quality,
        format: CompressFormat.jpeg,
      );

      if (result == null) return file;

      final originalSize = file.lengthSync();
      final compressedSize = await result.length();
      _logger.i('Image compressed: $originalSize -> $compressedSize bytes');
      return File(result.path);
    } catch (e) {
      _logger.e('Failed to compress image: $e');
      return file;
    }
  }

  Future<String?> uploadProofOfDelivery(
    int orderId,
    File photo, {
    String? signature,
  }) async {
    try {
      final compressedPhoto = await compressImage(photo);

      final formData = FormData.fromMap({
        'order_id': orderId,
        'photo': await MultipartFile.fromFile(
          compressedPhoto?.path ?? photo.path,
          filename: 'proof_$orderId.jpg',
        ),
        if (signature != null) 'signature': signature,
      });

      final response = await _dio.post(
        '/orders/$orderId/proof-of-delivery',
        data: formData,
      );

      _logger.i('Proof of delivery uploaded for order $orderId');
      return response.data['url'];
    } catch (e) {
      _logger.e('Failed to upload proof: $e');
      return null;
    }
  }

  Future<String?> saveImageLocally(File file, String filename) async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final path = '${dir.path}/proofs/$filename';

      final proofDir = Directory('${dir.path}/proofs');
      if (!await proofDir.exists()) {
        await proofDir.create(recursive: true);
      }

      await file.copy(path);
      return path;
    } catch (e) {
      _logger.e('Failed to save image locally: $e');
      return null;
    }
  }
}
