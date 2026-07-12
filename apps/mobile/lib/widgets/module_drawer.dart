import 'package:flutter/material.dart';
import '../core/auth_service.dart';
import '../core/rbac.dart';
import '../core/theme.dart';
import 'module_screens.dart';

class ModuleDrawer extends StatelessWidget {
  final void Function(String path) onNavigate;
  final VoidCallback onLogout;

  const ModuleDrawer({super.key, required this.onNavigate, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    final groups = groupedNav(AuthService.roles);
    return Drawer(
      backgroundColor: E360Theme.navy,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(color: E360Theme.navy),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: E360Theme.brand, borderRadius: BorderRadius.circular(12)),
                    child: const Text('S3', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
                  ),
                  const SizedBox(height: 12),
                  Text(AuthService.displayName(),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                  Text(AuthService.roles.join(' · '),
                      style: const TextStyle(color: Colors.white70, fontSize: 11)),
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
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: Colors.white54)),
                    ),
                    for (final item in entry.value)
                      ListTile(
                        leading: Icon(item.icon, color: Colors.white70, size: 22),
                        title: Text(item.label, style: const TextStyle(color: Colors.white, fontSize: 14)),
                        dense: true,
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
