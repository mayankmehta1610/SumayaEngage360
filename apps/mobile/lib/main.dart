import 'package:flutter/material.dart';
import 'core/auth_service.dart';
import 'core/theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/shell/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.restore();
  runApp(const Engage360App());
}

class Engage360App extends StatelessWidget {
  const Engage360App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SumayaEngage360',
      debugShowCheckedModeBanner: false,
      theme: E360Theme.light(),
      darkTheme: E360Theme.dark(),
      themeMode: ThemeMode.system,
      home: AuthService.signedIn ? const HomeScreen() : const LoginScreen(),
    );
  }
}
