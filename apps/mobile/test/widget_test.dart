import 'package:flutter_test/flutter_test.dart';
import 'package:engage360_mobile/core/theme_controller.dart';
import 'package:engage360_mobile/main.dart';
import 'package:engage360_mobile/core/rbac.dart';

void main() {
  testWidgets('App loads login screen when signed out', (tester) async {
    await tester.pumpWidget(Engage360App(themeController: ThemeController()));
    expect(find.text('SumayaEngage360'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  test('platform admin is restricted to explicit platform routes', () {
    const roles = ['PLATFORM_ADMIN'];
    expect(canAccess(roles, '/tenants'), isTrue);
    expect(canAccess(roles, '/requirements'), isTrue);
    expect(canAccess(roles, '/employees'), isFalse);
    expect(canAccess(roles, '/payroll'), isFalse);
    expect(navForRoles(roles).map((route) => route.path),
        containsAll(['/tenants', '/requirements']));
  });

  test('employee and manager module access follows the role matrix', () {
    expect(canAccess(['EMPLOYEE'], '/payroll'), isTrue);
    expect(canAccess(['EMPLOYEE'], '/users'), isFalse);
    expect(canAccess(['MANAGER'], '/projects'), isTrue);
    expect(canAccess(['MANAGER'], '/settings'), isFalse);
  });
}
