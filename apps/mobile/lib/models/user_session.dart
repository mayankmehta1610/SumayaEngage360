/// Lightweight session DTO mirroring `/auth/login` user payload.
class UserSession {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final List<String> roles;

  const UserSession({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
    required this.roles,
  });

  factory UserSession.fromJson(Map<String, dynamic> json) => UserSession(
        id: json['id']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        firstName: json['firstName']?.toString(),
        lastName: json['lastName']?.toString(),
        roles: (json['roles'] as List?)?.map((e) => e.toString()).toList() ?? [],
      );

  String get displayName => '${firstName ?? ''} ${lastName ?? ''}'.trim();
}
