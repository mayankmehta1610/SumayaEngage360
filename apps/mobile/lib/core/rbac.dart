import 'package:flutter/material.dart';

/// RBAC — mirrors apps/web/src/app/core/rbac.ts
typedef AppRole = String;

class NavGroup {
  final String key;
  final String label;
  final int order;
  const NavGroup(this.key, this.label, this.order);
}

const navGroups = <NavGroup>[
  NavGroup('platform', 'Platform', 1),
  NavGroup('ats', 'Recruitment (ATS)', 2),
  NavGroup('workforce', 'Workforce & HR', 3),
  NavGroup('operations', 'Operations', 4),
  NavGroup('compensation', 'Compensation', 5),
  NavGroup('performance', 'Performance', 6),
  NavGroup('workflow', 'Workflow', 7),
  NavGroup('admin', 'Administration', 8),
  NavGroup('personal', 'My workspace', 9),
];

class RouteAccess {
  final String path;
  final String label;
  final List<AppRole> roles;
  final IconData icon;
  final String group;
  const RouteAccess({
    required this.path,
    required this.label,
    required this.roles,
    required this.icon,
    required this.group,
  });
}

const routeAccess = <RouteAccess>[
  RouteAccess(
      path: '/dashboard',
      label: 'Dashboard',
      roles: [
        'TENANT_ADMIN',
        'HR',
        'MANAGER',
        'EMPLOYEE',
        'INTERVIEWER',
        'DEPARTMENT_HEAD'
      ],
      icon: Icons.dashboard_outlined,
      group: 'platform'),
  RouteAccess(
      path: '/reports',
      label: 'Reports',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER'],
      icon: Icons.bar_chart,
      group: 'platform'),
  RouteAccess(
      path: '/settings',
      label: 'Settings',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.settings,
      group: 'platform'),
  RouteAccess(
      path: '/catalogues',
      label: 'Catalogues',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.menu_book_outlined,
      group: 'platform'),
  RouteAccess(
      path: '/requirements',
      label: 'Requirements',
      roles: ['TENANT_ADMIN', 'HR', 'PLATFORM_ADMIN'],
      icon: Icons.checklist,
      group: 'platform'),
  RouteAccess(
      path: '/audit',
      label: 'Audit trail',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.verified_user_outlined,
      group: 'platform'),
  RouteAccess(
      path: '/execution',
      label: 'Execution',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.task_alt,
      group: 'platform'),
  RouteAccess(
      path: '/tenants',
      label: 'Tenants',
      roles: ['PLATFORM_ADMIN'],
      icon: Icons.business,
      group: 'platform'),
  RouteAccess(
      path: '/users',
      label: 'User accounts',
      roles: ['TENANT_ADMIN'],
      icon: Icons.people_outline,
      group: 'platform'),
  RouteAccess(
      path: '/clients',
      label: 'Hiring clients',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.work_outline,
      group: 'ats'),
  RouteAccess(
      path: '/global-mobility',
      label: 'Global mobility',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER'],
      icon: Icons.public,
      group: 'ats'),
  RouteAccess(
      path: '/jobs',
      label: 'Jobs',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.description_outlined,
      group: 'ats'),
  RouteAccess(
      path: '/candidates',
      label: 'Talent pool',
      roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'],
      icon: Icons.person_search,
      group: 'ats'),
  RouteAccess(
      path: '/applications',
      label: 'Applications',
      roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'],
      icon: Icons.inbox_outlined,
      group: 'ats'),
  RouteAccess(
      path: '/interviews',
      label: 'Interviews',
      roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'],
      icon: Icons.event,
      group: 'ats'),
  RouteAccess(
      path: '/offers',
      label: 'Offers',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.local_offer_outlined,
      group: 'ats'),
  RouteAccess(
      path: '/matching',
      label: 'Matching',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.hub_outlined,
      group: 'ats'),
  RouteAccess(
      path: '/employees',
      label: 'Employees',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER'],
      icon: Icons.groups_outlined,
      group: 'workforce'),
  RouteAccess(
      path: '/onboarding',
      label: 'Onboarding',
      roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'],
      icon: Icons.person_add_alt_1,
      group: 'workforce'),
  RouteAccess(
      path: '/preboarding-admin',
      label: 'Preboarding',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.assignment_turned_in_outlined,
      group: 'workforce'),
  RouteAccess(
      path: '/org',
      label: 'Departments',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER'],
      icon: Icons.account_tree_outlined,
      group: 'workforce'),
  RouteAccess(
      path: '/exit',
      label: 'Exit management',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.logout,
      group: 'workforce'),
  RouteAccess(
      path: '/bgc',
      label: 'Background checks',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.fact_check_outlined,
      group: 'workforce'),
  RouteAccess(
      path: '/projects',
      label: 'Projects',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER'],
      icon: Icons.folder_open_outlined,
      group: 'operations'),
  RouteAccess(
      path: '/manpower',
      label: 'Manpower',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER'],
      icon: Icons.people_alt_outlined,
      group: 'operations'),
  RouteAccess(
      path: '/assets',
      label: 'Assets',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.laptop_mac,
      group: 'operations'),
  RouteAccess(
      path: '/leave',
      label: 'Attendance & leave',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.calendar_month_outlined,
      group: 'operations'),
  RouteAccess(
      path: '/timesheets',
      label: 'Timesheets',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.schedule,
      group: 'operations'),
  RouteAccess(
      path: '/payroll',
      label: 'Payroll',
      roles: ['TENANT_ADMIN', 'HR', 'EMPLOYEE'],
      icon: Icons.payments_outlined,
      group: 'compensation'),
  RouteAccess(
      path: '/benefits',
      label: 'Benefits',
      roles: ['TENANT_ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'],
      icon: Icons.favorite_border,
      group: 'compensation'),
  RouteAccess(
      path: '/expenses',
      label: 'Expenses',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.receipt_long,
      group: 'compensation'),
  RouteAccess(
      path: '/goals',
      label: 'Goals',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.track_changes,
      group: 'performance'),
  RouteAccess(
      path: '/appraisals',
      label: 'Appraisals',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.star_outline,
      group: 'performance'),
  RouteAccess(
      path: '/trainings',
      label: 'Trainings',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.school_outlined,
      group: 'performance'),
  RouteAccess(
      path: '/recognition',
      label: 'Recognition',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.emoji_events_outlined,
      group: 'performance'),
  RouteAccess(
      path: '/surveys',
      label: 'Surveys & eNPS',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.poll_outlined,
      group: 'performance'),
  RouteAccess(
      path: '/approvals',
      label: 'Approvals inbox',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'DEPARTMENT_HEAD'],
      icon: Icons.rule_folder_outlined,
      group: 'workflow'),
  RouteAccess(
      path: '/workflows',
      label: 'Workflows',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.account_tree,
      group: 'workflow'),
  RouteAccess(
      path: '/notifications',
      label: 'Notifications',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.notifications_outlined,
      group: 'workflow'),
  RouteAccess(
      path: '/org-masters',
      label: 'Org masters',
      roles: ['TENANT_ADMIN', 'HR'],
      icon: Icons.apartment,
      group: 'admin'),
  RouteAccess(
      path: '/masters',
      label: 'Masters',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER'],
      icon: Icons.storage_outlined,
      group: 'admin'),
  RouteAccess(
      path: '/privacy',
      label: 'Privacy & consent',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.lock_outline,
      group: 'admin'),
  RouteAccess(
      path: '/compliance',
      label: 'Compliance',
      roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      icon: Icons.shield_outlined,
      group: 'admin'),
  RouteAccess(
      path: '/bgc-vendor',
      label: 'BGV cases',
      roles: ['BGC_VENDOR'],
      icon: Icons.biotech_outlined,
      group: 'admin'),
  RouteAccess(
      path: '/profile',
      label: 'My profile',
      roles: [
        'TENANT_ADMIN',
        'HR',
        'MANAGER',
        'EMPLOYEE',
        'INTERVIEWER',
        'BGC_VENDOR',
        'DEPARTMENT_HEAD'
      ],
      icon: Icons.person_outline,
      group: 'personal'),
];

RouteAccess? _routeFor(String path) {
  final normalized = path.startsWith('/') ? path : '/$path';
  for (final r in routeAccess) {
    if (r.path == normalized || normalized.startsWith('${r.path}/')) return r;
  }
  return null;
}

bool canAccess(List<String> roles, String path) {
  final entry = _routeFor(path);
  if (entry == null) return true;
  return entry.roles.any(roles.contains);
}

List<RouteAccess> navForRoles(List<String> roles) {
  return routeAccess.where((r) => canAccess(roles, r.path)).toList();
}

String homePathForRoles(List<String> roles) {
  if (roles.contains('PLATFORM_ADMIN')) return '/tenants';
  if (roles.contains('BGC_VENDOR') &&
      !roles.any(
          (r) => ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'].contains(r))) {
    return '/bgc-vendor';
  }
  return '/dashboard';
}

Map<String, List<RouteAccess>> groupedNav(List<String> roles) {
  final items = navForRoles(roles);
  final map = <String, List<RouteAccess>>{};
  for (final g in navGroups) {
    final groupItems = items.where((i) => i.group == g.key).toList();
    if (groupItems.isNotEmpty) map[g.label] = groupItems;
  }
  return map;
}
