import 'package:flutter/material.dart';
import 'core/auth_service.dart';
import 'core/theme.dart';
import 'core/theme_controller.dart';
import 'screens/auth/login_screen.dart';
import 'screens/shell/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.restore();
  final themeController = ThemeController();
  await themeController.load();
  runApp(Engage360App(themeController: themeController));
}

class Engage360App extends StatelessWidget {
  const Engage360App({super.key, required this.themeController});

  final ThemeController themeController;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: themeController,
      builder: (context, _) {
        return MaterialApp(
          title: 'SumayaEngage360',
          debugShowCheckedModeBanner: false,
          theme: E360Theme.light(),
          darkTheme: E360Theme.dark(),
          themeMode: themeController.mode,
          home: AuthService.signedIn ? const HomeScreen() : const LoginScreen(),
        );
      },
    );
  }
}
