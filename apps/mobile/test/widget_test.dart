import 'package:flutter_test/flutter_test.dart';
import 'package:engage360_mobile/core/theme_controller.dart';
import 'package:engage360_mobile/main.dart';

void main() {
  testWidgets('App loads login screen when signed out', (tester) async {
    await tester.pumpWidget(Engage360App(themeController: ThemeController()));
    expect(find.text('SumayaEngage360'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
