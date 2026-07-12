import 'package:flutter/material.dart';

/// Engage360 design system — navy app bars, brand accent, Material 3 cards.
class E360Theme {
  static const Color brand = Color(0xFF2F6BFF);
  static const Color navy = Color(0xFF0E1930);
  static const Color success = Color(0xFF137333);
  static const Color warning = Color(0xFFB25E09);
  static const Color danger = Color(0xFFB42318);

  static ThemeData light() => _base(Brightness.light);
  static ThemeData dark() => _base(Brightness.dark);

  static ThemeData _base(Brightness b) {
    final scheme = ColorScheme.fromSeed(seedColor: brand, brightness: b);
    final isDark = b == Brightness.dark;
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: isDark ? const Color(0xFF0B1220) : const Color(0xFFF4F6FA),
      drawerTheme: DrawerThemeData(
        backgroundColor: isDark ? const Color(0xFF0E1930) : navy,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? const Color(0xFF101B33) : navy,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: isDark ? const Color(0xFF141F38) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: isDark ? const Color(0xFF243354) : const Color(0xFFE3E8F0)),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF1A2745) : Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 68,
        indicatorColor: brand.withValues(alpha: .18),
        labelTextStyle: WidgetStatePropertyAll(
          TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isDark ? Colors.white70 : navy),
        ),
      ),
      listTileTheme: const ListTileThemeData(iconColor: Colors.white70),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      dividerTheme: DividerThemeData(color: isDark ? const Color(0xFF243354) : const Color(0xFFEEF1F6)),
    );
  }
}
