import 'package:file_picker/file_picker.dart';
import '../core/api_client.dart';

/// Pick a file and upload to POST /files. Returns { id, fileName, ... }.
Future<Map<String, dynamic>?> pickAndUpload({List<String>? allowedExtensions}) async {
  final result = await FilePicker.platform.pickFiles(
    type: allowedExtensions != null ? FileType.custom : FileType.any,
    allowedExtensions: allowedExtensions,
    withData: true,
  );
  if (result == null || result.files.isEmpty) return null;
  final f = result.files.first;
  final bytes = f.bytes;
  if (bytes == null) return null;
  return ApiClient.uploadFile(bytes, f.name);
}
