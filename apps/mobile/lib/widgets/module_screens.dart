import 'package:flutter/material.dart';
import '../screens/approvals/approvals_screen.dart';
import '../screens/ats/applications_screen.dart';
import '../screens/ats/jobs_screen.dart';
import '../screens/ats/offers_screen.dart';
import '../screens/attendance/attendance_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/modules/admin_screens.dart';
import '../screens/modules/composite_screens.dart';
import '../screens/modules/global_mobility_screen.dart';
import '../screens/modules/operations_screens.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/timesheets/timesheets_screen.dart';
import '../screens/trainings/trainings_screen.dart';

/// Maps RBAC module paths to screens.
Widget? moduleScreenFor(String path) {
  switch (path) {
    case '/dashboard':
      return const DashboardScreen();
    case '/leave':
      return const AttendanceScreen();
    case '/timesheets':
      return const TimesheetsScreen();
    case '/trainings':
      return const TrainingsScreen();
    case '/profile':
      return const ProfileScreen();
    case '/approvals':
      return const ApprovalsScreen();
    case '/recognition':
      return const RecognitionScreen();
    case '/surveys':
      return const SurveysScreen();
    case '/expenses':
      return const ExpensesScreen();
    case '/goals':
      return const GoalsScreen();
    case '/appraisals':
      return const AppraisalsScreen();
    case '/payroll':
      return const PayrollScreen();
    case '/benefits':
      return const BenefitsScreen();
    case '/exit':
      return const ExitScreen();
    case '/projects':
      return const ProjectsScreen();
    case '/employees':
      return const EmployeesScreen();
    case '/reports':
      return const ReportsScreen();
    case '/settings':
      return const SettingsScreen();
    case '/catalogues':
      return const CataloguesScreen();
    case '/requirements':
      return const RequirementsScreen();
    case '/audit':
      return const AuditScreen();
    case '/execution':
      return const ExecutionScreen();
    case '/manpower':
      return const ManpowerScreen();
    case '/assets':
      return const AssetsScreen();
    case '/org':
      return const OrgScreen();
    case '/org-masters':
      return const OrgMastersScreen();
    case '/masters':
      return const MastersScreen();
    case '/notifications':
      return const NotificationsScreen();
    case '/workflows':
      return const WorkflowsScreen();
    case '/preboarding-admin':
      return const PreboardingScreen();
    case '/privacy':
      return const PrivacyScreen();
    case '/compliance':
      return const ComplianceScreen();
    case '/users':
      return const UsersScreen();
    case '/clients':
      return const ClientsScreen();
    case '/global-mobility':
      return const GlobalMobilityScreen();
    case '/jobs':
      return const JobsScreen();
    case '/candidates':
      return const CandidatesScreen();
    case '/applications':
      return const ApplicationsScreen();
    case '/interviews':
      return const InterviewsScreen();
    case '/offers':
      return const OffersScreen();
    case '/matching':
      return const MatchingScreen();
    case '/onboarding':
      return const OnboardingScreen();
    case '/bgc':
      return const BgcAdminScreen();
    case '/bgc-vendor':
      return const BgcVendorScreen();
    case '/tenants':
      return const TenantsScreen();
    default:
      return null;
  }
}
