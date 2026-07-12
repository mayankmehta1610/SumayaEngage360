import 'package:flutter/material.dart';
import '../../core/auth_service.dart';
import '../../widgets/module_drawer.dart';
import '../approvals/approvals_screen.dart';
import '../attendance/attendance_screen.dart';
import '../auth/login_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../modules/admin_screens.dart';
import '../modules/composite_screens.dart';
import '../profile/profile_screen.dart';
import '../timesheets/timesheets_screen.dart';
import '../trainings/trainings_screen.dart';
import 'modules_grid_screen.dart';

/// Role-aware shell with drawer + bottom navigation.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int index = 0;

  List<({String label, IconData icon, Widget screen})> get tabs {
    if (AuthService.isPlatformAdmin) {
      return [
        (label: 'Tenants', icon: Icons.business, screen: const _TenantsTab()),
        (label: 'Modules', icon: Icons.apps, screen: const ModulesGridScreen()),
      ];
    }
    if (AuthService.isVendor && !AuthService.isOps && !AuthService.isEmployee) {
      return [
        (label: 'Cases', icon: Icons.biotech_outlined, screen: const BgcVendorScreen()),
        (label: 'Profile', icon: Icons.person_outline, screen: const ProfileScreen()),
      ];
    }
    if (AuthService.hasRole(['INTERVIEWER']) && !AuthService.isHr && !AuthService.isManager && !AuthService.isEmployee) {
      return [
        (label: 'Pipeline', icon: Icons.inbox_outlined, screen: const InterviewsScreen()),
        (label: 'Modules', icon: Icons.apps, screen: const ModulesGridScreen()),
      ];
    }
    if (AuthService.isHr || AuthService.isManager) {
      return [
        (label: 'Home', icon: Icons.dashboard_outlined, screen: const DashboardScreen()),
        (label: 'Inbox', icon: Icons.rule_folder_outlined, screen: const ApprovalsScreen()),
        (label: 'Attendance', icon: Icons.fingerprint, screen: const AttendanceScreen()),
        (label: 'Timesheets', icon: Icons.schedule, screen: const TimesheetsScreen()),
        (label: 'Modules', icon: Icons.apps, screen: const ModulesGridScreen()),
      ];
    }
    return [
      (label: 'Home', icon: Icons.dashboard_outlined, screen: const DashboardScreen()),
      (label: 'Attendance', icon: Icons.fingerprint, screen: const AttendanceScreen()),
      (label: 'Timesheets', icon: Icons.schedule, screen: const TimesheetsScreen()),
      (label: 'Learn', icon: Icons.school_outlined, screen: const TrainingsScreen()),
      (label: 'Modules', icon: Icons.apps, screen: const ModulesGridScreen()),
    ];
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = tabs;
    final safeIndex = index < t.length ? index : 0;
    return Scaffold(
      appBar: AppBar(
        title: Text(t[safeIndex].label == 'Home' ? 'SumayaEngage360' : t[safeIndex].label),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => openModule(context, '/profile'),
          ),
        ],
      ),
      drawer: ModuleDrawer(
        onNavigate: (path) => openModule(context, path),
        onLogout: _logout,
      ),
      body: t[safeIndex].screen,
      bottomNavigationBar: t.length > 1
          ? NavigationBar(
              selectedIndex: safeIndex,
              onDestinationSelected: (i) => setState(() => index = i),
              destinations: [for (final tab in t) NavigationDestination(icon: Icon(tab.icon), label: tab.label)],
            )
          : null,
    );
  }
}

class _TenantsTab extends StatelessWidget {
  const _TenantsTab();
  @override
  Widget build(BuildContext context) => const TenantsScreen();
}
