import 'package:flutter/material.dart';
import '../../core/auth_service.dart';
import '../../core/rbac.dart';
import '../../widgets/module_drawer.dart';

/// Quick-launch grid of all modules the signed-in user can access.
class ModulesGridScreen extends StatelessWidget {
  const ModulesGridScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final groups = groupedNav(AuthService.roles);
    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 12),
      children: [
        for (final entry in groups.entries) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 6),
            child: Text(entry.key.toUpperCase(),
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1, color: Theme.of(context).hintColor)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final item in entry.value)
                  ActionChip(
                    avatar: Icon(item.icon, size: 18),
                    label: Text(item.label, style: const TextStyle(fontSize: 12)),
                    onPressed: () => openModule(context, item.path),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
