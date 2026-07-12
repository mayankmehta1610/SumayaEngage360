import 'api_client.dart';

bool hasRole(String role) => ApiClient.roles.contains(role);

bool hasAnyRole(List<String> allowed) =>
    ApiClient.roles.any(allowed.contains);

bool get isPlatformAdmin => hasRole('PLATFORM_ADMIN');
bool get isTenantAdmin => hasRole('TENANT_ADMIN');
bool get isHrOrAdmin => hasAnyRole(['TENANT_ADMIN', 'HR']);
bool get isManager => hasRole('MANAGER');
bool get canManageHr => isHrOrAdmin || isPlatformAdmin;
bool get canAssignGoals => hasAnyRole(['TENANT_ADMIN', 'HR', 'MANAGER']);
