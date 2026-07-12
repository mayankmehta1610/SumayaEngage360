import 'api_client.dart';

/// Session helpers built on [ApiClient].
class AuthService {
  static List<String> get roles => ApiClient.roles;
  static Map<String, dynamic>? get user => ApiClient.currentUser;
  static bool get signedIn => ApiClient.signedIn;

  static bool hasRole(List<String> any) => roles.any(any.contains);
  static bool get isPlatformAdmin => hasRole(['PLATFORM_ADMIN']);
  static bool get isTenantAdmin => hasRole(['TENANT_ADMIN']);
  static bool get isHr => hasRole(['TENANT_ADMIN', 'HR']);
  static bool get isManager => hasRole(['MANAGER', 'DEPARTMENT_HEAD']);
  static bool get isEmployee => hasRole(['EMPLOYEE']);
  static bool get isVendor => hasRole(['BGC_VENDOR']);
  static bool get isOps =>
      hasRole(['TENANT_ADMIN', 'HR', 'MANAGER', 'DEPARTMENT_HEAD']);

  static String displayName() {
    final u = user;
    if (u == null) return '';
    return '${u['firstName'] ?? ''} ${u['lastName'] ?? ''}'.trim();
  }

  static Future<void> login(String tenant, String email, String password) =>
      ApiClient.login(tenant, email, password);

  static Future<void> logout() => ApiClient.logout();
  static Future<void> restore() => ApiClient.restore();
}
