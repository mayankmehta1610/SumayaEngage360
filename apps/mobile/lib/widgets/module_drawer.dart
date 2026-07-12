import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/auth_service.dart';
import '../core/rbac.dart';
import '../core/theme.dart';
import '../core/theme_controller.dart';
import 'module_screens.dart';

class ModuleDrawer extends StatelessWidget {
  final void Function(String path) onNavigate;
  final VoidCallback onLogout;

  const ModuleDrawer({super.key, required this.onNavigate, required this.onLogout});

  String _initials() {
    final name = AuthService.displayName();
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  @override
  Widget build(BuildContext context) {
    final groups = groupedNav(AuthService.roles);
    final tenant = ApiClient.tenant ?? '';
    return Drawer(
      backgroundColor: E360Theme.navy,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(color: E360Theme.navy),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [E360Theme.primary, E360Theme.accent],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.dashboard_outlined, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text('Engage360',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
                      ),
                    ],
                  ),
                  if (tenant.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: E360Theme.accent.withValues(alpha: .2),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: E360Theme.accent.withValues(alpha: .35)),
                      ),
                      child: Text(tenant.toUpperCase(),
                          style: const TextStyle(
                              color: Color(0xFFA5B4FC), fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                    ),
                  ],
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: E360Theme.primary,
                        child: Text(_initials(),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(AuthService.displayName(),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
                                overflow: TextOverflow.ellipsis),
                            Text(AuthService.roles.join(' · '),
                                style: const TextStyle(color: Colors.white70, fontSize: 10),
                                overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                children: [
                  for (final entry in groups.entries) ...[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: Text(entry.key.toUpperCase(),
                          style: const TextStyle(
                              fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: Colors.white54)),
                    ),
                    for (final item in entry.value)
                      ListTile(
                        leading: Icon(item.icon, color: Colors.white70, size: 22),
                        title: Text(item.label, style: const TextStyle(color: Colors.white, fontSize: 14)),
                        dense: true,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        onTap: () {
                          Navigator.pop(context);
                          onNavigate(item.path);
                        },
                      ),
                  ],
                ],
              ),
            ),
            const Divider(color: Colors.white24),
            ListTile(
              leading: Icon(
                Theme.of(context).brightness == Brightness.dark
                    ? Icons.light_mode_outlined
                    : Icons.dark_mode_outlined,
                color: Colors.white70,
              ),
              title: Text(
                Theme.of(context).brightness == Brightness.dark ? 'Light mode' : 'Dark mode',
                style: const TextStyle(color: Colors.white),
              ),
              onTap: () async {
                Navigator.pop(context);
                await ThemeController.instance?.toggle(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.white70),
              title: const Text('Sign out', style: TextStyle(color: Colors.white)),
              onTap: onLogout,
            ),
          ],
        ),
      ),
    );
  }
}

/// Opens the screen for a module path.
void openModule(BuildContext context, String path) {
  if (!canAccess(AuthService.roles, path)) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('You do not have access to this module.')),
    );
    return;
  }
  final screen = moduleScreenFor(path);
  if (screen == null) return;
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
}
