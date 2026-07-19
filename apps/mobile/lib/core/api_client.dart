import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// REST client for Engage360 API. Sends JWT + `x-tenant-id` on every request.
class ApiClient {
  static const String _envBase = String.fromEnvironment('API_BASE');
  static const String _envUrl = String.fromEnvironment('API_URL');
  static const String _envTenant = String.fromEnvironment('TENANT');

  static String get base {
    if (_envBase.isNotEmpty) return _envBase;
    if (_envUrl.isNotEmpty) return _envUrl;
    if (kIsWeb) return 'http://localhost:3000/api';
    try {
      return Platform.isAndroid
          ? 'http://10.0.2.2:3000/api'
          : 'http://localhost:3000/api';
    } catch (_) {
      return 'https://engage360-api-qhnr.onrender.com/api';
    }
  }

  static String? _token;
  static String? _tenant;
  static Map<String, dynamic>? user;

  static List<String> get roles =>
      (user?['roles'] as List?)?.map((e) => e.toString()).toList() ?? [];

  static String? get tenant => _tenant;
  static Map<String, dynamic>? get currentUser => user;
  static bool get signedIn => _token != null;

  static Future<void> restore() async {
    final p = await SharedPreferences.getInstance();
    _token = p.getString('token');
    _tenant =
        p.getString('tenant') ?? (_envTenant.isNotEmpty ? _envTenant : null);
    final u = p.getString('user');
    if (u != null) user = jsonDecode(u) as Map<String, dynamic>;
  }

  static Future<void> login(
      String tenant, String email, String password) async {
    _tenant = tenant.trim().isEmpty
        ? (_envTenant.isNotEmpty ? _envTenant : null)
        : tenant.trim();
    final res = await _send('POST', '/auth/login',
        body: {'email': email, 'password': password});
    _token = res['accessToken'] as String;
    user = res['user'] as Map<String, dynamic>;
    final p = await SharedPreferences.getInstance();
    await p.setString('token', _token!);
    await p.setString('user', jsonEncode(user));
    if (_tenant != null) await p.setString('tenant', _tenant!);
  }

  static Future<void> logout() async {
    _token = null;
    user = null;
    final p = await SharedPreferences.getInstance();
    await p.clear();
  }

  static Future<dynamic> get(String path, [Map<String, String>? query]) =>
      _send('GET', path, query: query);
  static Future<dynamic> post(String path, [Map<String, dynamic>? body]) =>
      _send('POST', path, body: body ?? {});
  static Future<dynamic> put(String path, [Map<String, dynamic>? body]) =>
      _send('PUT', path, body: body ?? {});
  static Future<dynamic> patch(String path, [Map<String, dynamic>? body]) =>
      _send('PATCH', path, body: body ?? {});
  static Future<dynamic> delete(String path) => _send('DELETE', path);

  /// Upload a file to POST /files (returns { id, fileName, contentType, sizeBytes }).
  static Future<Map<String, dynamic>> uploadFile(
      List<int> bytes, String fileName) async {
    final uri = Uri.parse('$base/files');
    final req = http.MultipartRequest('POST', uri);
    if (_token != null) req.headers['Authorization'] = 'Bearer $_token';
    if (_tenant != null) req.headers['x-tenant-id'] = _tenant!;
    req.files
        .add(http.MultipartFile.fromBytes('file', bytes, filename: fileName));
    final streamed = await req.send();
    final body = await streamed.stream.bytesToString();
    final data = body.isEmpty ? null : jsonDecode(body);
    if (streamed.statusCode >= 400) {
      final msg =
          data is Map ? (data['message'] ?? 'Upload failed') : 'Upload failed';
      throw ApiError(
          msg is List ? msg.join('; ') : msg.toString(), streamed.statusCode);
    }
    return data as Map<String, dynamic>;
  }

  static Future<dynamic> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
  }) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token',
      if (_tenant != null) 'x-tenant-id': _tenant!,
    };
    var uri = Uri.parse('$base$path');
    if (query != null && query.isNotEmpty) {
      uri = uri.replace(queryParameters: query);
    }
    late http.Response r;
    switch (method) {
      case 'GET':
        r = await http.get(uri, headers: headers);
      case 'PUT':
        r = await http.put(uri, headers: headers, body: jsonEncode(body));
      case 'PATCH':
        r = await http.patch(uri, headers: headers, body: jsonEncode(body));
      case 'DELETE':
        r = await http.delete(uri, headers: headers);
      default:
        r = await http.post(uri, headers: headers, body: jsonEncode(body));
    }
    final data = r.body.isEmpty ? null : jsonDecode(r.body);
    if (r.statusCode >= 400) {
      final msg = data is Map
          ? (data['message'] ?? 'Request failed')
          : 'Request failed';
      throw ApiError(
          msg is List ? msg.join('; ') : msg.toString(), r.statusCode);
    }
    return data;
  }
}

class ApiError implements Exception {
  final String message;
  final int status;
  ApiError(this.message, this.status);
  @override
  String toString() => message;
}
