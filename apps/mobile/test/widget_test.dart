import 'package:flutter_test/flutter_test.dart';
import 'package:engage360_mobile/main.dart';

void main() {
  testWidgets('App loads login screen when signed out', (tester) async {
    await tester.pumpWidget(const Engage360App());
    expect(find.text('SumayaEngage360'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
