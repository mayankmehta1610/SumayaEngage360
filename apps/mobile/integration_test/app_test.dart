import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:engage360_mobile/core/theme_controller.dart';
import 'package:engage360_mobile/main.dart' as app;

/// Integration tests against live API.
/// Run: flutter test integration_test/app_test.dart -d chrome
/// Env: API_URL, TENANT_ID, TEST_EMAIL, TEST_PASSWORD
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const tenant = String.fromEnvironment('TENANT_ID', defaultValue: 'sumaya');
  const email = String.fromEnvironment('TEST_EMAIL', defaultValue: 'owner@sumaya.com');
  const password = String.fromEnvironment('TEST_PASSWORD', defaultValue: 'Owner@12345');

  testWidgets('login screen loads', (tester) async {
    await tester.pumpWidget(app.Engage360App(themeController: ThemeController()));
    await tester.pumpAndSettle();
    expect(find.text('SumayaEngage360'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('login and navigate modules', (tester) async {
    await tester.pumpWidget(app.Engage360App(themeController: ThemeController()));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), tenant);
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), password);
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle(const Duration(seconds: 8));

    expect(find.text('Dashboard'), findsWidgets);

    // Navigate to leave module
    if (find.text('Leave').evaluate().isNotEmpty) {
      await tester.tap(find.text('Leave').first);
      await tester.pumpAndSettle(const Duration(seconds: 3));
    }

    // Navigate to timesheets
    if (find.text('Timesheets').evaluate().isNotEmpty) {
      await tester.tap(find.text('Timesheets').first);
      await tester.pumpAndSettle(const Duration(seconds: 3));
    }

    // Navigate to expenses if visible
    if (find.text('Expenses').evaluate().isNotEmpty) {
      await tester.tap(find.text('Expenses').first);
      await tester.pumpAndSettle(const Duration(seconds: 3));
    }
  });
}
